-- Finding real Supabase QA blocker fixes
-- Run this in Supabase SQL Editor.
--
-- Fixes:
-- 1. profiles.headline missing during profile save.
-- 2. conversation_ratings missing completion context columns.
-- 3. Refreshes PostgREST schema cache.

alter table public.profiles
  add column if not exists headline text;

alter table public.conversation_ratings
  add column if not exists need_id uuid references public.needs(id) on delete set null,
  add column if not exists partner_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists success_tags text[] not null default '{}';

create index if not exists idx_conversation_ratings_need
  on public.conversation_ratings(need_id, created_at desc);

create index if not exists idx_conversation_ratings_partner_profile
  on public.conversation_ratings(partner_profile_id, created_at desc);

create index if not exists idx_conversation_ratings_completed
  on public.conversation_ratings(status, created_at desc)
  where status = 'completed';

alter table public.conversation_ratings enable row level security;

drop policy if exists "Users can view own conversation ratings" on public.conversation_ratings;
create policy "Users can view own conversation ratings"
on public.conversation_ratings
for select
to authenticated
using (
  auth.uid() = rater_id
  or exists (
    select 1
    from public.matches m
    where m.id::text = conversation_ratings.conversation_id
      and (
        m.participant_one_id = auth.uid()
        or m.participant_two_id = auth.uid()
        or exists (
          select 1
          from public.needs n
          where n.id = m.need_id
            and n.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can create own conversation ratings" on public.conversation_ratings;
create policy "Users can create own conversation ratings"
on public.conversation_ratings
for insert
to authenticated
with check (auth.uid() = rater_id);

drop policy if exists "Users can update own conversation ratings" on public.conversation_ratings;
create policy "Users can update own conversation ratings"
on public.conversation_ratings
for update
to authenticated
using (auth.uid() = rater_id)
with check (auth.uid() = rater_id);

alter table public.need_feedback enable row level security;

drop policy if exists "Users can manage own need feedback" on public.need_feedback;
create policy "Users can manage own need feedback"
on public.need_feedback
for all
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.needs n
    where n.id = need_feedback.need_id
      and n.user_id = auth.uid()
  )
)
with check (auth.uid() = user_id);

grant all on public.conversation_ratings to authenticated;
grant all on public.need_feedback to authenticated;

notify pgrst, 'reload schema';
