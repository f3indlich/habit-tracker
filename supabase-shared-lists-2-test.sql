-- Проверка обновления 2 общих списков: назначение, разделы, уведомления, мгновенные обновления.
--
-- Как запустить:
--   1. Сначала выполните supabase-shared-lists.sql и supabase-shared-lists-2.sql.
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
  ('00000000-0000-4000-8000-0000000000a1', 'shared2-test-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b1', 'shared2-test-b@example.invalid'),
  ('00000000-0000-4000-8000-0000000000c1', 'shared2-test-c@example.invalid');

do $$
declare
  ua uuid := '00000000-0000-4000-8000-0000000000a1';
  ub uuid := '00000000-0000-4000-8000-0000000000b1';
  uc uuid := '00000000-0000-4000-8000-0000000000c1';
  l uuid; code text; it uuid; r public.shared_items%rowtype; m public.shared_members%rowtype; ok boolean; cnt int; t0 timestamptz;
begin
  perform pg_temp.t_as(ua);
  l := public.create_shared_list('Покупки', 'Анна');
  code := public.create_invite(l);
  perform pg_temp.t_as(ub);
  perform public.join_shared_list(code, 'Борис');

  perform pg_temp.t_as(ua);
  insert into public.shared_items (list_id, text, created_by, assigned_to, section) values (l, 'Молоко', ua, ub, '  Молочное ') returning * into r;
  it := r.id;
  perform pg_temp.t_ok('назначение участнику ставит, кто и когда назначил', r.assigned_to = ub and r.assigned_by = ua and r.assigned_at is not null);
  perform pg_temp.t_ok('раздел обрезается по краям', r.section = 'Молочное', r.section);

  begin
    insert into public.shared_items (list_id, text, created_by, assigned_to) values (l, 'Хлеб', ua, uc);
    ok := false;
  exception when others then ok := sqlerrm like '%shared_bad_assignee%';
  end;
  perform pg_temp.t_ok('нельзя назначить того, кто не в списке', ok);

  update public.shared_items set section = '   ' where id = it returning * into r;
  perform pg_temp.t_ok('пустой раздел превращается в «без раздела»', r.section is null);
  begin
    update public.shared_items set section = repeat('я', 25) where id = it;
    ok := false;
  exception when others then ok := true;
  end;
  perform pg_temp.t_ok('раздел длиннее 24 знаков не принимается', ok);

  perform pg_temp.t_as(ub);
  update public.shared_items set assigned_by = ub, assigned_at = now() - interval '5 days' where id = it returning * into r;
  perform pg_temp.t_ok('кто и когда назначил нельзя подделать', r.assigned_by = ua and r.assigned_at > now() - interval '1 hour');
  update public.shared_items set assigned_to = null where id = it returning * into r;
  perform pg_temp.t_ok('снятие назначения очищает автора и время', r.assigned_to is null and r.assigned_by is null and r.assigned_at is null);
  update public.shared_items set assigned_to = ub where id = it returning * into r;
  perform pg_temp.t_ok('участник может назначить себя', r.assigned_to = ub and r.assigned_by = ub);

  update public.shared_members set notified_at = now() - interval '10 days' where list_id = l and user_id = ub returning * into m;
  perform pg_temp.t_ok('отметку «уведомлён до» участник сам не меняет', m.notified_at > now() - interval '1 hour');
  t0 := m.notified_at;
  update public.shared_members set notify = true where list_id = l and user_id = ub returning * into m;
  perform pg_temp.t_ok('включение уведомлений начинает отсчёт с этого момента', m.notify and m.notified_at >= t0);
  perform pg_temp.t_as(ua);
  begin
    update public.shared_members set notify = true where list_id = l and user_id = ub;
    get diagnostics cnt = row_count;
    ok := cnt = 0;
  exception when others then ok := true;
  end;
  perform pg_temp.t_ok('чужие уведомления включить нельзя', ok);

  perform pg_temp.t_as(ub);
  perform public.leave_shared_list(l);
  perform pg_temp.t_admin();
  select * into r from public.shared_items where id = it;
  perform pg_temp.t_ok('ушедший участник снимается с назначений', r.assigned_to is null and r.assigned_by is null);

  perform pg_temp.t_ok('изменения общих списков идут в мгновенные обновления',
    (select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename in ('shared_items', 'shared_members', 'shared_lists')) = 3);
exception when others then
  perform pg_temp.t_admin();
  perform pg_temp.t_ok('проверка прервалась', false, sqlerrm);
end $$;

select pg_temp.t_admin();
select n, case when ok then 'ПРОЙДЕНО' else 'НЕ ПРОЙДЕНО' end as result, name, detail from t_results order by n;

do $$
declare total int; good int; bad text;
begin
  select count(*), count(*) filter (where ok), string_agg(name, '; ' order by n) filter (where not ok) into total, good, bad from t_results;
  if bad is null then
    raise exception 'ИТОГ: пройдено % из %', good, total;
  else
    raise exception 'ИТОГ: пройдено % из %. Не прошли: %', good, total, bad;
  end if;
end $$;

rollback;
