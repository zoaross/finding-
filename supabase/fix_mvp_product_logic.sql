-- Finding MVP product-logic stabilization
-- Run this in Supabase SQL Editor after the previous MVP/chat/social migrations.
--
-- This migration aligns the database with the current MVP rules:
-- - Save is bookmark-only; Follow/Connect is no longer used by MVP UI.
-- - Needs have a clear lifecycle: open, paused, closed, matched, completed, failed.
-- - Closing a need stores close reason/feedback and does not mean completion.
-- - Portfolio items support deeper project context.
-- - Simulated profiles can participate safely in matches/messages.
-- - Match RLS allows the current user to create/read/update matches for their own needs.

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

-- -------------------------------------------------------------------------
-- Profiles / simulated users
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_simulated boolean not null default false,
  add column if not exists display_name text;

create index if not exists idx_profiles_username_lower
  on public.profiles(lower(username))
  where username is not null;

update public.profiles
set is_simulated = true
where username in (
  'hana_seoul',
  'minjun_backend',
  'yui_designs',
  'sora_frontend',
  'jiwoo_korean',
  'emma_english',
  'alex_ai_founder',
  'nari_marketing',
  'kenji_study',
  'mia_creator'
);

-- -------------------------------------------------------------------------
-- Need lifecycle
-- -------------------------------------------------------------------------
alter table public.needs
  add column if not exists status text not null default 'open',
  add column if not exists updated_at timestamptz not null default now();

alter table public.needs
  drop constraint if exists needs_status_check;

update public.needs
set status = case
  when status in ('open', 'active', 'matching') then 'open'
  when status in ('paused') then 'paused'
  when status in ('matched') then 'matched'
  when status in ('completed') then 'completed'
  when status in ('failed', 'unfinished') then 'failed'
  when status in ('closed', 'archived', 'done') then 'closed'
  when coalesce(is_archived, false) = true then 'closed'
  else 'open'
end;

alter table public.needs
  add constraint needs_status_check
  check (status in ('open', 'paused', 'closed', 'matched', 'completed', 'failed'));

create index if not exists idx_needs_user_status
  on public.needs(user_id, status, created_at desc);

drop trigger if exists update_needs_updated_at on public.needs;
create trigger update_needs_updated_at
before update on public.needs
for each row execute function public.update_updated_at_column();

create table if not exists public.need_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete cascade,
  event_type text not null default 'close' check (event_type in ('close', 'pause', 'complete', 'fail')),
  reason text not null,
  feedback text,
  created_at timestamptz not null default now()
);

create index if not exists idx_need_feedback_user
  on public.need_feedback(user_id, created_at desc);

create index if not exists idx_need_feedback_need
  on public.need_feedback(need_id, created_at desc);

alter table public.need_feedback enable row level security;

drop policy if exists "Users can manage own need feedback" on public.need_feedback;
create policy "Users can manage own need feedback"
on public.need_feedback for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.needs n
    where n.id = need_feedback.need_id
      and n.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.needs n
    where n.id = need_feedback.need_id
      and n.user_id = auth.uid()
  )
);

-- -------------------------------------------------------------------------
-- Portfolio depth
-- -------------------------------------------------------------------------
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_items
  add column if not exists year text,
  add column if not exists role text,
  add column if not exists project_background text,
  add column if not exists contribution text,
  add column if not exists outcome text,
  add column if not exists tools text[] not null default '{}'::text[],
  add column if not exists external_links text[] not null default '{}'::text[],
  add column if not exists media_urls text[] not null default '{}'::text[];

update public.portfolio_items
set media_urls = array[media_url]
where (media_urls is null or cardinality(media_urls) = 0)
  and media_url is not null
  and media_url <> '';

create index if not exists idx_portfolio_items_user_order
  on public.portfolio_items(user_id, sort_order, created_at desc);

alter table public.portfolio_items enable row level security;

drop policy if exists "Users can view public portfolio items" on public.portfolio_items;
create policy "Users can view public portfolio items"
on public.portfolio_items for select
using (true);

drop policy if exists "Users can create own portfolio items" on public.portfolio_items;
create policy "Users can create own portfolio items"
on public.portfolio_items for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own portfolio items" on public.portfolio_items;
create policy "Users can update own portfolio items"
on public.portfolio_items for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolio items" on public.portfolio_items;
create policy "Users can delete own portfolio items"
on public.portfolio_items for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists update_portfolio_items_updated_at on public.portfolio_items;
create trigger update_portfolio_items_updated_at
before update on public.portfolio_items
for each row execute function public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- Saved/bookmark source of truth
-- -------------------------------------------------------------------------
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

create table if not exists public.saved_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, portfolio_item_id)
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
alter table public.saved_portfolio_items enable row level security;
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

drop policy if exists "Users can manage own saved portfolio items" on public.saved_portfolio_items;
create policy "Users can manage own saved portfolio items"
on public.saved_portfolio_items for all
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

create index if not exists idx_saved_portfolio_items_user
  on public.saved_portfolio_items(user_id, created_at desc);

create index if not exists idx_saved_needs_user
  on public.saved_needs(user_id, created_at desc);

-- -------------------------------------------------------------------------
-- Matches/messages RLS for real user + simulated profile chats
-- -------------------------------------------------------------------------
alter table public.matches
  add column if not exists participant_two_profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists need_id uuid references public.needs(id) on delete set null,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

update public.matches
set participant_two_profile_id = participant_two_id
where participant_two_profile_id is null
  and participant_two_id is not null;

create index if not exists idx_matches_owner_updated
  on public.matches(participant_one_id, updated_at desc);

create index if not exists idx_matches_two_profile
  on public.matches(participant_two_profile_id, updated_at desc);

alter table public.matches enable row level security;

drop policy if exists "Users can view own matches" on public.matches;
create policy "Users can view own matches"
on public.matches for select
to authenticated
using (
  auth.uid() = participant_one_id
  or auth.uid() = participant_two_id
  or exists (
    select 1 from public.needs n
    where n.id = matches.need_id
      and n.user_id = auth.uid()
  )
);

drop policy if exists "Users can create own matches" on public.matches;
create policy "Users can create own matches"
on public.matches for insert
to authenticated
with check (
  auth.uid() = participant_one_id
  and participant_two_profile_id is not null
  and exists (
    select 1 from public.profiles p
    where p.id = participant_two_profile_id
  )
  and (
    need_id is null
    or exists (
      select 1 from public.needs n
      where n.id = need_id
        and n.user_id = auth.uid()
    )
    or exists (
      select 1 from public.needs n
      where n.id = need_id
        and coalesce(n.is_archived, false) = false
    )
  )
);

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
on public.matches for update
to authenticated
using (
  auth.uid() = participant_one_id
  or auth.uid() = participant_two_id
  or exists (
    select 1 from public.needs n
    where n.id = matches.need_id
      and n.user_id = auth.uid()
  )
)
with check (
  auth.uid() = participant_one_id
  or auth.uid() = participant_two_id
  or exists (
    select 1 from public.needs n
    where n.id = matches.need_id
      and n.user_id = auth.uid()
  )
);

drop trigger if exists update_matches_updated_at on public.matches;
create trigger update_matches_updated_at
before update on public.matches
for each row execute function public.update_updated_at_column();

alter table public.messages enable row level security;

drop policy if exists "Users can view messages in own matches" on public.messages;
create policy "Users can view messages in own matches"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.matches m
    where m.id = messages.match_id
      and (
        m.participant_one_id = auth.uid()
        or m.participant_two_id = auth.uid()
        or exists (
          select 1 from public.needs n
          where n.id = m.need_id
            and n.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can send messages in own matches" on public.messages;
create policy "Users can send messages in own matches"
on public.messages for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches m
    where m.id = messages.match_id
      and (
        m.participant_one_id = auth.uid()
        or m.participant_two_id = auth.uid()
        or exists (
          select 1 from public.needs n
          where n.id = m.need_id
            and n.user_id = auth.uid()
        )
      )
      and (
        messages.sender_id = auth.uid()
        or (
          messages.sender_id = m.participant_two_profile_id
          and exists (
            select 1 from public.profiles p
            where p.id = messages.sender_id
              and p.is_simulated = true
          )
        )
      )
  )
);

grant all on public.need_feedback to authenticated;
grant all on public.portfolio_items to authenticated;
grant all on public.saved_users to authenticated;
grant all on public.saved_cards to authenticated;
grant all on public.saved_portfolio_items to authenticated;
grant all on public.saved_needs to authenticated;
grant all on public.matches to authenticated;
grant all on public.messages to authenticated;

notify pgrst, 'reload schema';
