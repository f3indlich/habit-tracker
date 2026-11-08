-- Проверка безопасности общих списков (RLS, функции, пределы, каскады).
--
-- Как запустить:
--   1. Сначала выполните supabase-shared-lists.sql.
--   2. Supabase → SQL Editor → New query → вставьте весь этот файл → Run.
--
-- Скрипт создаёт временных тестовых пользователей и данные внутри одной транзакции
-- и в конце всё откатывает: в базе ничего не остаётся.
--
-- Что значит результат:
--   Скрипт всегда заканчивается сообщением об ошибке — так он показывает итог
--   и гарантирует откат. Нужная строка начинается с «ИТОГ:».
--   «ИТОГ: пройдено N из N» — всё в порядке.
--   «ИТОГ: пройдено X из N. Не прошли: …» — перечислены проверки, которые не прошли;
--   пришлите мне это сообщение целиком.
--   Любая другая ошибка (например, «relation … does not exist») — скрипт не дошёл до конца:
--   скорее всего, не выполнен supabase-shared-lists.sql.

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
  ('00000000-0000-4000-8000-00000000000a', 'shared-test-a@example.invalid'),
  ('00000000-0000-4000-8000-00000000000b', 'shared-test-b@example.invalid'),
  ('00000000-0000-4000-8000-00000000000c', 'shared-test-c@example.invalid'),
  ('00000000-0000-4000-8000-00000000000d', 'shared-test-d@example.invalid'),
  ('00000000-0000-4000-8000-00000000000e', 'shared-test-e@example.invalid'),
  ('00000000-0000-4000-8000-00000000000f', 'shared-test-f@example.invalid'),
  ('00000000-0000-4000-8000-000000000010', 'shared-test-g@example.invalid'),
  ('00000000-0000-4000-8000-000000000011', 'shared-test-h@example.invalid');

create temp table t_ids (k text primary key, v text);
grant all on t_ids to public;

do $$
declare
  ua uuid := '00000000-0000-4000-8000-00000000000a'; ub uuid := '00000000-0000-4000-8000-00000000000b';
  uc uuid := '00000000-0000-4000-8000-00000000000c'; ud uuid := '00000000-0000-4000-8000-00000000000d';
  ue uuid := '00000000-0000-4000-8000-00000000000e'; uf uuid := '00000000-0000-4000-8000-00000000000f';
  ug uuid := '00000000-0000-4000-8000-000000000010'; uh uuid := '00000000-0000-4000-8000-000000000011';
  la uuid; lb uuid; it uuid; itb uuid; c1 text; c2 text; r jsonb; n int; ok boolean; msg text; i int;
begin
  begin
    perform pg_temp.t_as(ua);
    la := public.create_shared_list('  Покупки  ', 'Аня');
    perform pg_temp.t_ok('владелец создаёт список', la is not null);
    select name into msg from public.shared_lists where id = la;
    perform pg_temp.t_ok('название обрезано по краям', msg = 'Покупки', msg);
    select display_name into msg from public.shared_members where list_id = la and user_id = ua;
    perform pg_temp.t_ok('владелец сразу участник со своим именем', msg = 'Аня', msg);
    insert into public.shared_items (list_id, text, created_by) values (la, 'Молоко', ua) returning id into it;
    perform pg_temp.t_ok('участник добавляет запись', it is not null);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «создание списка» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(uc);
    select count(*) into n from public.shared_lists where id = la;
    perform pg_temp.t_ok('чужой не видит список', n = 0);
    select count(*) into n from public.shared_items where list_id = la;
    perform pg_temp.t_ok('чужой не видит записи', n = 0);
    select count(*) into n from public.shared_members where list_id = la;
    perform pg_temp.t_ok('чужой не видит участников', n = 0);
    update public.shared_items set text = 'Взлом' where id = it;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('чужой не меняет запись', n = 0);
    delete from public.shared_items where id = it;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('чужой не удаляет запись', n = 0);
    update public.shared_lists set name = 'Взлом' where id = la;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('чужой не переименовывает список', n = 0);
    delete from public.shared_lists where id = la;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('чужой не удаляет список', n = 0);
    ok := false;
    begin insert into public.shared_items (list_id, text, created_by) values (la, 'Чужое', uc); exception when others then ok := true; end;
    perform pg_temp.t_ok('не-участник не добавляет запись', ok);
    ok := false;
    begin perform public.create_invite(la); exception when others then ok := true; end;
    perform pg_temp.t_ok('чужой не создаёт приглашение', ok);
    ok := false;
    begin insert into public.shared_members (list_id, user_id, display_name) values (la, uc, 'Я'); exception when others then ok := true; end;
    perform pg_temp.t_ok('нельзя вписать себя в участники напрямую', ok);
    ok := false;
    begin perform count(*) from public.shared_join_log; exception when insufficient_privilege then ok := true; end;
    perform pg_temp.t_ok('журнал попыток недоступен напрямую', ok);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «чужой пользователь» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(ua);
    c1 := public.create_invite(la);
    perform pg_temp.t_ok('код из 10 знаков без похожих символов', c1 ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$', c1);
    c2 := public.create_invite(la);
    select count(*) into n from public.shared_invites where list_id = la;
    perform pg_temp.t_ok('новый код отзывает прежний', n = 1 and c1 <> c2 and not exists (select 1 from public.shared_invites where code = c1));
    select count(*) into n from public.shared_invites where code = c2 and expires_at between now() + interval '47 hours' and now() + interval '49 hours' and max_uses = 1;
    perform pg_temp.t_ok('код живёт 48 часов и один раз', n = 1);
    insert into t_ids values ('la', la::text), ('it', it::text), ('c2', c2::text);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «приглашения» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(uc);
    r := public.join_shared_list('NOSUCHCODE', 'Чужой');
    perform pg_temp.t_ok('несуществующий код — общее сообщение', r->>'error' = 'bad_code', r::text);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «несуществующий код» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(ub);
    r := public.join_shared_list(lower(substr(c2, 1, 4)) || '-' || substr(c2, 5, 3) || ' ' || substr(c2, 8), 'Боря');
    perform pg_temp.t_ok('вступление по коду, дефис, пробел и регистр не важны', (r->>'ok')::boolean and (r->>'list_id')::uuid = la, r::text);
    select count(*) into n from public.shared_items where list_id = la;
    perform pg_temp.t_ok('участник видит записи', n = 1);
    select count(*) into n from public.shared_members where list_id = la;
    perform pg_temp.t_ok('участники видят друг друга', n = 2);
    select count(*) into n from public.shared_invites where list_id = la;
    perform pg_temp.t_ok('участник не видит приглашения', n = 0);
    insert into public.shared_items (list_id, text, created_by) values (la, 'Хлеб', ub) returning id into itb;
    perform pg_temp.t_ok('участник добавляет свою запись', itb is not null);
    ok := false;
    begin insert into public.shared_items (list_id, text, created_by) values (la, 'От чужого имени', ua); exception when others then ok := true; end;
    perform pg_temp.t_ok('нельзя добавить запись от чужого имени', ok);
    update public.shared_items set done = true, done_by = ua, done_at = '2000-01-01' where id = it;
    select done_by::text into msg from public.shared_items where id = it;
    perform pg_temp.t_ok('отметку ставит сам участник, подделать нельзя', msg = ub::text and (select done_at > now() - interval '1 minute' from public.shared_items where id = it), msg);
    ok := false;
    begin update public.shared_items set list_id = gen_random_uuid() where id = it; exception when others then ok := true; end;
    perform pg_temp.t_ok('нельзя сменить список у записи', ok);
    ok := false;
    begin update public.shared_items set created_by = ub where id = it; exception when others then ok := true; end;
    perform pg_temp.t_ok('нельзя сменить автора записи', ok);
    update public.shared_lists set name = 'Моё' where id = la;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('участник не переименовывает список', n = 0);
    delete from public.shared_lists where id = la;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('участник не удаляет список', n = 0);
    update public.shared_members set display_name = 'Взлом' where list_id = la and user_id = ua;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('участник не меняет чужое имя', n = 0);
    update public.shared_members set display_name = 'Борис' where list_id = la and user_id = ub;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('участник меняет своё имя', n = 1);
    delete from public.shared_members where list_id = la and user_id = ua;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('участник не удаляет других', n = 0);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «участник» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(uc);
    r := public.join_shared_list(c2, 'Чужой');
    perform pg_temp.t_ok('использованный код — общее сообщение', r->>'error' = 'bad_code', r::text);
    perform pg_temp.t_admin();
    insert into public.shared_invites (code, list_id, created_by, expires_at) values ('EXPIRED234', la, ua, now() - interval '1 minute');
    perform pg_temp.t_as(uc);
    r := public.join_shared_list('EXPIRED234', 'Чужой');
    perform pg_temp.t_ok('истёкший код — общее сообщение', r->>'error' = 'bad_code', r::text);
    for i in 1..7 loop r := public.join_shared_list('WRONG' || i, 'Чужой'); end loop;
    perform pg_temp.t_ok('десятая неудачная попытка ещё обрабатывается', r->>'error' = 'bad_code', r::text);
    perform pg_temp.t_as(ua);
    c1 := public.create_invite(la);
    perform pg_temp.t_as(uc);
    r := public.join_shared_list(c1, 'Чужой');
    perform pg_temp.t_ok('одиннадцатая попытка отклонена даже с верным кодом', r->>'error' = 'too_many', r::text);
    select count(*) into n from public.shared_members where list_id = la and user_id = uc;
    perform pg_temp.t_ok('после отказа чужой не участник', n = 0);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «неверные коды и перебор» прервался', false, sqlerrm);
  end;
  begin
    foreach ub in array array[ud, ue, uf] loop
      perform pg_temp.t_as(ua);
      c1 := public.create_invite(la);
      perform pg_temp.t_as(ub);
      r := public.join_shared_list(c1, 'Гость');
    end loop;
    ub := '00000000-0000-4000-8000-00000000000b';
    perform pg_temp.t_as(ua);
    select count(*) into n from public.shared_members where list_id = la;
    perform pg_temp.t_ok('в списке пятеро', n = 5, n::text);
    c1 := public.create_invite(la);
    perform pg_temp.t_as(ug);
    r := public.join_shared_list(c1, 'Шестой');
    perform pg_temp.t_ok('шестой участник не входит', r->>'error' = 'full', r::text);
    perform pg_temp.t_as(ua);
    ok := false;
    begin perform public.leave_shared_list(la); exception when others then ok := true; end;
    perform pg_temp.t_ok('владелец не может выйти', ok);
    delete from public.shared_members where list_id = la and user_id = ua;
    get diagnostics n = row_count;
    perform pg_temp.t_ok('владелец не удаляет себя напрямую', n = 0);
    perform public.remove_shared_member(la, ud);
    perform pg_temp.t_ok('владелец убирает участника', not exists (select 1 from public.shared_members where list_id = la and user_id = ud));
    perform pg_temp.t_as(ue);
    ok := false;
    begin perform public.remove_shared_member(la, uf); exception when others then ok := true; end;
    perform pg_temp.t_ok('участник не убирает других через функцию', ok);
    perform public.leave_shared_list(la);
    perform pg_temp.t_ok('участник выходит сам', not exists (select 1 from public.shared_members where list_id = la and user_id = ue));
    select count(*) into n from public.shared_items where list_id = la;
    perform pg_temp.t_ok('вышедший больше не видит записи', n = 0);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «участники и выход» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(ua);
    insert into public.shared_items (list_id, text, created_by) select la, 'Запись ' || g, ua from generate_series(1, 500 - (select count(*) from public.shared_items where list_id = la)) g;
    select count(*) into n from public.shared_items where list_id = la;
    perform pg_temp.t_ok('в списке 500 записей', n = 500, n::text);
    ok := false;
    begin insert into public.shared_items (list_id, text, created_by) values (la, 'Лишняя', ua); exception when others then ok := true; end;
    perform pg_temp.t_ok('501-я запись не добавляется', ok);
    ok := false;
    begin insert into public.shared_items (list_id, text, created_by) values (la, repeat('я', 201), ua); exception when others then ok := true; end;
    perform pg_temp.t_ok('запись длиннее 200 знаков не добавляется', ok);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «предел записей» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(uh);
    for i in 1..10 loop perform public.create_shared_list('Список ' || i, 'Хозяин'); end loop;
    ok := false;
    begin perform public.create_shared_list('Одиннадцатый', 'Хозяин'); exception when others then ok := true; end;
    perform pg_temp.t_ok('одиннадцатый список не создаётся', ok);
    ok := false;
    begin insert into public.shared_lists (owner_id, name) values (uh, 'Напрямую'); exception when others then ok := true; end;
    perform pg_temp.t_ok('предел списков нельзя обойти прямой вставкой', ok);
    ok := false;
    begin insert into public.shared_lists (owner_id, name) values (ua, 'За другого'); exception when others then ok := true; end;
    perform pg_temp.t_ok('нельзя создать список от чужого имени', ok);
    perform pg_temp.t_as(ua);
    c1 := public.create_invite(la);
    perform pg_temp.t_as(uh);
    r := public.join_shared_list(c1, 'Хозяин');
    perform pg_temp.t_ok('с десятью списками нельзя вступить в одиннадцатый', r->>'error' = 'too_many_lists', r::text);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «предел списков» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_as(uf);
    lb := public.create_shared_list('Дача', 'Фёдор');
    c1 := public.create_invite(lb);
    perform pg_temp.t_as(ub);
    r := public.join_shared_list(c1, 'Боря');
    insert into public.shared_items (list_id, text, created_by) values (lb, 'Семена', ub) returning id into itb;
    update public.shared_items set done = true where id = itb;
    insert into t_ids values ('lb', lb::text), ('itb', itb::text);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «второй список» прервался', false, sqlerrm);
  end;
  begin
    perform pg_temp.t_admin();
    execute 'set local role anon';
    ok := false;
    begin perform count(*) from public.shared_lists; exception when insufficient_privilege then ok := true; end;
    execute 'reset role';
    perform pg_temp.t_ok('без входа таблицы недоступны', ok);
  exception when others then
    perform pg_temp.t_admin();
    perform pg_temp.t_ok('раздел «без входа» прервался', false, sqlerrm);
  end;
end $$;

select pg_temp.t_admin();

do $$
declare la uuid := (select v::uuid from t_ids where k = 'la'); lb uuid := (select v::uuid from t_ids where k = 'lb'); itb uuid := (select v::uuid from t_ids where k = 'itb');
  ua uuid := '00000000-0000-4000-8000-00000000000a'; ub uuid := '00000000-0000-4000-8000-00000000000b';
begin
  delete from auth.users where id = ua;
  perform pg_temp.t_ok('удаление владельца удаляет его список для всех', not exists (select 1 from public.shared_lists where id = la) and not exists (select 1 from public.shared_items where list_id = la) and not exists (select 1 from public.shared_members where list_id = la) and not exists (select 1 from public.shared_invites where list_id = la));
  delete from auth.users where id = ub;
  perform pg_temp.t_ok('удаление участника убирает его из чужого списка', exists (select 1 from public.shared_lists where id = lb) and not exists (select 1 from public.shared_members where list_id = lb and user_id = ub));
  perform pg_temp.t_ok('его записи остаются без автора и отметившего', exists (select 1 from public.shared_items where id = itb and created_by is null and done_by is null and done));
  perform pg_temp.t_ok('его попытки входа удалены', not exists (select 1 from public.shared_join_log where user_id = ub));
exception when others then
  perform pg_temp.t_ok('раздел «удаление аккаунтов» прервался', false, sqlerrm);
end $$;

do $$
declare uf uuid := '00000000-0000-4000-8000-00000000000f'; lb uuid := (select v::uuid from t_ids where k = 'lb'); ok boolean := false;
begin
  if to_regprocedure('public.delete_my_account()') is null then
    perform pg_temp.t_ok('delete_my_account установлена (supabase-delete-account.sql)', false, 'функция не найдена');
    return;
  end if;
  perform pg_temp.t_as(uf);
  perform public.delete_my_account();
  perform pg_temp.t_admin();
  perform pg_temp.t_ok('delete_my_account удаляет пользователя и его общие списки', not exists (select 1 from auth.users where id = uf) and not exists (select 1 from public.shared_lists where id = lb));
exception when others then
  perform pg_temp.t_admin();
  perform pg_temp.t_ok('раздел «delete_my_account» прервался', false, sqlerrm);
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
