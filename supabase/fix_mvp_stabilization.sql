-- Finding MVP stabilization
-- Run this in Supabase SQL Editor before final MVP QA.
--
-- Adds:
-- - profile country/city and 18+ fields
-- - profile creation support from auth signup metadata
-- - real portfolio media table
-- - portfolio storage bucket + RLS policies

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

alter table public.profiles
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists birth_date date,
  add column if not exists is_adult_verified boolean not null default false;

update public.profiles
set is_adult_verified = true
where birth_date is not null
  and birth_date <= (current_date - interval '18 years');

create or replace function public.finding_handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_birth_date text;
  parsed_birth_date date;
begin
  raw_birth_date := new.raw_user_meta_data ->> 'birth_date';

  if raw_birth_date is not null and raw_birth_date ~ '^\d{4}-\d{2}-\d{2}$' then
    parsed_birth_date := raw_birth_date::date;
  else
    parsed_birth_date := null;
  end if;

  insert into public.profiles (
    id,
    username,
    avatar_url,
    bio,
    country,
    city,
    birth_date,
    is_adult_verified,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'bio',
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'city',
    parsed_birth_date,
    coalesce((new.raw_user_meta_data ->> 'is_adult_verified')::boolean, false)
      and parsed_birth_date is not null
      and parsed_birth_date <= (current_date - interval '18 years'),
    now()
  )
  on conflict (id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    bio = coalesce(public.profiles.bio, excluded.bio),
    country = coalesce(public.profiles.country, excluded.country),
    city = coalesce(public.profiles.city, excluded.city),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    is_adult_verified = public.profiles.is_adult_verified or excluded.is_adult_verified,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists finding_on_auth_user_created_profile on auth.users;
create trigger finding_on_auth_user_created_profile
after insert on auth.users
for each row execute function public.finding_handle_new_user_profile();

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_portfolio_items_user_order
on public.portfolio_items(user_id, sort_order asc, created_at desc);

alter table public.portfolio_items enable row level security;

drop policy if exists "Portfolio is publicly readable" on public.portfolio_items;
create policy "Portfolio is publicly readable"
on public.portfolio_items for select
to authenticated
using (true);

drop policy if exists "Users can insert own portfolio" on public.portfolio_items;
create policy "Users can insert own portfolio"
on public.portfolio_items for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own portfolio" on public.portfolio_items;
create policy "Users can update own portfolio"
on public.portfolio_items for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own portfolio" on public.portfolio_items;
create policy "Users can delete own portfolio"
on public.portfolio_items for delete
to authenticated
using (auth.uid() = user_id);

drop trigger if exists update_portfolio_items_updated_at on public.portfolio_items;
create trigger update_portfolio_items_updated_at
before update on public.portfolio_items
for each row execute function public.update_updated_at_column();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Portfolio media public read" on storage.objects;
create policy "Portfolio media public read"
on storage.objects for select
to public
using (bucket_id = 'portfolio-media');

drop policy if exists "Users upload own portfolio media" on storage.objects;
create policy "Users upload own portfolio media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users update own portfolio media" on storage.objects;
create policy "Users update own portfolio media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users delete own portfolio media" on storage.objects;
create policy "Users delete own portfolio media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'portfolio-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

grant all on public.portfolio_items to authenticated;

notify pgrst, 'reload schema';
