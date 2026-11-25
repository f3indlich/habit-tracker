-- Проверка обновления 4: тип списка, многоразовые приглашения, invite от участника, передача владельца.
--
-- Как запустить:
--   1. Сначала выполните supabase-shared-lists.sql … -3.sql и supabase-shared-lists-4.sql (без ошибок).
--   2. Supabase → SQL Editor → New query → вставьте весь этот файл → Run.
--
-- Всё выполняется в одной транзакции и в конце откатывается: в базе ничего не остаётся.
-- Нужная строка в ответе начинается с «ИТОГ:». «ИТОГ: пройдено N из N» — всё в порядке.

begin;

create temp table t_results (n serial primary key, name text not null, ok boolean not null, detail text);
grant all on t_results to public;
grant usage, select on sequence t_results_n_seq to public;

create function pg_temp.t_ok(p_name text, p_ok boolean, p_detail text default null) returns void
language sql as $$ insert into t_results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail) $$;

create function pg_temp.t_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

create function pg_temp.t_admin() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a4', 'shared4-test-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b4', 'shared4-test-b@example.invalid'),
  ('00000000-0000-4000-8000-0000000000c4', 'shared4-test-c@example.invalid');

do $$
declare
  ua uuid := '00000000-0000-4000-8000-0000000000a4';
  ub uuid := '00000000-0000-4000-8000-0000000000b4';
  uc uuid := '00000000-0000-4000-8000-0000000000c4';
  lid uuid;
  code1 text;
  code2 text;
  j jsonb;
  inv public.shared_invites%rowtype;
  has_kind boolean;
  has_fn boolean;
  ok boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shared_lists' and column_name = 'kind'
  ) into has_kind;
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_shared_list_prefs'
  ) into has_fn;
  perform pg_temp.t_ok('колонка shared_lists.kind есть (выполнен -4.sql)', has_kind);
  perform pg_temp.t_ok('есть set_shared_list_prefs (выполнен -4.sql)', has_fn);
  if not has_kind or not has_fn then
    raise exception 'Сначала выполните supabase-shared-lists-4.sql без ошибок, затем этот тест снова';
  end if;

  perform pg_temp.t_as(ua);
  lid := public.create_shared_list('Дом', 'Аня', 'chores');
  perform pg_temp.t_ok('create with chores kind', exists (select 1 from public.shared_lists where id = lid and kind = 'chores'));

  code1 := public.create_invite(lid);
  select * into inv from public.shared_invites where code = code1;
  perform pg_temp.t_ok('invite lasts 7 days with 5 uses', inv.max_uses = 5 and inv.expires_at > now() + interval '6 days');

  code2 := public.create_invite(lid);
  perform pg_temp.t_ok('second invite keeps the first', exists (select 1 from public.shared_invites where code = code1) and code2 is distinct from code1);

  perform pg_temp.t_as(ub);
  j := public.join_shared_list(code1, 'Боря');
  perform pg_temp.t_ok('join with multi-use code', (j->>'ok')::boolean and (j->>'list_id')::uuid = lid);

  perform pg_temp.t_as(ua);
  perform public.set_shared_list_prefs(lid, null, true);
  perform pg_temp.t_ok('owner enables member invites', (select members_can_invite from public.shared_lists where id = lid));

  perform pg_temp.t_as(ub);
  begin
    code2 := public.create_invite(lid);
    ok := code2 is not null;
  exception when others then
    ok := false;
  end;
  perform pg_temp.t_ok('member can invite when allowed', ok);

  perform pg_temp.t_as(ua);
  perform public.transfer_shared_list(lid, ub);
  perform pg_temp.t_ok('owner transferred', (select owner_id from public.shared_lists where id = lid) = ub);

  perform pg_temp.t_as(ub);
  perform public.set_shared_list_prefs(lid, 'shopping', false);
  perform pg_temp.t_ok('new owner sets shopping', (select kind = 'shopping' and not members_can_invite from public.shared_lists where id = lid));

  perform pg_temp.t_as(uc);
  begin
    perform public.create_invite(lid);
    ok := false;
  exception when others then
    ok := true;
  end;
  perform pg_temp.t_ok('outsider cannot invite', ok);

  perform pg_temp.t_admin();
exception when others then
  perform pg_temp.t_admin();
  perform pg_temp.t_ok('проверка прервалась', false, sqlerrm);
end $$;

select n, case when ok then 'ПРОЙДЕНО' else 'НЕ ПРОЙДЕНО' end as result, name, detail from t_results order by n;

do $$
declare
  total int;
  good int;
  bad text;
begin
  select count(*), count(*) filter (where ok), string_agg(name, '; ' order by n) filter (where not ok)
  into total, good, bad from t_results;
  if bad is null then
    raise exception 'ИТОГ: пройдено % из %', good, total;
  else
    raise exception 'ИТОГ: пройдено % из %. Не прошли: %', good, total, bad;
  end if;
end $$;

rollback;
