-- Finding Identity Card structure upgrade
-- Run in Supabase SQL Editor before testing the upgraded Identity Card editor.
--
-- Cards remain supply, not needs. All new fields are optional.

alter table public.information_cards
  add column if not exists supply_skills text[] not null default '{}'::text[],
  add column if not exists supply_languages text[] not null default '{}'::text[],
  add column if not exists supply_country text,
  add column if not exists supply_city text,
  add column if not exists offer_summary text,
  add column if not exists connection_preferences text,
  add column if not exists education text,
  add column if not exists projects text,
  add column if not exists work_experience text,
  add column if not exists places_lived text[] not null default '{}'::text[],
  add column if not exists proof_links text[] not null default '{}'::text[],
  add column if not exists proof_note text;

update public.information_cards
set
  supply_skills = case
    when cardinality(supply_skills) = 0 and title is not null then array[title]
    else supply_skills
  end,
  offer_summary = coalesce(offer_summary, summary)
where true;

create index if not exists idx_information_cards_supply_skills
  on public.information_cards using gin(supply_skills);

create index if not exists idx_information_cards_supply_languages
  on public.information_cards using gin(supply_languages);

delete from public.saved_cards a
using public.saved_cards b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.card_id = b.card_id;

create unique index if not exists saved_cards_user_card_unique
  on public.saved_cards(user_id, card_id);

notify pgrst, 'reload schema';
