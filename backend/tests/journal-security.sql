-- Run only in a disposable Supabase-compatible database with the schema installed.
-- Every fixture in this file is rolled back.
begin;
create function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Assertion failed: %', message; end if; end $$;
create function pg_temp.expect_error(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate = expected then return; end if;
    raise exception 'Expected SQLSTATE %, got %', expected, sqlstate;
  end;
  raise exception 'Expected SQLSTATE %, but operation succeeded', expected;
end $$;
create function pg_temp.fixture_rows(owner uuid) returns jsonb language sql as $$
  select jsonb_agg(to_jsonb(fixture) order by fixture.id) from (select
    id, owner as user_id, 'checkin'::text as entry_type,
    '1970-01-01T00:00:00Z'::timestamptz as created, '1970-01-01'::date as date_key,
    'Encrypted'::text as mood, ''::text as specific_feeling, 5 as intensity,
    '{}'::text[] as factors, '{}'::text[] as tags, note,
    ''::text as coping_step, ''::text as meals, ''::text as water, ''::text as sleep,
    false as "primary", null::integer as mood_score, '1970-01-01T00:00:00Z'::timestamptz as updated_at
    from (values ('journal-encryption-config:' || owner::text, 'mj-e2ee-config:v1:test-only'),
      ('security-test-entry-' || owner::text, 'mj-e2ee:v1:test-only')) v(id,note)
  ) fixture;
$$;

insert into auth.users(id,email,raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001','alice@security.invalid','{"username":"Alice"}'),
 ('a1000000-0000-4000-8000-000000000002','alice@other-security.invalid','{"username":"Alice"}'),
 ('a1000000-0000-4000-8000-000000000003','admin@security.invalid','{"username":"a","role":"admin"}'),
 ('a1000000-0000-4000-8000-000000000004','long@security.invalid','{"username":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'),
 ('a1000000-0000-4000-8000-000000000005','blank@security.invalid','{"username":"!"}');
select pg_temp.assert_true((select username = 'alice' from public.profiles where user_id='a1000000-0000-4000-8000-000000000001'), 'normalize uppercase first');
select pg_temp.assert_true((select count(distinct username)=5 and bool_and(char_length(username) between 3 and 30) and bool_and(role='user') from public.profiles where user_id::text like 'a1000000-%'), 'collision, length, fallback and metadata role');
update public.profiles set role='admin' where user_id='a1000000-0000-4000-8000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true(public.save_journal_changes(pg_temp.fixture_rows(auth.uid()),'{}',0)='1','first revision');
select pg_temp.expect_error('delete from public.journal_entries', '42501');
select pg_temp.expect_error('update public.journal_entries set note=''plaintext''', '42501');
select pg_temp.expect_error('insert into public.journal_entries(id) values (''bypass'')', '42501');
select pg_temp.expect_error('update public.profiles set role=''admin''', '42501');
select pg_temp.expect_error('select public.apply_journal_mutation(''[]'',''{}'',1,false,false)', '42501');
select pg_temp.assert_true((public.get_journal_snapshot()->>'revision')='1','consistent snapshot');
select pg_temp.assert_true(public.replace_journal_entries(pg_temp.fixture_rows(auth.uid()),1,true)='1','preview returns unchanged revision');
select pg_temp.assert_true((public.get_journal_snapshot()->>'revision')='1','dry run rolled back revision');
select pg_temp.expect_error('select public.replace_journal_entries(null,1,false)','22023');
select pg_temp.expect_error('select public.replace_journal_entries(''null'',1,false)','22023');
select pg_temp.expect_error('select public.replace_journal_entries(''{}'',1,false)','22023');
select pg_temp.expect_error('select public.replace_journal_entries(''[]'',1,false)','22023');
select pg_temp.expect_error('select public.replace_journal_entries(jsonb_build_array(pg_temp.fixture_rows(auth.uid())->0),1,false)','22023');
select pg_temp.expect_error('select public.replace_journal_entries(jsonb_set(pg_temp.fixture_rows(auth.uid()),''{1,created}'',''null''),1,true)','23502');
select pg_temp.expect_error('select public.replace_journal_entries(jsonb_set(pg_temp.fixture_rows(auth.uid()),''{1,created}'',''null''),1,false)','23502');
select pg_temp.expect_error('select public.replace_journal_entries(jsonb_set(pg_temp.fixture_rows(auth.uid()),''{1,entry_type}'',''"invalid"''),1,true)','23514');
select pg_temp.expect_error('select public.replace_journal_entries(jsonb_set(pg_temp.fixture_rows(auth.uid()),''{1,entry_type}'',''"invalid"''),1,false)','23514');
select pg_temp.assert_true(jsonb_array_length(public.get_journal_snapshot()->'rows')=2,'failed replacement preserves rows');
select pg_temp.expect_error('select public.save_journal_changes(''[]'',''{}'',0)','MJ409');
select pg_temp.expect_error('select public.save_journal_changes(pg_temp.fixture_rows(''a1000000-0000-4000-8000-000000000002''),''{}'',1)','22023');
select pg_temp.expect_error('select public.save_journal_changes(''[]'',array[''journal-encryption-config:''||auth.uid()::text],1)','22023');
select pg_temp.expect_error('insert into public.support_requests(user_id,category,title,body,diagnostics) values(auth.uid(),''bug'',''Test'',''Test'',''{"tokens":"secret"}'')','23514');
insert into public.support_requests(id,user_id,category,title,body,diagnostics) values
 ('b1000000-0000-4000-8000-000000000001',auth.uid(),'bug','Test','Test','{"page":"/entries","theme":"night","mode":"dark","browser":"Other","viewport":"390x844"}');
update public.support_requests set status='resolved';
select pg_temp.assert_true((select status='new' from public.support_requests where id='b1000000-0000-4000-8000-000000000001'),'owner cannot triage');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(jsonb_array_length(public.get_journal_snapshot()->'rows')=0,'other user cannot read journal');
select pg_temp.assert_true((select count(*)=0 from public.support_requests),'other user cannot read support');
select pg_temp.expect_error('insert into public.support_messages(request_id,sender_id,body) values(''b1000000-0000-4000-8000-000000000001'',auth.uid(),''intrusion'')','42501');

select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true(jsonb_array_length(public.get_journal_snapshot()->'rows')=0,'support admin cannot read other journals');
update public.support_requests set status='in_review',priority='high' where id='b1000000-0000-4000-8000-000000000001';
insert into public.support_messages(request_id,sender_id,body) values('b1000000-0000-4000-8000-000000000001',auth.uid(),'Admin reply');
select pg_temp.assert_true((select status='in_review' from public.support_requests where id='b1000000-0000-4000-8000-000000000001'),'admin triage');

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.expect_error('select public.get_journal_snapshot()','42501');
select pg_temp.expect_error('select public.save_journal_changes(''[]'',''{}'',0)','42501');
select pg_temp.expect_error('select * from public.support_requests','42501');
rollback;
