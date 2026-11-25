-- Общие списки, обновление 4: тип списка (покупки/дела), многоразовые приглашения,
-- приглашения от участников, передача владельца.
-- Выполнить один раз после supabase-shared-lists-3.sql: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен. После этого выполните supabase-shared-lists-4-test.sql.
-- Пока файл не выполнен, приложение работает как раньше (тип списка только локально).
-- Вызывается вручную в Supabase SQL Editor (как supabase-shared-lists-2.sql / -3.sql); клиент детектит колонки kind/members_can_invite.
-- Схемы: shared_lists (+kind, members_can_invite), shared_invites (max_uses/expires), RPC create_shared_list/create_invite/set_shared_list_prefs/transfer_shared_list.
-- Инструкция пользователя: «ну так делай всё остальное».

alter table public.shared_lists add column if not exists kind text not null default 'shopping';
alter table public.shared_lists add column if not exists members_can_invite boolean not null default false;
do $$ begin
  alter table public.shared_lists add constraint shared_lists_kind_ok check (kind in ('shopping', 'chores'));
exception when duplicate_object then null; end $$;

-- Имя, тип и флаг приглашений меняет владелец; смена owner_id — только через transfer_shared_list.
create or replace function public.shared_lists_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.created_at <> old.created_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    if new.owner_id <> old.owner_id and coalesce(current_setting('app.shared_transfer', true), '') <> '1' then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.name := btrim(new.name);
    new.kind := case when new.kind in ('shopping', 'chores') then new.kind else 'shopping' end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists shared_lists_guard on public.shared_lists;
create trigger shared_lists_guard before update on public.shared_lists for each row execute function public.shared_lists_guard();

drop function if exists public.create_shared_list(text, text);
create or replace function public.create_shared_list(p_name text, p_display_name text, p_kind text default 'shopping')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_who text := btrim(coalesce(p_display_name, ''));
  v_kind text := case when lower(btrim(coalesce(p_kind, ''))) = 'chores' then 'chores' else 'shopping' end;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if char_length(v_name) not between 1 and 40 then raise exception 'shared_bad_name' using errcode = 'P0001'; end if;
  if char_length(v_who) not between 1 and 24 then raise exception 'shared_bad_display_name' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext('shared_user:' || v_uid::text));
  if (select count(*) from public.shared_members where user_id = v_uid) >= 10 then
    raise exception 'shared_too_many_lists' using errcode = 'P0001';
  end if;
  insert into public.shared_lists (owner_id, name, kind) values (v_uid, v_name, v_kind) returning id into v_id;
  update public.shared_members set display_name = v_who where list_id = v_id and user_id = v_uid;
  return v_id;
end;
$$;

create or replace function public.set_shared_list_prefs(p_list_id uuid, p_kind text default null, p_members_can_invite boolean default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.shared_lists where id = p_list_id and owner_id = v_uid) then
    raise exception 'shared_not_owner' using errcode = '42501';
  end if;
  update public.shared_lists set
    kind = case when p_kind is null then kind when lower(btrim(p_kind)) = 'chores' then 'chores' else 'shopping' end,
    members_can_invite = coalesce(p_members_can_invite, members_can_invite)
  where id = p_list_id;
end;
$$;

create or replace function public.transfer_shared_list(p_list_id uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_new_owner is null or p_new_owner = v_uid then raise exception 'shared_bad_assignee' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.shared_lists where id = p_list_id and owner_id = v_uid) then
    raise exception 'shared_not_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.shared_members where list_id = p_list_id and user_id = p_new_owner) then
    raise exception 'shared_bad_assignee' using errcode = 'P0001';
  end if;
  perform set_config('app.shared_transfer', '1', true);
  update public.shared_lists set owner_id = p_new_owner where id = p_list_id;
end;
$$;

-- Многоразовый код: до 5 входов, 7 дней. Старые неистёкшие коды того же списка не сжигаются.
-- Владелец всегда; участник — если включено members_can_invite.
create or replace function public.create_invite(p_list_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_alpha constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_pos constant int[] := array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11];
  v_bytes bytea;
  v_code text;
  i int;
  v_owner boolean;
  v_can boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select owner_id = v_uid, members_can_invite into v_owner, v_can from public.shared_lists where id = p_list_id;
  if not found then raise exception 'shared_not_owner' using errcode = '42501'; end if;
  if not v_owner and not (v_can and exists (select 1 from public.shared_members where list_id = p_list_id and user_id = v_uid)) then
    raise exception 'shared_not_owner' using errcode = '42501';
  end if;
  delete from public.shared_invites where expires_at < now() or uses >= max_uses;
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_code := '';
    for i in 1..10 loop
      v_code := v_code || substr(v_alpha, (get_byte(v_bytes, v_pos[i]) % 32) + 1, 1);
    end loop;
    begin
      insert into public.shared_invites (code, list_id, created_by, expires_at, max_uses)
      values (v_code, p_list_id, v_uid, now() + interval '7 days', 5);
      exit;
    exception when unique_violation then
    end;
  end loop;
  return v_code;
end;
$$;

drop policy if exists "shared_invites: owner reads" on public.shared_invites;
drop policy if exists "shared_invites: owner creates" on public.shared_invites;
drop policy if exists "shared_invites: owner deletes" on public.shared_invites;
drop policy if exists "shared_invites: member reads" on public.shared_invites;
drop policy if exists "shared_invites: member creates" on public.shared_invites;
drop policy if exists "shared_invites: member deletes" on public.shared_invites;
create policy "shared_invites: member reads" on public.shared_invites for select to authenticated
  using (public.is_list_owner(list_id) or (
    public.is_list_member(list_id) and exists (
      select 1 from public.shared_lists l where l.id = list_id and l.members_can_invite
    )
  ));
create policy "shared_invites: member creates" on public.shared_invites for insert to authenticated
  with check (created_by = auth.uid() and (
    public.is_list_owner(list_id) or (
      public.is_list_member(list_id) and exists (
        select 1 from public.shared_lists l where l.id = list_id and l.members_can_invite
      )
    )
  ));
create policy "shared_invites: member deletes" on public.shared_invites for delete to authenticated
  using (public.is_list_owner(list_id));

revoke all on function public.create_shared_list(text, text, text), public.set_shared_list_prefs(uuid, text, boolean),
  public.transfer_shared_list(uuid, uuid), public.create_invite(uuid) from public, anon;
grant execute on function public.create_shared_list(text, text, text), public.set_shared_list_prefs(uuid, text, boolean),
  public.transfer_shared_list(uuid, uuid), public.create_invite(uuid) to authenticated;
revoke all on function public.shared_lists_guard() from public, anon, authenticated;
