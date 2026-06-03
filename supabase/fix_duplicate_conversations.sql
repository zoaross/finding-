-- Finding duplicate conversation protection
-- Run in Supabase SQL Editor.
--
-- The MVP uses public.matches as the conversation record.
-- This keeps one active conversation per:
--   participant_one_id + participant_two_profile_id + need_id/direct

create extension if not exists pgcrypto;

alter table public.matches
  add column if not exists participant_two_profile_id uuid,
  add column if not exists conversation_id text,
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

update public.matches
set participant_two_profile_id = participant_two_id
where participant_two_profile_id is null
  and participant_two_id is not null;

-- Keep the newest active row for the same user + partner + source need.
with ranked as (
  select
    ctid,
    row_number() over (
      partition by
        participant_one_id,
        participant_two_profile_id,
        coalesce(need_id, '00000000-0000-0000-0000-000000000000'::uuid)
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.matches
  where participant_one_id is not null
    and participant_two_profile_id is not null
    and coalesce(status, 'active') not in ('rejected', 'closed', 'dismissed', 'completed')
)
delete from public.matches m
using ranked r
where m.ctid = r.ctid
  and r.rn > 1;

create unique index if not exists matches_unique_active_owner_partner_need
on public.matches (
  participant_one_id,
  participant_two_profile_id,
  coalesce(need_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where participant_one_id is not null
  and participant_two_profile_id is not null
  and coalesce(status, 'active') not in ('rejected', 'closed', 'dismissed', 'completed');

create unique index if not exists matches_conversation_id_unique
on public.matches(conversation_id)
where conversation_id is not null;

notify pgrst, 'reload schema';
