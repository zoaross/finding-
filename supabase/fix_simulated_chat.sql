-- Finding MVP simulated chat repair
-- Run after supabase/fix_public_needs.sql and supabase/fix_mvp_core.sql.
--
-- Goal:
-- - real logged-in users remain tied to auth.uid()
-- - simulated users can exist as public.profiles rows only
-- - conversations can target simulated profiles without requiring auth.users rows
-- - real users can send messages and receive simulated replies in their own chats only

create extension if not exists pgcrypto;

-- Profiles are the social identity layer. Real users usually have id = auth.uid().
-- Simulated users are profile rows with is_simulated = true and do not need auth.users.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add column if not exists is_simulated boolean not null default false,
  add column if not exists display_name text;

-- Make sure existing real auth-owned records have profile identities before
-- we move child-table foreign keys from auth.users to public.profiles.
insert into public.profiles (id, username, is_simulated, created_at, updated_at)
select distinct u.id, coalesce(split_part(u.email, '@', 1), 'finding_user'), false, now(), now()
from auth.users u
where u.id in (
  select user_id from public.information_cards
  union
  select user_id from public.needs
  union
  select participant_one_id from public.matches
  union
  select participant_two_id from public.matches where participant_two_id is not null
  union
  select sender_id from public.messages
)
on conflict (id) do nothing;

create index if not exists idx_profiles_username_lower
  on public.profiles(lower(username))
  where username is not null;

-- Supply cards and demand posts belong to profiles. Real user write access is
-- still protected by auth.uid() = user_id in RLS policies.
alter table public.information_cards
  drop constraint if exists information_cards_user_id_fkey;

alter table public.information_cards
  drop constraint if exists information_cards_user_id_profiles_fkey;

alter table public.information_cards
  add constraint information_cards_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade
  not valid;

alter table public.information_cards
  validate constraint information_cards_user_id_profiles_fkey;

alter table public.needs
  drop constraint if exists needs_user_id_fkey;

alter table public.needs
  drop constraint if exists needs_user_id_profiles_fkey;

alter table public.needs
  add constraint needs_user_id_profiles_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade
  not valid;

alter table public.needs
  validate constraint needs_user_id_profiles_fkey;

-- Conversations keep participant_one_id as the authenticated owner/initiator.
-- participant_two_profile_id is the social profile being chatted with.
alter table public.matches
  drop constraint if exists matches_participant_two_id_fkey;

alter table public.matches
  add column if not exists participant_two_profile_id uuid references public.profiles(id) on delete cascade;

update public.matches
set participant_two_profile_id = participant_two_id
where participant_two_profile_id is null
  and participant_two_id is not null;

create index if not exists idx_matches_participant_two_profile
  on public.matches(participant_two_profile_id);

-- Messages use sender_id as a profile id. For real users this is auth.uid();
-- for simulated replies this is the simulated profile id.
alter table public.messages
  drop constraint if exists messages_sender_id_fkey;

alter table public.messages
  drop constraint if exists messages_sender_id_profiles_fkey;

alter table public.messages
  add constraint messages_sender_id_profiles_fkey
  foreign key (sender_id) references public.profiles(id) on delete cascade
  not valid;

alter table public.messages
  validate constraint messages_sender_id_profiles_fkey;

-- RLS: profiles remain publicly readable. Only real users can create/update their
-- own non-simulated profile from the app.
alter table public.profiles enable row level security;

drop policy if exists "Public can view profiles" on public.profiles;
create policy "Public can view profiles"
on public.profiles for select
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id and is_simulated = false);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id and is_simulated = false)
with check (auth.uid() = id and is_simulated = false);

alter table public.matches enable row level security;

drop policy if exists "Users can view own matches" on public.matches;
create policy "Users can view own matches"
on public.matches for select
to authenticated
using (auth.uid() = participant_one_id or auth.uid() = participant_two_id);

drop policy if exists "Users can create own matches" on public.matches;
create policy "Users can create own matches"
on public.matches for insert
to authenticated
with check (
  auth.uid() = participant_one_id
  and participant_two_profile_id is not null
  and exists (
    select 1
    from public.profiles p
    where p.id = participant_two_profile_id
  )
);

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
on public.matches for update
to authenticated
using (auth.uid() = participant_one_id or auth.uid() = participant_two_id)
with check (auth.uid() = participant_one_id or auth.uid() = participant_two_id);

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
      and (m.participant_one_id = auth.uid() or m.participant_two_id = auth.uid())
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
      and (m.participant_one_id = auth.uid() or m.participant_two_id = auth.uid())
      and (
        messages.sender_id = auth.uid()
        or (
          messages.sender_id = m.participant_two_profile_id
          and exists (
            select 1
            from public.profiles p
            where p.id = messages.sender_id
              and p.is_simulated = true
          )
        )
      )
  )
);

-- Minimal simulated users for immediate manual testing. The larger
-- supabase/seed_ai_simulation.sql file can still be run afterward.
insert into public.profiles (
  id,
  username,
  display_name,
  avatar_url,
  avatar_emoji,
  bio,
  location,
  language,
  skills,
  reputation_score,
  is_simulated,
  created_at,
  updated_at
)
values
(
  '10000000-0000-0000-0000-000000000001',
  'hana_seoul',
  'Hana Park',
  'https://api.dicebear.com/8.x/personas/svg?seed=hana-seoul',
  '🗣️',
  'Seoul-based IELTS speaking partner and Korean tutor. Warm, structured, and good at helping shy speakers practice.',
  'Seoul, Korea',
  'Korean native · English fluent',
  array['IELTS speaking','Korean tutoring','study accountability'],
  4.9,
  true,
  now() - interval '2 hours',
  now()
),
(
  '10000000-0000-0000-0000-000000000002',
  'minjun_backend',
  'Minjun Kim',
  'https://api.dicebear.com/8.x/personas/svg?seed=minjun-backend',
  '🛠️',
  'Backend engineer building social products and realtime systems with Node, Postgres, and Supabase.',
  'Seoul, Korea',
  'Korean native · English fluent',
  array['Backend','Node.js','Postgres','Supabase'],
  4.8,
  true,
  now() - interval '4 hours',
  now()
),
(
  '10000000-0000-0000-0000-000000000004',
  'yui_designs',
  'Yui Nakamura',
  'https://api.dicebear.com/8.x/personas/svg?seed=yui-designs',
  '🎨',
  'Product designer focused on calm, expressive social tools, public profiles, and messaging surfaces.',
  'Tokyo, Japan',
  'Japanese native · English fluent',
  array['Product design','UI/UX','Figma','Prototyping'],
  4.9,
  true,
  now() - interval '7 hours',
  now()
)
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  avatar_emoji = excluded.avatar_emoji,
  bio = excluded.bio,
  location = excluded.location,
  language = excluded.language,
  skills = excluded.skills,
  reputation_score = excluded.reputation_score,
  is_simulated = true,
  updated_at = now();

insert into public.information_cards (
  user_id,
  title,
  category,
  summary,
  details,
  tags,
  media_urls,
  visibility,
  reputation_score,
  response_rate
)
values
(
  '10000000-0000-0000-0000-000000000001',
  'IELTS speaking partner in Korea',
  'Skill',
  'Structured speaking practice for IELTS learners in Korea-friendly time zones.',
  'I help learners practice part 1, part 2, and part 3 answers with gentle correction and confidence-building feedback.',
  array['IELTS','English speaking','Korea'],
  array['https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200'],
  'public',
  4.9,
  96
),
(
  '10000000-0000-0000-0000-000000000002',
  'Backend developer for social prototypes',
  'Skill',
  'Node, Postgres, Supabase, realtime messaging, and practical MVP architecture.',
  'I can help turn a product loop into working data models, RLS policies, and reliable API behavior.',
  array['Backend','Supabase','Realtime'],
  array['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200'],
  'public',
  4.8,
  94
),
(
  '10000000-0000-0000-0000-000000000004',
  'Product designer for social apps',
  'Skill',
  'Profile, card, and DM interaction design for modern social products.',
  'I design interaction systems that feel alive, not like dashboards.',
  array['UI/UX','Figma','Social design'],
  array['https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200'],
  'public',
  4.9,
  97
)
on conflict do nothing;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant all on public.profiles to authenticated;
grant all on public.information_cards to authenticated;
grant select on public.information_cards to anon, authenticated;
grant all on public.matches to authenticated;
grant all on public.messages to authenticated;

notify pgrst, 'reload schema';
