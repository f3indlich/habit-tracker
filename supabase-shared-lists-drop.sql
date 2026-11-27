-- Удаление общих списков: таблицы, RPC, триггеры, политики.
-- Выполнить один раз в Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен (if exists).
-- После выполнения данные общих списков и приглашений безвозвратно удаляются.

drop trigger if exists shared_lists_guard on public.shared_lists;
drop trigger if exists shared_lists_owner_member on public.shared_lists;
drop trigger if exists shared_members_guard on public.shared_members;
drop trigger if exists shared_members_unassign on public.shared_members;
drop trigger if exists shared_items_guard on public.shared_items;

drop function if exists public.create_shared_list(text, text, text);
drop function if exists public.create_shared_list(text, text);
drop function if exists public.set_shared_list_prefs(uuid, text, boolean);
drop function if exists public.transfer_shared_list(uuid, uuid);
drop function if exists public.create_invite(uuid);
drop function if exists public.join_shared_list(text, text);
drop function if exists public.leave_shared_list(uuid);
drop function if exists public.remove_shared_member(uuid, uuid);
drop function if exists public.shared_lists_guard();
drop function if exists public.shared_lists_owner_member();
drop function if exists public.shared_members_guard();
drop function if exists public.shared_members_unassign();
drop function if exists public.shared_items_guard();
drop function if exists public.is_list_member(uuid);
drop function if exists public.is_list_owner(uuid);

drop table if exists public.shared_join_log cascade;
drop table if exists public.shared_invites cascade;
drop table if exists public.shared_items cascade;
drop table if exists public.shared_members cascade;
drop table if exists public.shared_lists cascade;
