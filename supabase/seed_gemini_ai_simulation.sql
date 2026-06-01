-- Finding AI simulation seed
-- Run this in Supabase SQL Editor after:
-- 1. fix_mvp_core.sql
-- 2. fix_social_persistence.sql
-- 3. fix_mvp_product_logic.sql
-- 4. fix_identity_cards_structure.sql
--
-- This creates 50 realistic simulated users with profiles, identity cards,
-- portfolio items, needs, saved items, sample matches/messages, reports,
-- blocks, settings, and need lifecycle feedback.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists is_simulated boolean not null default false,
  add column if not exists display_name text;

alter table public.information_cards
  add column if not exists supply_skills text[] not null default '{}'::text[],
  add column if not exists supply_languages text[] not null default '{}'::text[],
  add column if not exists supply_country text,
  add column if not exists supply_city text,
  add column if not exists offer_summary text,
  add column if not exists education text,
  add column if not exists projects text,
  add column if not exists work_experience text,
  add column if not exists places_lived text[] not null default '{}'::text[],
  add column if not exists proof_links text[] not null default '{}'::text[],
  add column if not exists proof_note text;

create table if not exists public.need_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete cascade,
  event_type text not null default 'close' check (event_type in ('close', 'pause', 'complete', 'fail')),
  reason text not null,
  feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  year text,
  role text,
  project_background text,
  contribution text,
  outcome text,
  tools text[] not null default '{}'::text[],
  external_links text[] not null default '{}'::text[],
  media_urls text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.saved_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, portfolio_item_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_profile_id)
);

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

alter table public.matches
  add column if not exists participant_two_profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists need_id uuid references public.needs(id) on delete set null,
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
  else 'open'
end;

alter table public.needs
  alter column status set default 'open',
  add constraint needs_status_check
  check (status in ('open', 'paused', 'closed', 'matched', 'completed', 'failed'));

insert into storage.buckets (id, name, public)
values
  ('card-media', 'card-media', true),
  ('portfolio-media', 'portfolio-media', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop table if exists pg_temp.finding_ai_seed_users;
create temp table finding_ai_seed_users as
select
  i,
  ('11000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid as id,
  (array[
    'minjun_backend','seoha_ielts','yuna_product','jiho_frontend','haneul_korean',
    'liwei_ai','mei_ux','chen_backend','xiaoyu_study','rui_marketing',
    'emma_london','noah_fullstack','ava_creator','liam_product','olivia_english',
    'haru_design','ren_japanese','aoi_language','yuto_video','mika_artist',
    'sujin_data','doyun_music','nari_growth','taeho_founder','eunji_writer',
    'claire_designops','daniel_devrel','sophia_study','ethan_security','mia_brand',
    'jina_seoul','kai_gaming','arin_photo','joon_ai','hailey_research',
    'lucas_nomad','zoe_motion','mason_backend','ella_language','owen_startup',
    'hyeri_tutor','ming_translator','hana_portfolio','jay_typescript','sora_react',
    'ivy_ielts','leo_creator','nina_ui','kevin_cloud','rachel_collab'
  ])[i] as username,
  (array[
    'Kim Minjun','Park Seoha','Lee Yuna','Choi Jiho','Han Haneul',
    'Li Wei','Zhang Mei','Chen Yu','Lin Xiaoyu','Wang Rui',
    'Emma Carter','Noah Brooks','Ava Morgan','Liam Cooper','Olivia Reed',
    'Haru Sato','Ren Tanaka','Aoi Nakamura','Yuto Mori','Mika Ito',
    'Sujin Kang','Doyun Park','Nari Seo','Taeho Lim','Eunji Baek',
    'Claire Evans','Daniel Kim','Sophia Nguyen','Ethan Walsh','Mia Thompson',
    'Jina Moon','Kai Anderson','Arin Cho','Joon Chae','Hailey Wilson',
    'Lucas Martin','Zoe Bennett','Mason Lee','Ella Chen','Owen Scott',
    'Hyeri Song','Ming Zhao','Hana Kwon','Jay Park','Sora Jung',
    'Ivy Lin','Leo Brown','Nina Patel','Kevin Choi','Rachel Green'
  ])[i] as display_name,
  (array['Korea','Korea','Korea','Korea','Korea','China','China','China','China','China','UK','US','US','Canada','Australia','Japan','Japan','Japan','Japan','Japan'])[1 + ((i - 1) % 20)] as country,
  (array['Seoul','Busan','Incheon','Daegu','Daejeon','Shanghai','Beijing','Shenzhen','Hangzhou','Guangzhou','London','New York','Los Angeles','Toronto','Sydney','Tokyo','Osaka','Kyoto','Fukuoka','Yokohama'])[1 + ((i - 1) % 20)] as city,
  (array['Backend developer','IELTS speaking partner','Product designer','Frontend developer','Korean tutor','AI startup builder','UI/UX designer','Full-stack engineer','Study partner','Marketing student','English conversation partner','Creative collaborator'])[1 + ((i - 1) % 12)] as role,
  (array['Korean native · English fluent','Chinese native · English fluent','English native · Korean learning','Japanese native · English intermediate','Korean native · Chinese intermediate'])[1 + ((i - 1) % 5)] as language,
  (array['React','TypeScript','Korean tutoring','IELTS speaking','UI/UX','AI product','Backend APIs','Marketing','Photography','Video editing','Study systems','Emotional support'])[1 + ((i - 1) % 12)] as primary_skill,
  (array['🎧','🧑‍💻','🎨','📚','🌏','✨','🎙️','📷','🧪','🚀'])[1 + ((i - 1) % 10)] as avatar_emoji,
  (4.1 + ((i % 9)::numeric / 10))::numeric(3,1) as reputation_score
from generate_series(1, 50) as i;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  username || '@finding.test',
  crypt('FindingTest2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name, 'username', username, 'is_simulated', true),
  now() - (i || ' hours')::interval,
  now()
from finding_ai_seed_users
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (
  id, username, display_name, avatar_emoji, bio, location, language, skills,
  reputation_score, is_simulated, created_at, updated_at
)
select
  id,
  username,
  display_name,
  avatar_emoji,
  role || ' based in ' || city || '. I use Finding to meet people for collaboration, learning, language exchange, and creative work.',
  city || ', ' || country,
  language,
  array[primary_skill, role, 'cross-cultural collaboration'],
  reputation_score,
  true,
  now() - (i || ' hours')::interval,
  now()
from finding_ai_seed_users
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  avatar_emoji = excluded.avatar_emoji,
  bio = excluded.bio,
  location = excluded.location,
  language = excluded.language,
  skills = excluded.skills,
  reputation_score = excluded.reputation_score,
  is_simulated = true,
  updated_at = now();

insert into public.information_cards (
  user_id, title, category, summary, details, tags, supply_skills, supply_languages,
  supply_country, supply_city, offer_summary, education, projects, work_experience,
  places_lived, proof_links, proof_note, media_urls, voice_intro_url, visibility,
  reputation_score, response_rate, created_at, updated_at
)
select
  id,
  role || ' supply card',
  case when i % 4 = 0 then 'Language' when i % 4 = 1 then 'Skill' when i % 4 = 2 then 'Experience' else 'What I can offer' end,
  'I can help with ' || lower(primary_skill) || ', practical feedback, and friendly async collaboration.',
  'This card represents supply only: what this simulated user can provide to other people on Finding.',
  array[primary_skill, role, city],
  array[primary_skill, role],
  case
    when country = 'Korea' then array['ko:native','en:fluent']
    when country = 'China' then array['zh:native','en:fluent']
    when country = 'Japan' then array['ja:native','en:intermediate']
    else array['en:native','ko:learning']
  end,
  country,
  city,
  'Available for low-pressure collaboration, practice sessions, and intro calls when the match context feels right.',
  case when i % 3 = 0 then 'University project work and self-directed learning in ' || primary_skill else null end,
  'Built sample work around ' || primary_skill || ' and community collaboration.',
  case when i % 2 = 0 then '2+ years of hands-on experience in ' || lower(role) else 'Active learner and collaborator with recent project practice' end,
  array[city, country],
  array['https://finding.example/proof/' || username],
  'Simulated proof note for QA: media preview, save, profile, and chat flows should work.',
  array['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'],
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'public',
  reputation_score,
  78 + (i % 20),
  now() - (i || ' hours')::interval,
  now()
from finding_ai_seed_users
on conflict do nothing;

insert into public.portfolio_items (
  user_id, title, description, year, role, project_background, contribution,
  outcome, tools, external_links, media_url, media_urls, media_type, sort_order,
  created_at, updated_at
)
select
  id,
  primary_skill || ' collaboration sample',
  'A visual project sample used for AI simulation QA.',
  '2026',
  role,
  'A small cross-cultural project where people needed clear communication and practical execution.',
  'Personally handled ' || lower(primary_skill) || ', communication, and iteration with collaborators.',
  'Produced a concrete demo and helped reduce uncertainty before starting a conversation.',
  array[primary_skill, 'Finding', 'remote collaboration'],
  array['https://finding.example/portfolio/' || username],
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  array[
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80'
  ],
  'image',
  0,
  now() - (i || ' hours')::interval,
  now()
from finding_ai_seed_users
on conflict do nothing;

insert into public.needs (
  user_id, content, status, is_archived, parsed_intent, created_at, updated_at
)
select
  id,
  (array[
    'Need an IELTS speaking partner tonight for relaxed practice.',
    'Looking for a React developer to review an AI social app prototype.',
    'Want a Korean tutor who can explain casual conversation naturally.',
    'Need a designer to improve my portfolio story.',
    'Looking for a study partner who can keep me accountable this week.',
    'Want gaming friends who can speak English and Korean.',
    'Need feedback on a startup landing page before launch.',
    'Looking for a creative collaborator for a short video project.'
  ])[1 + ((i - 1) % 8)],
  case
    when i % 17 = 0 then 'failed'
    when i % 13 = 0 then 'completed'
    when i % 11 = 0 then 'closed'
    when i % 7 = 0 then 'matched'
    when i % 5 = 0 then 'paused'
    else 'open'
  end,
  case when i % 17 = 0 or i % 13 = 0 or i % 11 = 0 then true else false end,
  jsonb_build_object(
    'simulation', true,
    'source', 'gemini-ready-local-seed',
    'primary_skill', primary_skill,
    'region', city,
    'languages', language
  ),
  now() - ((i * 37) || ' minutes')::interval,
  now()
from finding_ai_seed_users
on conflict do nothing;

insert into public.matches (
  conversation_id, need_id, participant_one_id, participant_two_id,
  participant_two_profile_id, partner_name, match_tag, status, match_score,
  created_at, updated_at
)
select
  'sim:' || owner.username || ':' || target.username,
  (select n.id from public.needs n where n.user_id = owner.id order by n.created_at desc limit 1),
  owner.id,
  target.id,
  target.id,
  target.display_name,
  owner.primary_skill || ' ↔ ' || target.primary_skill,
  case when owner.i % 13 = 0 then 'completed' else 'active' end,
  72 + ((owner.i * 3) % 25),
  now() - ((owner.i * 19) || ' minutes')::interval,
  now()
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 9 - 1) % 50) + 1
where owner.i <= 30
on conflict (conversation_id) do update set
  need_id = excluded.need_id,
  participant_two_id = excluded.participant_two_id,
  participant_two_profile_id = excluded.participant_two_profile_id,
  partner_name = excluded.partner_name,
  match_tag = excluded.match_tag,
  status = excluded.status,
  match_score = excluded.match_score,
  updated_at = now();

insert into public.messages (match_id, sender_id, content, created_at)
select
  m.id,
  m.participant_one_id,
  'Hi, Finding matched us because your card seems relevant to my current need.',
  m.created_at + interval '1 minute'
from public.matches m
where m.conversation_id like 'sim:%'
on conflict do nothing;

insert into public.messages (match_id, sender_id, content, created_at)
select
  m.id,
  m.participant_two_profile_id,
  'Thanks for reaching out. I can help with this and can share a quick example from my card.',
  m.created_at + interval '3 minutes'
from public.matches m
where m.conversation_id like 'sim:%'
  and m.participant_two_profile_id is not null
on conflict do nothing;

insert into public.saved_users (user_id, target_profile_id, created_at)
select owner.id, target.id, now() - ((owner.i * 11) || ' minutes')::interval
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 5 - 1) % 50) + 1
where owner.i <= 20
on conflict (user_id, target_profile_id) do nothing;

insert into public.saved_needs (user_id, need_id, created_at)
select owner.id, n.id, now() - ((owner.i * 13) || ' minutes')::interval
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 14 - 1) % 50) + 1
join public.needs n on n.user_id = target.id
where owner.i <= 20
on conflict (user_id, need_id) do nothing;

insert into public.saved_cards (user_id, card_id, created_at)
select owner.id, c.id, now() - ((owner.i * 7) || ' minutes')::interval
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 18 - 1) % 50) + 1
join public.information_cards c on c.user_id = target.id
where owner.i <= 20
on conflict (user_id, card_id) do nothing;

insert into public.saved_portfolio_items (user_id, portfolio_item_id, created_at)
select owner.id, p.id, now() - ((owner.i * 9) || ' minutes')::interval
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 22 - 1) % 50) + 1
join public.portfolio_items p on p.user_id = target.id
where owner.i <= 20
on conflict (user_id, portfolio_item_id) do nothing;

insert into public.reports (reporter_id, target_profile_id, reason, note, status, created_at)
select owner.id, target.id, 'spam_or_low_quality', 'AI simulation report used to test moderation persistence.', 'open', now()
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 25 - 1) % 50) + 1
where owner.i in (3, 12, 27)
on conflict do nothing;

insert into public.blocked_users (blocker_id, blocked_profile_id, reason, created_at)
select owner.id, target.id, 'AI simulation block used to test recommendation/chat filtering.', now()
from finding_ai_seed_users owner
join finding_ai_seed_users target on target.i = ((owner.i + 30 - 1) % 50) + 1
where owner.i in (5, 18, 33)
on conflict (blocker_id, blocked_profile_id) do nothing;

insert into public.user_settings (
  user_id, app_language, translation_language, notification_settings,
  privacy_settings, chat_settings, ai_preferences, created_at, updated_at
)
select
  id,
  (array['zh','en','ko'])[1 + ((i - 1) % 3)],
  (array['en','ko','zh'])[1 + ((i - 1) % 3)],
  jsonb_build_object('messages', true, 'matches', true, 'weeklyDigest', i % 2 = 0),
  jsonb_build_object('publicProfile', true, 'showActivity', i % 4 <> 0),
  jsonb_build_object('allowDMs', true, 'autoTranslate', i % 3 <> 0),
  jsonb_build_object('matchTone', 'social', 'preferNearby', i % 2 = 0),
  now(),
  now()
from finding_ai_seed_users
on conflict (user_id) do update set
  app_language = excluded.app_language,
  translation_language = excluded.translation_language,
  notification_settings = excluded.notification_settings,
  privacy_settings = excluded.privacy_settings,
  chat_settings = excluded.chat_settings,
  ai_preferences = excluded.ai_preferences,
  updated_at = now();

insert into public.need_feedback (user_id, need_id, event_type, reason, feedback, created_at)
select
  n.user_id,
  n.id,
  case when n.status = 'completed' then 'complete' when n.status = 'failed' then 'fail' else 'close' end,
  case
    when n.status = 'completed' then 'already_found_someone'
    when n.status = 'failed' then 'matching_quality_bad'
    else 'temporarily_no_longer_needed'
  end,
  'AI simulation feedback for lifecycle QA.',
  now()
from public.needs n
join finding_ai_seed_users u on u.id = n.user_id
where n.status in ('closed', 'completed', 'failed')
on conflict do nothing;

grant select on public.profiles to anon, authenticated;
grant select on public.information_cards to anon, authenticated;
grant all on public.needs to authenticated;
grant all on public.matches to authenticated;
grant all on public.messages to authenticated;
grant all on public.portfolio_items to authenticated;
grant all on public.saved_users to authenticated;
grant all on public.saved_cards to authenticated;
grant all on public.saved_needs to authenticated;
grant all on public.saved_portfolio_items to authenticated;
grant all on public.reports to authenticated;
grant all on public.blocked_users to authenticated;
grant all on public.user_settings to authenticated;
grant all on public.need_feedback to authenticated;

notify pgrst, 'reload schema';

select
  (select count(*) from public.profiles where is_simulated = true) as simulated_profiles,
  (select count(*) from public.information_cards c join public.profiles p on p.id = c.user_id where p.is_simulated = true) as simulated_cards,
  (select count(*) from public.portfolio_items pi join public.profiles p on p.id = pi.user_id where p.is_simulated = true) as simulated_portfolio_items,
  (select count(*) from public.needs n join public.profiles p on p.id = n.user_id where p.is_simulated = true) as simulated_needs,
  (select count(*) from public.matches where conversation_id like 'sim:%') as simulated_conversations;
