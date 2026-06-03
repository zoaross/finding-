-- Finding light/dark theme preference
-- Run in Supabase SQL Editor.
--
-- Theme is stored as user_settings.appearance_settings->>'theme'.
-- Valid app values are "dark" and "light"; frontend sanitizes invalid values to "dark".

alter table public.user_settings
  add column if not exists appearance_settings jsonb not null default '{}'::jsonb;

update public.user_settings
set appearance_settings = jsonb_set(
  coalesce(appearance_settings, '{}'::jsonb),
  '{theme}',
  to_jsonb(
    case
      when appearance_settings->>'theme' in ('dark', 'light') then appearance_settings->>'theme'
      else 'dark'
    end
  ),
  true
);

notify pgrst, 'reload schema';
