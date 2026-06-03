-- Finding save/follow duplicate row cleanup
-- Run this in Supabase SQL Editor.
--
-- Purpose:
-- - Prevent "JSON object requested, multiple (or no) rows returned" from duplicate saved rows.
-- - Keep one oldest row per relationship.
-- - Add unique indexes used by frontend upsert(..., onConflict).

delete from public.saved_users a
using public.saved_users b
where a.ctid > b.ctid
  and a.user_id = b.user_id
  and a.target_profile_id = b.target_profile_id;

create unique index if not exists saved_users_user_target_profile_unique
  on public.saved_users(user_id, target_profile_id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_users'
      and column_name = 'target_user_id'
  ) then
    execute '
      delete from public.saved_users a
      using public.saved_users b
      where a.ctid > b.ctid
        and a.user_id = b.user_id
        and a.target_user_id = b.target_user_id
    ';

    execute '
      create unique index if not exists saved_users_user_target_user_unique
      on public.saved_users(user_id, target_user_id)
    ';
  end if;
end $$;

delete from public.saved_cards a
using public.saved_cards b
where a.ctid > b.ctid
  and a.user_id = b.user_id
  and a.card_id = b.card_id;

create unique index if not exists saved_cards_user_card_unique
  on public.saved_cards(user_id, card_id);

delete from public.saved_needs a
using public.saved_needs b
where a.ctid > b.ctid
  and a.user_id = b.user_id
  and a.need_id = b.need_id;

create unique index if not exists saved_needs_user_need_unique
  on public.saved_needs(user_id, need_id);

do $$
begin
  if to_regclass('public.saved_portfolio_items') is not null then
    execute '
      delete from public.saved_portfolio_items a
      using public.saved_portfolio_items b
      where a.ctid > b.ctid
        and a.user_id = b.user_id
        and a.portfolio_item_id = b.portfolio_item_id
    ';

    execute '
      create unique index if not exists saved_portfolio_items_user_item_unique
      on public.saved_portfolio_items(user_id, portfolio_item_id)
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.follows') is not null then
    execute '
      delete from public.follows a
      using public.follows b
      where a.ctid > b.ctid
        and a.follower_id = b.follower_id
        and a.target_profile_id = b.target_profile_id
    ';

    execute '
      create unique index if not exists follows_follower_target_profile_unique
      on public.follows(follower_id, target_profile_id)
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.connections') is not null then
    execute '
      delete from public.connections a
      using public.connections b
      where a.ctid > b.ctid
        and a.user_id = b.user_id
        and a.target_profile_id = b.target_profile_id
    ';

    execute '
      create unique index if not exists connections_user_target_profile_unique
      on public.connections(user_id, target_profile_id)
    ';
  end if;
end $$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "Admins can view all saved users" on public.saved_users;
create policy "Admins can view all saved users"
on public.saved_users for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can view all saved cards" on public.saved_cards;
create policy "Admins can view all saved cards"
on public.saved_cards for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can view all saved needs" on public.saved_needs;
create policy "Admins can view all saved needs"
on public.saved_needs for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

do $$
begin
  if to_regclass('public.saved_portfolio_items') is not null then
    execute '
      drop policy if exists "Admins can view all saved portfolio items"
      on public.saved_portfolio_items
    ';
    execute '
      create policy "Admins can view all saved portfolio items"
      on public.saved_portfolio_items for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.follows') is not null then
    execute '
      drop policy if exists "Admins can view all follows"
      on public.follows
    ';
    execute '
      create policy "Admins can view all follows"
      on public.follows for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.connections') is not null then
    execute '
      drop policy if exists "Admins can view all connections"
      on public.connections
    ';
    execute '
      create policy "Admins can view all connections"
      on public.connections for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.reports') is not null then
    execute '
      drop policy if exists "Admins can view all reports"
      on public.reports
    ';
    execute '
      create policy "Admins can view all reports"
      on public.reports for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocked_users') is not null then
    execute '
      drop policy if exists "Admins can view all blocks"
      on public.blocked_users
    ';
    execute '
      create policy "Admins can view all blocks"
      on public.blocked_users for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversation_ratings') is not null then
    execute '
      drop policy if exists "Admins can view all conversation ratings"
      on public.conversation_ratings
    ';
    execute '
      create policy "Admins can view all conversation ratings"
      on public.conversation_ratings for select
      to authenticated
      using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
    ';
  end if;
end $$;

grant select on public.admin_users to authenticated;

notify pgrst, 'reload schema';
