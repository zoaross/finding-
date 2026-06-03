-- Finding chat entry + rejection persistence
-- Run in Supabase SQL Editor.
--
-- The MVP currently uses public.matches as the conversation record:
--   matches.id = conversation_id used by the frontend
--   messages.match_id = matches.id
--
-- This migration makes "Not a match" durable and queryable.

alter table public.matches
  add column if not exists rejection_reason text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_matches_status_owner_updated
  on public.matches(participant_one_id, status, updated_at desc);

create index if not exists idx_matches_status_partner_profile_updated
  on public.matches(participant_two_profile_id, status, updated_at desc);

create index if not exists idx_matches_status_partner_auth_updated
  on public.matches(participant_two_id, status, updated_at desc);

-- Keep RLS update rights for both real participants and the need owner.
alter table public.matches enable row level security;

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
on public.matches for update
to authenticated
using (
  auth.uid() = participant_one_id
  or auth.uid() = participant_two_id
  or exists (
    select 1
    from public.needs n
    where n.id = matches.need_id
      and n.user_id = auth.uid()
  )
)
with check (
  auth.uid() = participant_one_id
  or auth.uid() = participant_two_id
  or exists (
    select 1
    from public.needs n
    where n.id = matches.need_id
      and n.user_id = auth.uid()
  )
);
