create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  avatar_emoji text default '😊',
  bio text,
  location text,
  language text,
  skills text[] not null default '{}',
  reputation_score numeric(3,1) not null default 5.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public read profiles" on public.profiles;
create policy "Public read profiles"
on public.profiles for select
using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

create table if not exists public.information_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Skill',
  summary text,
  details text,
  tags text[] not null default '{}',
  media_urls text[] not null default '{}',
  voice_intro_url text,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  reputation_score numeric(3,1) not null default 5.0,
  response_rate integer not null default 92,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_information_cards_user_created
  on public.information_cards(user_id, created_at desc);

alter table public.information_cards
  add column if not exists voice_intro_url text;

alter table public.information_cards enable row level security;

drop policy if exists "Public can view public information cards" on public.information_cards;
create policy "Public can view public information cards"
on public.information_cards for select
using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "Users can create own information cards" on public.information_cards;
create policy "Users can create own information cards"
on public.information_cards for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own information cards" on public.information_cards;
create policy "Users can update own information cards"
on public.information_cards for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own information cards" on public.information_cards;
create policy "Users can delete own information cards"
on public.information_cards for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists update_information_cards_updated_at on public.information_cards;
create trigger update_information_cards_updated_at
before update on public.information_cards
for each row execute function public.update_updated_at_column();

create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  status text not null default 'matching',
  is_archived boolean not null default false,
  parsed_intent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_needs_user_id_created_at on public.needs(user_id, created_at desc);
create index if not exists idx_needs_active_created_at on public.needs(is_archived, created_at desc);

alter table public.needs enable row level security;

drop policy if exists "Users can view active needs and own needs" on public.needs;
create policy "Users can view active needs and own needs"
on public.needs for select
using (is_archived = false or auth.uid() = user_id);

drop policy if exists "Users can create own needs" on public.needs;
create policy "Users can create own needs"
on public.needs for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own needs" on public.needs;
create policy "Users can update own needs"
on public.needs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own needs" on public.needs;
create policy "Users can delete own needs"
on public.needs for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists update_needs_updated_at on public.needs;
create trigger update_needs_updated_at
before update on public.needs
for each row execute function public.update_updated_at_column();

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  conversation_id text unique,
  need_id uuid references public.needs(id) on delete set null,
  participant_one_id uuid not null references auth.users(id) on delete cascade,
  participant_two_id uuid references auth.users(id) on delete cascade,
  partner_name text,
  match_tag text,
  status text not null default 'active',
  match_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_matches_participant_one on public.matches(participant_one_id);
create index if not exists idx_matches_participant_two on public.matches(participant_two_id);

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
with check (auth.uid() = participant_one_id);

drop policy if exists "Users can update own matches" on public.matches;
create policy "Users can update own matches"
on public.matches for update
to authenticated
using (auth.uid() = participant_one_id or auth.uid() = participant_two_id)
with check (auth.uid() = participant_one_id or auth.uid() = participant_two_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_match_created_at on public.messages(match_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "Users can view messages in own matches" on public.messages;
create policy "Users can view messages in own matches"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.participant_one_id = auth.uid() or m.participant_two_id = auth.uid())
  )
);

drop policy if exists "Users can send messages in own matches" on public.messages;
create policy "Users can send messages in own matches"
on public.messages for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.matches m
    where m.id = messages.match_id
      and (m.participant_one_id = auth.uid() or m.participant_two_id = auth.uid())
  )
);

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid references public.needs(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, need_id),
  unique (user_id, profile_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "Users can manage own bookmarks" on public.bookmarks;
create policy "Users can manage own bookmarks"
on public.bookmarks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.conversation_ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  partner_name text,
  match_tag text,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback text,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rater_id, conversation_id)
);

alter table public.conversation_ratings enable row level security;

drop policy if exists "Users can manage own conversation ratings" on public.conversation_ratings;
create policy "Users can manage own conversation ratings"
on public.conversation_ratings for all
to authenticated
using (auth.uid() = rater_id)
with check (auth.uid() = rater_id);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('card-media', 'card-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Card media is publicly readable" on storage.objects;
create policy "Card media is publicly readable"
on storage.objects for select
using (bucket_id = 'card-media');

drop policy if exists "Users can upload own card media" on storage.objects;
create policy "Users can upload own card media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own card media" on storage.objects;
create policy "Users can update own card media"
on storage.objects for update
to authenticated
using (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own card media" on storage.objects;
create policy "Users can delete own card media"
on storage.objects for delete
to authenticated
using (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);
