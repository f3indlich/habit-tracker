-- Общие списки: несколько пользователей ведут один чек-лист (например, «Покупки»).
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен: таблицы создаются, только если их нет, функции и политики пересоздаются.
-- После этого выполните supabase-shared-lists-test.sql и убедитесь, что все проверки пройдены.
--
-- Пределы: до 10 общих списков на пользователя (своих и чужих), до 5 участников в списке,
-- до 500 записей в списке, запись до 200 символов, название до 40, имя участника до 24.
-- Удаление аккаунта (delete_my_account удаляет строку в auth.users): списки владельца
-- удаляются для всех участников; у других списков удаляется его участие, а добавленные
-- и отмеченные им записи остаются с created_by и done_by = null.

create table if not exists public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_members (
  list_id uuid not null references public.shared_lists on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.shared_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists on delete cascade,
  text text not null check (char_length(text) between 1 and 200),
  done boolean not null default false,
  done_by uuid references auth.users on delete set null,
  done_at timestamptz,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_invites (
  code text primary key,
  list_id uuid not null references public.shared_lists on delete cascade,
  created_by uuid not null references auth.users on delete cascade,
  expires_at timestamptz not null,
  uses int not null default 0,
  max_uses int not null default 1
);

create table if not exists public.shared_join_log (
  user_id uuid not null references auth.users on delete cascade,
  at timestamptz not null default now()
);

create index if not exists shared_members_user_idx on public.shared_members (user_id);
create index if not exists shared_items_list_idx on public.shared_items (list_id);
create index if not exists shared_invites_list_idx on public.shared_invites (list_id);
create index if not exists shared_join_log_user_idx on public.shared_join_log (user_id, at);

-- Права на таблицы: только вошедшим пользователям и только через политики ниже.
revoke all on public.shared_lists, public.shared_members, public.shared_items, public.shared_invites, public.shared_join_log from anon, authenticated;
grant select, insert, update, delete on public.shared_lists to authenticated;
grant select, update, delete on public.shared_members to authenticated;
grant select, insert, update, delete on public.shared_items to authenticated;
grant select, insert, delete on public.shared_invites to authenticated;

-- Помощники для политик. security definer, чтобы политики не уходили в рекурсию.
create or replace function public.is_list_member(p_list_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shared_members where list_id = p_list_id and user_id = auth.uid());
$$;

create or replace function public.is_list_owner(p_list_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shared_lists where id = p_list_id and owner_id = auth.uid());
$$;

revoke all on function public.is_list_member(uuid), public.is_list_owner(uuid) from public, anon;
grant execute on function public.is_list_member(uuid), public.is_list_owner(uuid) to authenticated;

alter table public.shared_lists enable row level security;
alter table public.shared_members enable row level security;
alter table public.shared_items enable row level security;
alter table public.shared_invites enable row level security;
alter table public.shared_join_log enable row level security;

drop policy if exists "shared_lists: read as member" on public.shared_lists;
drop policy if exists "shared_lists: create own" on public.shared_lists;
drop policy if exists "shared_lists: owner renames" on public.shared_lists;
drop policy if exists "shared_lists: owner deletes" on public.shared_lists;
create policy "shared_lists: read as member" on public.shared_lists for select to authenticated using (public.is_list_member(id));
create policy "shared_lists: create own" on public.shared_lists for insert to authenticated
  with check (owner_id = auth.uid() and (select count(*) from public.shared_members m where m.user_id = auth.uid()) < 10);
create policy "shared_lists: owner renames" on public.shared_lists for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "shared_lists: owner deletes" on public.shared_lists for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "shared_members: read same list" on public.shared_members;
drop policy if exists "shared_members: rename self" on public.shared_members;
drop policy if exists "shared_members: leave or remove" on public.shared_members;
create policy "shared_members: read same list" on public.shared_members for select to authenticated using (public.is_list_member(list_id));
create policy "shared_members: rename self" on public.shared_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shared_members: leave or remove" on public.shared_members for delete to authenticated
  using ((user_id = auth.uid() and not public.is_list_owner(list_id)) or (user_id <> auth.uid() and public.is_list_owner(list_id)));

drop policy if exists "shared_items: read as member" on public.shared_items;
drop policy if exists "shared_items: add as member" on public.shared_items;
drop policy if exists "shared_items: change as member" on public.shared_items;
drop policy if exists "shared_items: delete as member" on public.shared_items;
create policy "shared_items: read as member" on public.shared_items for select to authenticated using (public.is_list_member(list_id));
create policy "shared_items: add as member" on public.shared_items for insert to authenticated
  with check (public.is_list_member(list_id) and created_by = auth.uid());
create policy "shared_items: change as member" on public.shared_items for update to authenticated
  using (public.is_list_member(list_id)) with check (public.is_list_member(list_id));
create policy "shared_items: delete as member" on public.shared_items for delete to authenticated using (public.is_list_member(list_id));

drop policy if exists "shared_invites: owner reads" on public.shared_invites;
drop policy if exists "shared_invites: owner creates" on public.shared_invites;
drop policy if exists "shared_invites: owner deletes" on public.shared_invites;
create policy "shared_invites: owner reads" on public.shared_invites for select to authenticated using (public.is_list_owner(list_id));
create policy "shared_invites: owner creates" on public.shared_invites for insert to authenticated
  with check (public.is_list_owner(list_id) and created_by = auth.uid());
create policy "shared_invites: owner deletes" on public.shared_invites for delete to authenticated using (public.is_list_owner(list_id));

-- Триггеры: неизменяемые поля, отметки, пределы.
-- pg_trigger_depth() > 1 — изменение пришло из каскада внешнего ключа (on delete set null
-- при удалении аккаунта), а не от пользователя: его пропускаем без проверок.
create or replace function public.shared_lists_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id or new.id <> old.id or new.created_at <> old.created_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.name := btrim(new.name);
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists shared_lists_guard on public.shared_lists;
create trigger shared_lists_guard before update on public.shared_lists for each row execute function public.shared_lists_guard();

create or replace function public.shared_lists_owner_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.shared_members (list_id, user_id, display_name) values (new.id, new.owner_id, 'Участник')
  on conflict (list_id, user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists shared_lists_owner_member on public.shared_lists;
create trigger shared_lists_owner_member after insert on public.shared_lists for each row execute function public.shared_lists_owner_member();

create or replace function public.shared_members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.shared_lists where id = new.list_id for update;
    perform pg_advisory_xact_lock(hashtext('shared_user:' || new.user_id::text));
    if (select count(*) from public.shared_members where list_id = new.list_id) >= 5 then
      raise exception 'shared_list_full' using errcode = 'P0001';
    end if;
    if (select count(*) from public.shared_members where user_id = new.user_id) >= 10 then
      raise exception 'shared_too_many_lists' using errcode = 'P0001';
    end if;
    new.display_name := btrim(new.display_name);
    new.joined_at := now();
  elsif tg_op = 'UPDATE' then
    if new.list_id <> old.list_id or new.user_id <> old.user_id or new.joined_at <> old.joined_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.display_name := btrim(new.display_name);
  end if;
  return new;
end;
$$;
drop trigger if exists shared_members_guard on public.shared_members;
create trigger shared_members_guard before insert or update on public.shared_members for each row execute function public.shared_members_guard();

create or replace function public.shared_items_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.shared_lists where id = new.list_id for update;
    if (select count(*) from public.shared_items where list_id = new.list_id) >= 500 then
      raise exception 'shared_items_full' using errcode = 'P0001';
    end if;
    new.text := btrim(new.text);
    new.created_at := now();
    new.updated_at := now();
    if new.done then new.done_by := auth.uid(); new.done_at := now(); else new.done_by := null; new.done_at := null; end if;
  elsif tg_op = 'UPDATE' then
    if pg_trigger_depth() > 1 then return new; end if;
    if new.list_id <> old.list_id or new.id <> old.id or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.text := btrim(new.text);
    new.updated_at := now();
    if new.done and not old.done then new.done_by := auth.uid(); new.done_at := now();
    elsif not new.done then new.done_by := null; new.done_at := null;
    else new.done_by := old.done_by; new.done_at := old.done_at;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists shared_items_guard on public.shared_items;
create trigger shared_items_guard before insert or update on public.shared_items for each row execute function public.shared_items_guard();

-- Функции для приложения.
create or replace function public.create_shared_list(p_name text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_who text := btrim(coalesce(p_display_name, ''));
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'shared_bad_name' using errcode = 'P0001'; end if;
  if char_length(v_who) not between 1 and 24 then raise exception 'shared_bad_display_name' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('shared_user:' || v_uid::text));
  if (select count(*) from public.shared_members where user_id = v_uid) >= 10 then
    raise exception 'shared_too_many_lists' using errcode = 'P0001';
  end if;
  insert into public.shared_lists (owner_id, name) values (v_uid, v_name) returning id into v_id;
  update public.shared_members set display_name = v_who where list_id = v_id and user_id = v_uid;
  return v_id;
end;
$$;

create or replace function public.create_invite(p_list_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_alpha constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_pos constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  v_bytes bytea;
  v_code text;
  i int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.shared_lists where id = p_list_id and owner_id = v_uid) then
    raise exception 'shared_not_owner' using errcode = '42501';
  end if;
  delete from public.shared_invites where list_id = p_list_id or expires_at < now() or uses >= max_uses;
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 1..10 loop
      v_code := v_code || substr(v_alpha, (get_byte(v_bytes, v_pos[i]) % 32) + 1, 1);
    end loop;
    begin
      insert into public.shared_invites (code, list_id, created_by, expires_at, max_uses)
      values (v_code, p_list_id, v_uid, now() + interval '48 hours', 1);
      exit;
    exception when unique_violation then
    end;
  end loop;
  return v_code;
end;
$$;

-- Возвращает {"ok": true, "list_id": ...} или {"ok": false, "error": ...}, а не ошибку:
-- иначе вызов откатился бы целиком вместе с записью неудачной попытки в журнал.
-- Ошибки: bad_code (нет такого кода, истёк или исчерпан — одинаково), too_many,
-- already, full, too_many_lists, bad_display_name.
create or replace function public.join_shared_list(p_code text, p_display_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  v_who text := btrim(coalesce(p_display_name, ''));
  v_inv public.shared_invites%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(v_who) not between 1 and 24 then return jsonb_build_object('ok', false, 'error', 'bad_display_name'); end if;
  perform pg_advisory_xact_lock(hashtext('shared_user:' || v_uid::text));
  delete from public.shared_join_log where at < now() - interval '1 day';
  if (select count(*) from public.shared_join_log where user_id = v_uid and at > now() - interval '10 minutes') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;
  select * into v_inv from public.shared_invites where code = v_code for update;
  if not found or v_inv.expires_at < now() or v_inv.uses >= v_inv.max_uses then
    insert into public.shared_join_log (user_id) values (v_uid);
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;
  if exists (select 1 from public.shared_members where list_id = v_inv.list_id and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'error', 'already');
  end if;
  perform 1 from public.shared_lists where id = v_inv.list_id for update;
  if (select count(*) from public.shared_members where list_id = v_inv.list_id) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'full');
  end if;
  if (select count(*) from public.shared_members where user_id = v_uid) >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_lists');
  end if;
  insert into public.shared_members (list_id, user_id, display_name) values (v_inv.list_id, v_uid, v_who);
  update public.shared_invites set uses = uses + 1 where code = v_code;
  return jsonb_build_object('ok', true, 'list_id', v_inv.list_id);
end;
$$;

create or replace function public.leave_shared_list(p_list_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if exists (select 1 from public.shared_lists where id = p_list_id and owner_id = v_uid) then
    raise exception 'shared_owner_cannot_leave' using errcode = 'P0001';
  end if;
  delete from public.shared_members where list_id = p_list_id and user_id = v_uid;
end;
$$;

create or replace function public.remove_shared_member(p_list_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.shared_lists where id = p_list_id and owner_id = v_uid) then
    raise exception 'shared_not_owner' using errcode = '42501';
  end if;
  if p_user_id = v_uid then raise exception 'shared_owner_cannot_leave' using errcode = 'P0001'; end if;
  delete from public.shared_members where list_id = p_list_id and user_id = p_user_id;
end;
$$;

revoke all on function public.create_shared_list(text, text), public.create_invite(uuid), public.join_shared_list(text, text),
  public.leave_shared_list(uuid), public.remove_shared_member(uuid, uuid) from public, anon;
grant execute on function public.create_shared_list(text, text), public.create_invite(uuid), public.join_shared_list(text, text),
  public.leave_shared_list(uuid), public.remove_shared_member(uuid, uuid) to authenticated;
revoke all on function public.shared_lists_guard(), public.shared_lists_owner_member(), public.shared_members_guard(), public.shared_items_guard() from public, anon, authenticated;
