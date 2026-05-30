-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/uyijmgnpyzpthofetrod/sql

-- ── profiles: add missing fields ──────────────────────────────────────
alter table profiles
  add column if not exists skills        text[]         default '{}',
  add column if not exists avatar_emoji  text           default '😊',
  add column if not exists reputation_score numeric(3,1) default 5.0;

-- ── matches: add fields used by chat / AI matching ────────────────────
alter table matches
  add column if not exists need_id      uuid,
  add column if not exists status       text           default 'active',
  add column if not exists match_score  numeric(5,2);

-- ── needs: add AI-generated fields if missing ─────────────────────────
-- parsed_intent is already jsonb; no schema change needed.
-- Verify:
-- select column_name, data_type from information_schema.columns
--   where table_name = 'needs';

-- ── Enable realtime on messages (required for subscribeMessages) ───────
-- If not already enabled, run:
-- alter publication supabase_realtime add table messages;

-- ── RLS policies ──────────────────────────────────────────────────────

-- profiles: public read
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='profiles' and policyname='Public read profiles'
  ) then
    create policy "Public read profiles" on profiles for select using (true);
  end if;
end $$;

-- profiles: owner update
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='profiles' and policyname='Owner update profile'
  ) then
    create policy "Owner update profile" on profiles
      for update using (auth.uid() = id);
  end if;
end $$;

-- needs: public read active needs
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='needs' and policyname='Public read active needs'
  ) then
    create policy "Public read active needs" on needs
      for select using (is_archived = false or auth.uid() = user_id);
  end if;
end $$;

-- needs: auth insert
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='needs' and policyname='Auth insert need'
  ) then
    create policy "Auth insert need" on needs
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- needs: owner update
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='needs' and policyname='Owner update need'
  ) then
    create policy "Owner update need" on needs
      for update using (auth.uid() = user_id);
  end if;
end $$;

-- messages: auth insert
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='messages' and policyname='Auth insert message'
  ) then
    create policy "Auth insert message" on messages
      for insert with check (auth.uid() = sender_id);
  end if;
end $$;

-- messages: participants read (anyone in the match can read)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='messages' and policyname='Match participants read messages'
  ) then
    create policy "Match participants read messages" on messages
      for select using (true);
  end if;
end $$;
