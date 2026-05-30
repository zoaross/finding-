create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

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

alter table public.needs
  add column if not exists user_id uuid,
  add column if not exists content text,
  add column if not exists status text default 'matching',
  add column if not exists is_archived boolean default false,
  add column if not exists parsed_intent jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.needs
  alter column user_id set not null,
  alter column content set not null,
  alter column status set default 'matching',
  alter column is_archived set default false,
  alter column parsed_intent set default '{}'::jsonb,
  alter column created_at set default now(),
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'needs'
      and constraint_name = 'needs_user_id_fkey'
  ) then
    alter table public.needs
      add constraint needs_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_needs_user_id_created_at
  on public.needs(user_id, created_at desc);

create index if not exists idx_needs_active_created_at
  on public.needs(is_archived, created_at desc);

alter table public.needs enable row level security;

drop policy if exists "Users can select own needs" on public.needs;
create policy "Users can select own needs"
on public.needs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own needs" on public.needs;
create policy "Users can insert own needs"
on public.needs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own needs" on public.needs;
create policy "Users can update own needs"
on public.needs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own needs" on public.needs;
create policy "Users can delete own needs"
on public.needs
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Authenticated users can view active needs" on public.needs;
create policy "Authenticated users can view active needs"
on public.needs
for select
to authenticated
using (is_archived = false);

drop trigger if exists update_needs_updated_at on public.needs;
create trigger update_needs_updated_at
before update on public.needs
for each row execute function public.update_updated_at_column();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.needs to authenticated;

notify pgrst, 'reload schema';
