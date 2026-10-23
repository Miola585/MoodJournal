-- Journal security upgrade. Apply only after backing up the database.
-- No journal rows are deleted by this migration.
begin;

create table if not exists public.journal_sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0)
);
alter table public.journal_sync_state enable row level security;
revoke all on public.journal_sync_state from public, anon, authenticated;
grant select on public.journal_sync_state to authenticated;
drop policy if exists "Owners read journal revisions" on public.journal_sync_state;
create policy "Owners read journal revisions" on public.journal_sync_state
for select to authenticated using (user_id = (select auth.uid()));

-- All client mutations must pass the revision check, including old clients.
revoke all on public.journal_entries from public, anon, authenticated;
grant select on public.journal_entries to authenticated;
drop function if exists public.replace_journal_entries(jsonb, boolean);

create or replace function public.get_journal_snapshot()
returns jsonb language sql stable security invoker set search_path = ''
as $$
  select jsonb_build_object(
    'revision', coalesce((select revision from public.journal_sync_state where user_id = auth.uid()), 0)::text,
    'rows', coalesce((select jsonb_agg(to_jsonb(j)) from public.journal_entries j where user_id = auth.uid()), '[]'::jsonb)
  ) where auth.uid() is not null;
$$;

-- Private implementation: callers cannot execute it directly.
create or replace function public.apply_journal_mutation(
  changed_rows jsonb, deleted_ids text[], expected_revision bigint,
  replace_all boolean, dry_run boolean
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  owner uuid := auth.uid();
  current_revision bigint;
  result_revision bigint;
  config_id text;
  item jsonb;
begin
  if owner is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  config_id := 'journal-encryption-config:' || owner::text;
  if changed_rows is null or jsonb_typeof(changed_rows) is distinct from 'array'
     or deleted_ids is null or expected_revision is null or expected_revision < 0
     or replace_all is null or dry_run is null then
    raise exception 'Invalid journal mutation input.' using errcode = '22023';
  end if;
  if replace_all and not exists (
    select 1 from jsonb_array_elements(changed_rows) r where r->>'id' <> config_id
  ) then raise exception 'An empty backup cannot replace a journal.' using errcode = '22023'; end if;
  for item in select value from jsonb_array_elements(changed_rows) loop
    if jsonb_typeof(item) is distinct from 'object' or item->>'user_id' is null
       or (item->>'user_id')::uuid <> owner
       or item->>'id' is null or char_length(item->>'id') not between 1 and 128
       or (item->>'id' like 'journal-encryption-config:%' and item->>'id' <> config_id) then
      raise exception 'Invalid journal row or owner.' using errcode = '22023';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(changed_rows) r group by r->>'id' having count(*) > 1)
     or exists (select 1 from unnest(deleted_ids) id where id is null or id = config_id)
     or exists (select 1 from unnest(deleted_ids) id group by id having count(*) > 1)
     or exists (select 1 from jsonb_array_elements(changed_rows) r where r->>'id' = any(deleted_ids)) then
    raise exception 'Duplicate, overlapping, or protected journal IDs.' using errcode = '22023';
  end if;
  -- The subtransaction exercises exactly the same conversion, constraints and
  -- writes in preview mode, then rolls every change (including revision) back.
  begin
    insert into public.journal_sync_state(user_id) values (owner) on conflict do nothing;
    select revision into current_revision from public.journal_sync_state where user_id = owner for update;
    if current_revision <> expected_revision then
      raise exception 'The journal changed. Review the latest version.' using errcode = 'MJ409';
    end if;
    if exists (select 1 from public.journal_entries j where j.user_id <> owner and
      (j.id in (select r->>'id' from jsonb_array_elements(changed_rows) r) or j.id = any(deleted_ids))) then
      raise exception 'A journal ID is unavailable.' using errcode = '42501';
    end if;
    if replace_all and (
      not exists (select 1 from jsonb_array_elements(changed_rows) r where r->>'id' = config_id)
      or exists (
        select 1 from public.journal_entries j
        where j.id = config_id and j.note is distinct from
          (select r->>'note' from jsonb_array_elements(changed_rows) r where r->>'id' = config_id)
      )
    ) then raise exception 'Replacement must preserve the journal encryption settings.' using errcode = '22023'; end if;
    if replace_all then
      delete from public.journal_entries where user_id = owner;
    else
      delete from public.journal_entries where user_id = owner and id = any(deleted_ids);
    end if;
    insert into public.journal_entries (
      id, user_id, entry_type, created, date_key, mood, specific_feeling,
      intensity, factors, tags, note, coping_step, meals, water, sleep,
      "primary", mood_score, updated_at
    )
    select r.id, owner, r.entry_type, r.created, r.date_key, r.mood, r.specific_feeling,
      r.intensity, r.factors, r.tags, r.note, r.coping_step, r.meals, r.water, r.sleep,
      r."primary", r.mood_score, r.updated_at
    from jsonb_populate_recordset(null::public.journal_entries, changed_rows) r
    on conflict (id) do update set
      entry_type = excluded.entry_type, created = excluded.created, date_key = excluded.date_key,
      mood = excluded.mood, specific_feeling = excluded.specific_feeling, intensity = excluded.intensity,
      factors = excluded.factors, tags = excluded.tags, note = excluded.note,
      coping_step = excluded.coping_step, meals = excluded.meals, water = excluded.water,
      sleep = excluded.sleep, "primary" = excluded."primary", mood_score = excluded.mood_score,
      updated_at = excluded.updated_at
    where public.journal_entries.user_id = owner;
    if exists (select 1 from jsonb_array_elements(changed_rows) r
      where not exists (select 1 from public.journal_entries j where j.id = r->>'id' and j.user_id = owner)) then
      raise exception 'A journal ID is unavailable.' using errcode = '42501';
    end if;
    -- Configuration and entry envelopes are format checks, not proof of encryption.
    if not exists (select 1 from public.journal_entries where id = config_id and user_id = owner)
       or exists (select 1 from public.journal_entries j where j.user_id = owner and (
         (j.id = config_id and (j.note is null or j.note not like 'mj-e2ee-config:v1:%'))
         or (j.id <> config_id and (j.note is null or j.note not like 'mj-e2ee:v1:%'))
       )) then raise exception 'A complete encrypted journal and its key settings are required.' using errcode = '22023'; end if;
    result_revision := current_revision + 1;
    update public.journal_sync_state set revision = result_revision where user_id = owner;
    if dry_run then raise exception 'preview rollback' using errcode = 'MJDRY'; end if;
  exception when sqlstate 'MJDRY' then
    return current_revision::text;
  end;
  return result_revision::text;
end;
$$;

create or replace function public.save_journal_changes(changed_rows jsonb, deleted_ids text[], expected_revision bigint)
returns text language sql security definer set search_path = ''
as $$ select public.apply_journal_mutation(changed_rows, deleted_ids, expected_revision, false, false); $$;
create or replace function public.replace_journal_entries(replacement_rows jsonb, expected_revision bigint, dry_run boolean default false)
returns text language sql security definer set search_path = ''
as $$ select public.apply_journal_mutation(replacement_rows, '{}'::text[], expected_revision, true, dry_run); $$;

revoke all on function public.apply_journal_mutation(jsonb,text[],bigint,boolean,boolean) from public, anon, authenticated;
revoke all on function public.get_journal_snapshot() from public, anon, authenticated;
revoke all on function public.save_journal_changes(jsonb,text[],bigint) from public, anon, authenticated;
revoke all on function public.replace_journal_entries(jsonb,bigint,boolean) from public, anon, authenticated;
grant execute on function public.get_journal_snapshot() to authenticated;
grant execute on function public.save_journal_changes(jsonb,text[],bigint) to authenticated;
grant execute on function public.replace_journal_entries(jsonb,bigint,boolean) to authenticated;

-- One allocator is shared by signup and missing-profile recovery.
create or replace function public.allocate_journal_profile(profile_user uuid, requested text)
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare
  base text := left(regexp_replace(lower(coalesce(requested, '')), '[^a-z0-9_]', '', 'g'), 30);
  candidate text;
  suffix text;
  attempt integer := 0;
  result public.profiles;
begin
  select * into result from public.profiles where user_id = profile_user;
  if found then return result; end if;
  if char_length(base) < 3 then base := 'user_' || left(replace(profile_user::text, '-', ''), 12); end if;
  loop
    suffix := case when attempt = 0 then '' else '_' || left(replace(profile_user::text, '-', ''), 8) || '_' || attempt::text end;
    candidate := left(base, 30 - char_length(suffix)) || suffix;
    insert into public.profiles(user_id, username, role) values (profile_user, candidate, 'user')
      on conflict do nothing returning * into result;
    if found then return result; end if;
    select * into result from public.profiles where user_id = profile_user;
    if found then return result; end if;
    attempt := attempt + 1;
    if attempt > 1000 then raise exception 'Could not allocate a username. Please retry.'; end if;
  end loop;
end;
$$;
revoke all on function public.allocate_journal_profile(uuid,text) from public, anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  perform public.allocate_journal_profile(new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1)));
  return new;
end;
$$;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.ensure_journal_profile()
returns public.profiles language plpgsql security definer set search_path = ''
as $$
declare owner uuid := auth.uid(); result public.profiles;
begin
  if owner is null then raise exception 'Authentication is required.' using errcode = '42501'; end if;
  select * into result from public.allocate_journal_profile(owner,
    (select coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email,'@',1)) from auth.users u where u.id = owner));
  return result;
end;
$$;
revoke all on function public.ensure_journal_profile() from public, anon, authenticated;
grant execute on function public.ensure_journal_profile() to authenticated;
alter function public.current_user_is_admin() set search_path = '';

create or replace function public.valid_support_diagnostics(value jsonb)
returns boolean language sql immutable set search_path = ''
as $$
  select value is null or coalesce(
    jsonb_typeof(value) = 'object'
    and value - array['page','theme','mode','browser','viewport'] = '{}'::jsonb
    and value->>'page' = any(array['/','/checkin','/entries','/calendar','/summary','/activities','/settings','/games','/games/garden','/games/constellation','/games/orbit','/support','/about','/newsletter','/admin','unknown'])
    and value->>'theme' = any(array['warm','ocean','garden','night','sunrise','unknown'])
    and value->>'mode' = any(array['light','dark','unknown'])
    and value->>'browser' = any(array['Firefox','Edge','Chrome','Safari','Other'])
    and value->>'viewport' ~ '^[1-9][0-9]{0,4}x[1-9][0-9]{0,4}$'
    and jsonb_typeof(value->'page') = 'string' and jsonb_typeof(value->'theme') = 'string'
    and jsonb_typeof(value->'mode') = 'string' and jsonb_typeof(value->'browser') = 'string'
    and jsonb_typeof(value->'viewport') = 'string', false);
$$;
revoke all on function public.valid_support_diagnostics(jsonb) from public, anon, authenticated;
grant execute on function public.valid_support_diagnostics(jsonb) to authenticated;
alter table public.support_requests drop constraint if exists support_diagnostics_safe;
-- Existing reports are retained; this constraint applies to new/changed rows.
alter table public.support_requests add constraint support_diagnostics_safe
check (public.valid_support_diagnostics(diagnostics)) not valid;
commit;
