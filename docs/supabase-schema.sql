create table if not exists public.journal_entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null default 'checkin' check (entry_type in ('checkin', 'journal', 'game')),
  created timestamptz not null,
  date_key date not null,
  mood text not null,
  specific_feeling text default '',
  intensity integer not null default 5,
  factors text[] not null default '{}',
  tags text[] not null default '{}',
  note text default '',
  coping_step text default '',
  meals text default '',
  water text default '',
  sleep text default '',
  "primary" boolean not null default false,
  mood_score integer,
  updated_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

alter table public.journal_entries
add column if not exists entry_type text not null default 'checkin';

alter table public.journal_entries
drop constraint if exists journal_entries_entry_type_check;

alter table public.journal_entries
add constraint journal_entries_entry_type_check check (entry_type in ('checkin', 'journal', 'game'));

-- Journal entries are private by default: the browser client can only read
-- rows where the signed-in user's auth.uid() matches journal_entries.user_id.
drop policy if exists "Users can read their own journal entries" on public.journal_entries;
create policy "Users can read their own journal entries"
on public.journal_entries
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own journal entries" on public.journal_entries;
create policy "Users can create their own journal entries"
on public.journal_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own journal entries" on public.journal_entries;
create policy "Users can update their own journal entries"
on public.journal_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own journal entries" on public.journal_entries;
create policy "Users can delete their own journal entries"
on public.journal_entries
for delete
using (auth.uid() = user_id);

create index if not exists journal_entries_user_date_idx
on public.journal_entries (user_id, date_key desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role text not null default 'user';

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check check (role in ('user', 'admin'));

alter table public.profiles
drop constraint if exists profiles_username_length_check;

alter table public.profiles
add constraint profiles_username_length_check check (char_length(username) between 3 and 30);

alter table public.profiles enable row level security;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

drop policy if exists "Anyone can read profile usernames" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id or public.current_user_is_admin());

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id and role = 'user');

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- RLS identifies which rows may be updated; column grants prevent users from
-- promoting their own profile to admin or changing ownership metadata.
revoke update on table public.profiles from anon, authenticated;
grant update (username) on table public.profiles to authenticated;

drop policy if exists "Admins can read all journal entries" on public.journal_entries;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
begin
  requested_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));

  if requested_username = '' then
    requested_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (user_id, username)
  values (new.id, requested_username);

  return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
