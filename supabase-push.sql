create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  tz         text        not null default 'UTC',
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions: read own"   on public.push_subscriptions;
drop policy if exists "push_subscriptions: insert own" on public.push_subscriptions;
drop policy if exists "push_subscriptions: update own" on public.push_subscriptions;
drop policy if exists "push_subscriptions: delete own" on public.push_subscriptions;

create policy "push_subscriptions: read own"   on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions: insert own" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions: update own" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions: delete own" on public.push_subscriptions for delete using (auth.uid() = user_id);

create table if not exists public.push_log (
  user_id  uuid not null references auth.users (id) on delete cascade,
  habit_id text not null,
  day      date not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, habit_id, day)
);

alter table public.push_log enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;
