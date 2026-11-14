-- Проверка обновления 3 общих списков: заголовки, подпункты, порядок строк.
--
-- Как запустить:
--   1. Сначала выполните supabase-shared-lists.sql, supabase-shared-lists-2.sql и supabase-shared-lists-3.sql.
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
  ('00000000-0000-4000-8000-0000000000a3', 'shared3-test-a@example.invalid'),
  ('00000000-0000-4000-8000-0000000000b3', 'shared3-test-b@example.invalid');

do $$
declare
  ua uuid := '00000000-0000-4000-8000-0000000000a3';
  ub uuid := '00000000-0000-4000-8000-0000000000b3';
  l uuid; code text; r public.shared_items%rowtype; h public.shared_items%rowtype; ok boolean; p0 double precision;
begin
  perform pg_temp.t_ok('у строк есть вид, место и отступ',
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'shared_items' and column_name in ('kind', 'pos', 'indent')) = 3);
  perform pg_temp.t_ok('старые разделы стали подзаголовками, у всех строк есть место',
    not exists (select 1 from public.shared_items where pos is null) and not exists (select 1 from public.shared_items where section is not null));

  perform pg_temp.t_as(ua);
  l := public.create_shared_list('Покупки', 'Анна');
  code := public.create_invite(l);
  perform pg_temp.t_as(ub);
  perform public.join_shared_list(code, 'Борис');

  perform pg_temp.t_as(ua);
  insert into public.shared_items (list_id, text, created_by, kind, pos) values (l, '  🛒 ЗАПАС ', ua, 'h1', 1024) returning * into h;
  perform pg_temp.t_ok('заголовок сохраняется и обрезается по краям', h.kind = 'h1' and h.text = '🛒 ЗАПАС' and h.pos = 1024, h.text);

  insert into public.shared_items (list_id, text, created_by, kind, done, assigned_to, indent) values (l, 'Крупы', ua, 'h2', true, ub, 1) returning * into h;
  perform pg_temp.t_ok('подзаголовок нельзя отметить, назначить или сдвинуть', not h.done and h.assigned_to is null and h.indent = 0);
  perform pg_temp.t_ok('строка без места встаёт в конец', h.pos > 1024, h.pos::text);
  p0 := h.pos;

  insert into public.shared_items (list_id, text, created_by, indent) values (l, 'Паприка', ua, 1) returning * into r;
  perform pg_temp.t_ok('пункт может быть подпунктом и встаёт после подзаголовка', r.kind = 'item' and r.indent = 1 and r.pos > p0);

  begin
    insert into public.shared_items (list_id, text, created_by, indent) values (l, 'Слишком глубоко', ua, 2);
    ok := false;
  exception when others then ok := true;
  end;
  perform pg_temp.t_ok('отступ больше одного уровня не принимается', ok);

  begin
    insert into public.shared_items (list_id, text, created_by, kind) values (l, 'Что-то', ua, 'h3');
    ok := false;
  exception when others then ok := true;
  end;
  perform pg_temp.t_ok('неизвестный вид строки не принимается', ok);

  perform pg_temp.t_as(ub);
  update public.shared_items set pos = 512 where id = r.id returning * into r;
  perform pg_temp.t_ok('участник может переставить пункт', r.pos = 512);
  update public.shared_items set pos = null, text = 'Паприка сладкая' where id = r.id returning * into r;
  perform pg_temp.t_ok('правка без места не сбрасывает порядок', r.pos = 512 and r.text = 'Паприка сладкая');

  begin
    update public.shared_items set kind = 'h1' where id = r.id;
    ok := false;
  exception when others then ok := sqlerrm like '%shared_readonly%';
  end;
  perform pg_temp.t_ok('вид строки после создания не меняется', ok);

  update public.shared_items set done = true where id = h.id returning * into h;
  perform pg_temp.t_ok('отметка на заголовке не ставится', not h.done and h.done_by is null);
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
