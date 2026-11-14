-- Общие списки, обновление 2: мгновенные обновления, назначение участнику, разделы, уведомления об изменениях.
-- Выполнить один раз после supabase-shared-lists.sql: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен. После этого выполните supabase-shared-lists-2-test.sql.
-- Пока файл не выполнен, приложение работает с общими списками по-старому, новые возможности скрыты.

alter table public.shared_items add column if not exists assigned_to uuid references auth.users on delete set null;
alter table public.shared_items add column if not exists assigned_by uuid references auth.users on delete set null;
alter table public.shared_items add column if not exists assigned_at timestamptz;
alter table public.shared_items add column if not exists section text;
do $$ begin
  alter table public.shared_items add constraint shared_items_section_len check (section is null or char_length(section) between 1 and 24);
exception when duplicate_object then null; end $$;

alter table public.shared_members add column if not exists notify boolean not null default false;
alter table public.shared_members add column if not exists notified_at timestamptz not null default now();

create index if not exists shared_items_created_idx on public.shared_items (list_id, created_at);
create index if not exists shared_items_assigned_idx on public.shared_items (assigned_to, assigned_at);
create index if not exists shared_members_notify_idx on public.shared_members (user_id) where notify;

-- Назначить можно только участнику этого списка. Кто и когда назначил, ставит сервер.
create or replace function public.shared_items_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform 1 from public.shared_lists where id = new.list_id for update;
    if (select count(*) from public.shared_items where list_id = new.list_id) >= 500 then
      raise exception 'shared_items_full' using errcode = 'P0001';
    end if;
    new.text := btrim(new.text);
    new.section := nullif(btrim(coalesce(new.section, '')), '');
    new.created_at := now();
    new.updated_at := now();
    if new.done then new.done_by := auth.uid(); new.done_at := now(); else new.done_by := null; new.done_at := null; end if;
    if new.assigned_to is not null then
      if not exists (select 1 from public.shared_members where list_id = new.list_id and user_id = new.assigned_to) then
        raise exception 'shared_bad_assignee' using errcode = 'P0001';
      end if;
      new.assigned_by := auth.uid(); new.assigned_at := now();
    else
      new.assigned_by := null; new.assigned_at := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if pg_trigger_depth() > 1 then return new; end if;
    if new.list_id <> old.list_id or new.id <> old.id or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.text := btrim(new.text);
    new.section := nullif(btrim(coalesce(new.section, '')), '');
    new.updated_at := now();
    if new.done and not old.done then new.done_by := auth.uid(); new.done_at := now();
    elsif not new.done then new.done_by := null; new.done_at := null;
    else new.done_by := old.done_by; new.done_at := old.done_at;
    end if;
    if new.assigned_to is distinct from old.assigned_to then
      if new.assigned_to is not null then
        if not exists (select 1 from public.shared_members where list_id = new.list_id and user_id = new.assigned_to) then
          raise exception 'shared_bad_assignee' using errcode = 'P0001';
        end if;
        new.assigned_by := auth.uid(); new.assigned_at := now();
      else
        new.assigned_by := null; new.assigned_at := null;
      end if;
    else
      new.assigned_by := old.assigned_by; new.assigned_at := old.assigned_at;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists shared_items_guard on public.shared_items;
create trigger shared_items_guard before insert or update on public.shared_items for each row execute function public.shared_items_guard();

-- Участник меняет у себя только имя и уведомления; отметку «уведомлён до» ставит сервер.
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
    new.notified_at := now();
  elsif tg_op = 'UPDATE' then
    if new.list_id <> old.list_id or new.user_id <> old.user_id or new.joined_at <> old.joined_at then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.display_name := btrim(new.display_name);
    if auth.uid() is not null then
      new.notified_at := case when new.notify and not old.notify then now() else old.notified_at end;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists shared_members_guard on public.shared_members;
create trigger shared_members_guard before insert or update on public.shared_members for each row execute function public.shared_members_guard();

-- Ушедший или убранный участник снимается со всех своих назначений в этом списке.
create or replace function public.shared_members_unassign()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.shared_items set assigned_to = null, assigned_by = null, assigned_at = null
  where list_id = old.list_id and assigned_to = old.user_id;
  return old;
end;
$$;
drop trigger if exists shared_members_unassign on public.shared_members;
create trigger shared_members_unassign after delete on public.shared_members for each row execute function public.shared_members_unassign();

revoke all on function public.shared_items_guard(), public.shared_members_guard(), public.shared_members_unassign() from public, anon, authenticated;

-- Мгновенные обновления: изменения в таблицах общих списков приходят открытым приложениям.
-- Чтение по-прежнему ограничено политиками: чужие записи и списки не приходят.
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['shared_items', 'shared_members', 'shared_lists'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
