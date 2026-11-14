-- Общие списки, обновление 3: заголовки, подзаголовки, подпункты и свой порядок строк, как в «Заметках».
-- Выполнить один раз после supabase-shared-lists-2.sql: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Повторный запуск безопасен. После этого выполните supabase-shared-lists-3-test.sql.
-- Пока файл не выполнен, приложение показывает общие списки по-старому, новые возможности скрыты.
-- Уже заданные разделы превращаются в подзаголовки, пункты встают под них. Ничего не удаляется.

alter table public.shared_items add column if not exists kind text not null default 'item';
alter table public.shared_items add column if not exists pos double precision;
alter table public.shared_items add column if not exists indent smallint not null default 0;
do $$ begin
  alter table public.shared_items add constraint shared_items_kind_ok check (kind in ('item', 'h1', 'h2'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.shared_items add constraint shared_items_indent_ok check (indent between 0 and 1);
exception when duplicate_object then null; end $$;
create index if not exists shared_items_pos_idx on public.shared_items (list_id, pos);

-- Порядок строк для уже существующих списков: сначала пункты без раздела, затем разделы по алфавиту,
-- каждый раздел становится подзаголовком. Защитный триггер на время переноса выключен,
-- чтобы у старых пунктов не поменялось время изменения.
alter table public.shared_items disable trigger shared_items_guard;
do $$
declare lst record; r record; p double precision; cur text; owner uuid;
begin
  for lst in select distinct list_id from public.shared_items where pos is null loop
    select coalesce(max(pos), 0) into p from public.shared_items where list_id = lst.list_id and pos is not null;
    select owner_id into owner from public.shared_lists where id = lst.list_id;
    cur := null;
    for r in select id, section from public.shared_items where list_id = lst.list_id and pos is null
             order by (section is not null), lower(section), created_at, id loop
      if r.section is not null and r.section is distinct from cur then
        p := p + 1024;
        insert into public.shared_items (list_id, text, kind, pos, created_by, created_at, updated_at)
          values (lst.list_id, r.section, 'h2', p, owner, now(), now());
        cur := r.section;
      end if;
      p := p + 1024;
      update public.shared_items set pos = p, section = null where id = r.id;
    end loop;
  end loop;
end $$;
alter table public.shared_items enable trigger shared_items_guard;

-- Заголовок нельзя отметить, назначить или сдвинуть в подпункт. Вид строки после создания не меняется.
-- Строка без места в списке встаёт в конец — так пункты из старых версий приложения не теряются.
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
    new.kind := coalesce(new.kind, 'item');
    new.created_at := now();
    new.updated_at := now();
    if new.pos is null then
      select coalesce(max(pos), 0) + 1024 into new.pos from public.shared_items where list_id = new.list_id;
    end if;
    if new.kind <> 'item' then new.done := false; new.assigned_to := null; new.indent := 0; end if;
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
    if new.list_id <> old.list_id or new.id <> old.id or new.created_by is distinct from old.created_by or new.created_at <> old.created_at or new.kind <> old.kind then
      raise exception 'shared_readonly' using errcode = '42501';
    end if;
    new.text := btrim(new.text);
    new.section := nullif(btrim(coalesce(new.section, '')), '');
    new.updated_at := now();
    if new.pos is null then new.pos := old.pos; end if;
    if new.kind <> 'item' then new.done := false; new.assigned_to := null; new.indent := 0; end if;
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
revoke all on function public.shared_items_guard() from public, anon, authenticated;
