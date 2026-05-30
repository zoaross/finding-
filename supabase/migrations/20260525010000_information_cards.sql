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

alter table public.information_cards enable row level security;

drop policy if exists "Public can view public information cards" on public.information_cards;
create policy "Public can view public information cards"
on public.information_cards
for select
using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "Users can create own information cards" on public.information_cards;
create policy "Users can create own information cards"
on public.information_cards
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own information cards" on public.information_cards;
create policy "Users can update own information cards"
on public.information_cards
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own information cards" on public.information_cards;
create policy "Users can delete own information cards"
on public.information_cards
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('card-media', 'card-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Card media is publicly readable" on storage.objects;
create policy "Card media is publicly readable"
on storage.objects
for select
using (bucket_id = 'card-media');

drop policy if exists "Users can upload own card media" on storage.objects;
create policy "Users can upload own card media"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can update own card media" on storage.objects;
create policy "Users can update own card media"
on storage.objects
for update
to authenticated
using (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own card media" on storage.objects;
create policy "Users can delete own card media"
on storage.objects
for delete
to authenticated
using (bucket_id = 'card-media' and auth.uid()::text = (storage.foldername(name))[1]);
