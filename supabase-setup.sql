create table if not exists public.habit_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  version    bigint      not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.habit_data enable row level security;

drop policy if exists "habit_data: read own"   on public.habit_data;
drop policy if exists "habit_data: insert own" on public.habit_data;
drop policy if exists "habit_data: update own" on public.habit_data;
drop policy if exists "habit_data: delete own" on public.habit_data;

create policy "habit_data: read own"   on public.habit_data for select using (auth.uid() = user_id);
create policy "habit_data: insert own" on public.habit_data for insert with check (auth.uid() = user_id);
create policy "habit_data: update own" on public.habit_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_data: delete own" on public.habit_data for delete using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.habit_data;
exception when duplicate_object then null;
end $$;
