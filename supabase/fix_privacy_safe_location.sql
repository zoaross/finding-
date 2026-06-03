-- Finding privacy-safe location support
-- Run in Supabase SQL Editor before testing nearby matching.
--
-- Rules:
-- - Browser location is requested only after the user clicks enable.
-- - Exact coordinates are never stored.
-- - latitude_rounded / longitude_rounded store approximate rounded values only.
-- - Public surfaces should display city/country/region text, not coordinates.

alter table public.profiles
  add column if not exists region text,
  add column if not exists latitude_rounded numeric(6, 2),
  add column if not exists longitude_rounded numeric(6, 2),
  add column if not exists location_accuracy_meters integer,
  add column if not exists show_region boolean not null default true;

update public.profiles
set show_region = true
where show_region is null;

create index if not exists idx_profiles_country_city
  on public.profiles(country, city);

create index if not exists idx_profiles_region
  on public.profiles(region);

create index if not exists idx_profiles_rounded_location
  on public.profiles(latitude_rounded, longitude_rounded)
  where latitude_rounded is not null and longitude_rounded is not null;

notify pgrst, 'reload schema';
