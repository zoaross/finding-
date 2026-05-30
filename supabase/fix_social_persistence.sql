-- Finding MVP social persistence repair
-- Run in Supabase SQL Editor after fix_mvp_core.sql and fix_simulated_chat.sql.
--
-- Adds real persistence for:
-- - app/user settings
-- - blocked users
-- - reports
-- - follows/connections
-- - saved users/cards/needs

create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_language text not null default 'zh' check (app_language in ('zh', 'en', 'ko')),
  translation_language text not null default 'zh' check (translation_language in ('zh', 'en', 'ko')),
  notification_settings jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  chat_settings jsonb not null default '{}'::jsonb,
  ai_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Users can manage own settings" on public.user_settings;
create policy "Users can manage own settings"
on public.user_settings for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists update_user_settings_updated_at on public.user_settings;
create trigger update_user_settings_updated_at
before update on public.user_settings
for each row execute function public.update_updated_at_column();

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_profile_id)
);

create index if not exists idx_blocked_users_blocker
on public.blocked_users(blocker_id, created_at desc);

create index if not exists idx_blocked_users_blocked_profile
on public.blocked_users(blocked_profile_id);

alter table public.blocked_users enable row level security;

drop policy if exists "Users can read relevant blocks" on public.blocked_users;
create policy "Users can read relevant blocks"
on public.blocked_users for select
to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_profile_id);

drop policy if exists "Users can block profiles" on public.blocked_users;
create policy "Users can block profiles"
on public.blocked_users for insert
to authenticated
with check (auth.uid() = blocker_id and blocked_profile_id <> auth.uid());

drop policy if exists "Users can unblock profiles" on public.blocked_users;
create policy "Users can unblock profiles"
on public.blocked_users for delete
to authenticated
using (auth.uid() = blocker_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_reporter
on public.reports(reporter_id, created_at desc);

create index if not exists idx_reports_target
on public.reports(target_profile_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can create own reports" on public.reports;
create policy "Users can create own reports"
on public.reports for insert
to authenticated
with check (auth.uid() = reporter_id and target_profile_id <> auth.uid());

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
on public.reports for select
to authenticated
using (auth.uid() = reporter_id);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'following' check (status in ('following', 'muted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (follower_id, target_profile_id)
);

create index if not exists idx_follows_follower
on public.follows(follower_id, created_at desc);

create index if not exists idx_follows_target
on public.follows(target_profile_id, created_at desc);

alter table public.follows enable row level security;

drop policy if exists "Users can manage own follows" on public.follows;
create policy "Users can manage own follows"
on public.follows for all
to authenticated
using (auth.uid() = follower_id)
with check (auth.uid() = follower_id and target_profile_id <> auth.uid());

drop trigger if exists update_follows_updated_at on public.follows;
create trigger update_follows_updated_at
before update on public.follows
for each row execute function public.update_updated_at_column();

create table if not exists public.saved_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, target_profile_id)
);

create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.information_cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create table if not exists public.saved_needs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, need_id)
);

alter table public.saved_users enable row level security;
alter table public.saved_cards enable row level security;
alter table public.saved_needs enable row level security;

drop policy if exists "Users can manage own saved users" on public.saved_users;
create policy "Users can manage own saved users"
on public.saved_users for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id and target_profile_id <> auth.uid());

drop policy if exists "Users can manage own saved cards" on public.saved_cards;
create policy "Users can manage own saved cards"
on public.saved_cards for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own saved needs" on public.saved_needs;
create policy "Users can manage own saved needs"
on public.saved_needs for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists idx_saved_users_user
on public.saved_users(user_id, created_at desc);

create index if not exists idx_saved_cards_user
on public.saved_cards(user_id, created_at desc);

create index if not exists idx_saved_needs_user
on public.saved_needs(user_id, created_at desc);

-- Keep the older bookmarks table in sync enough for existing Saved page code.
insert into public.saved_needs (user_id, need_id, created_at)
select user_id, need_id, created_at
from public.bookmarks
where need_id is not null
on conflict (user_id, need_id) do nothing;

insert into public.saved_users (user_id, target_profile_id, created_at)
select user_id, profile_id, created_at
from public.bookmarks
where profile_id is not null
on conflict (user_id, target_profile_id) do nothing;

grant all on public.user_settings to authenticated;
grant all on public.blocked_users to authenticated;
grant all on public.reports to authenticated;
grant all on public.follows to authenticated;
grant all on public.saved_users to authenticated;
grant all on public.saved_cards to authenticated;
grant all on public.saved_needs to authenticated;

notify pgrst, 'reload schema';
