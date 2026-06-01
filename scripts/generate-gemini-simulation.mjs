import { mkdir, readFile, writeFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key, rest.join("=").replace(/^['"]|['"]$/g, "")];
    }),
);

const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash";
const totalUsers = Number(process.env.GEMINI_SIM_USERS || env.GEMINI_SIM_USERS || 50);
const batchSize = Number(process.env.GEMINI_SIM_BATCH_SIZE || env.GEMINI_SIM_BATCH_SIZE || 10);

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in .env.local");
}

function buildPrompt(count, batchNumber) {
  return `
You are generating synthetic QA data for Finding, a real SNS/social app where AI connects human demand and human supply.

Return strict JSON only. No markdown. No comments.

Generate exactly ${count} simulated users for batch ${batchNumber}.

All usernames must be unique and include the batch number or a distinctive suffix.

Include Korean, Chinese, English-speaking, and Japanese users. Include designers, developers, students, language learners, creative collaborators, tutors, founders, marketers, and study partners.

Cards are SUPPLY only: what the person can offer. Needs are DEMAND: what the person currently wants.

Schema:
{
  "users": [
    {
      "username": "lowercase_unique_handle",
      "display_name": "Realistic name",
      "country": "Country",
      "city": "City",
      "avatar_emoji": "one emoji",
      "bio": "1-2 sentence social profile bio",
      "languages": ["ko:native", "en:fluent"],
      "skills": ["React", "Korean tutoring"],
      "role": "Frontend developer",
      "reputation_score": 4.7,
      "identity_card": {
        "title": "Supply card title",
        "category": "Skill|Language|Experience|What I can offer|Talent|Interest",
        "summary": "short supply summary",
        "details": "specific details about what this person can provide",
        "tags": ["tag1", "tag2"],
        "supply_skills": ["skill"],
        "supply_languages": ["ko:native"],
        "offer_summary": "what they can provide",
        "education": "optional education or null",
        "projects": "project proof",
        "work_experience": "work proof",
        "places_lived": ["Seoul"],
        "proof_links": ["https://finding.example/proof/username"],
        "proof_note": "short proof note"
      },
      "portfolio": {
        "title": "project title",
        "description": "short project description",
        "year": "2025 or 2026",
        "role": "their role",
        "project_background": "context",
        "contribution": "what they personally did",
        "outcome": "measurable or concrete result",
        "tools": ["Figma", "React"],
        "external_links": ["https://finding.example/portfolio/username"]
      },
      "need": {
        "content": "natural-language request, emotional and lightweight",
        "status": "open|paused|matched|closed|completed|failed",
        "feedback_reason": "already_found_someone|temporarily_no_longer_needed|matching_quality_bad|wrong_content|other_reason",
        "feedback": "short lifecycle feedback for closed/completed/failed, otherwise empty"
      }
    }
  ]
}
`.trim();
}

async function generateBatch(count, batchNumber) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(count, batchNumber) }] }],
        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n") ?? "";
  const parsed = JSON.parse(text);
  const batchUsers = Array.isArray(parsed.users) ? parsed.users.slice(0, count) : [];
  if (batchUsers.length !== count) {
    throw new Error(`Expected ${count} users from Gemini batch ${batchNumber}, got ${batchUsers.length}`);
  }
  return batchUsers;
}

const users = [];
for (let start = 0; start < totalUsers; start += batchSize) {
  const count = Math.min(batchSize, totalUsers - start);
  const batchNumber = Math.floor(start / batchSize) + 1;
  console.error(`Generating Gemini simulation batch ${batchNumber}: ${count} users...`);
  users.push(...(await generateBatch(count, batchNumber)));
}

function uuidFor(index) {
  return `22000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`;
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlArray(values) {
  const safe = Array.isArray(values) ? values.filter(Boolean).map(String) : [];
  if (!safe.length) return "'{}'::text[]";
  return `array[${safe.map(sqlString).join(", ")}]`;
}

function safeStatus(status) {
  return ["open", "paused", "closed", "matched", "completed", "failed"].includes(status)
    ? status
    : "open";
}

function safeScore(score, index) {
  const n = Number(score);
  if (Number.isFinite(n) && n >= 0 && n <= 5) return n.toFixed(1);
  return (4.1 + ((index % 8) / 10)).toFixed(1);
}

const values = users
  .map((user, index) => {
    const id = uuidFor(index);
    const username = String(user.username || `gemini_user_${index + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);
    return `(
  ${index + 1},
  '${id}'::uuid,
  ${sqlString(username)},
  ${sqlString(user.display_name || username)},
  ${sqlString(user.country || "Global")},
  ${sqlString(user.city || "Online")},
  ${sqlString(user.avatar_emoji || "✨")},
  ${sqlString(user.bio || "Finding simulated user for AI QA.")},
  ${sqlArray(user.languages)},
  ${sqlArray(user.skills)},
  ${sqlString(user.role || "Creative collaborator")},
  ${safeScore(user.reputation_score, index)},
  ${sqlString(user.identity_card?.title || `${user.role || "Supply"} card`)},
  ${sqlString(user.identity_card?.category || "Skill")},
  ${sqlString(user.identity_card?.summary || "I can help with practical collaboration.")},
  ${sqlString(user.identity_card?.details || "Supply-only identity card generated for QA.")},
  ${sqlArray(user.identity_card?.tags)},
  ${sqlArray(user.identity_card?.supply_skills || user.skills)},
  ${sqlArray(user.identity_card?.supply_languages || user.languages)},
  ${sqlString(user.identity_card?.offer_summary || "Available for friendly collaboration and feedback.")},
  ${sqlString(user.identity_card?.education)},
  ${sqlString(user.identity_card?.projects)},
  ${sqlString(user.identity_card?.work_experience)},
  ${sqlArray(user.identity_card?.places_lived)},
  ${sqlArray(user.identity_card?.proof_links || [`https://finding.example/proof/${username}`])},
  ${sqlString(user.identity_card?.proof_note || "AI-generated proof note for QA.")},
  ${sqlString(user.portfolio?.title || "Collaboration sample")},
  ${sqlString(user.portfolio?.description || "A project sample generated for QA.")},
  ${sqlString(user.portfolio?.year || "2026")},
  ${sqlString(user.portfolio?.role || user.role || "Contributor")},
  ${sqlString(user.portfolio?.project_background || "A realistic social collaboration project.")},
  ${sqlString(user.portfolio?.contribution || "Contributed planning, execution, and iteration.")},
  ${sqlString(user.portfolio?.outcome || "Created a concrete artifact for review.")},
  ${sqlArray(user.portfolio?.tools || user.skills)},
  ${sqlArray(user.portfolio?.external_links || [`https://finding.example/portfolio/${username}`])},
  ${sqlString(user.need?.content || "Looking for someone to collaborate with this week.")},
  ${sqlString(safeStatus(user.need?.status))},
  ${sqlString(user.need?.feedback_reason || "other_reason")},
  ${sqlString(user.need?.feedback || "")}
)`;
  })
  .join(",\n");

const sql = `-- Gemini-generated Finding AI simulation seed
-- Generated locally. API key is not included in this file.
-- Run in Supabase SQL Editor after the MVP schema migrations.

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

create table if not exists public.need_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  need_id uuid not null references public.needs(id) on delete cascade,
  event_type text not null default 'close' check (event_type in ('close', 'pause', 'complete', 'fail')),
  reason text not null,
  feedback text,
  created_at timestamptz not null default now()
);

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

drop table if exists pg_temp.finding_gemini_users;
create temp table finding_gemini_users (
  i integer,
  id uuid,
  username text,
  display_name text,
  country text,
  city text,
  avatar_emoji text,
  bio text,
  languages text[],
  skills text[],
  role text,
  reputation_score numeric(3,1),
  card_title text,
  card_category text,
  card_summary text,
  card_details text,
  card_tags text[],
  supply_skills text[],
  supply_languages text[],
  offer_summary text,
  education text,
  projects text,
  work_experience text,
  places_lived text[],
  proof_links text[],
  proof_note text,
  portfolio_title text,
  portfolio_description text,
  portfolio_year text,
  portfolio_role text,
  project_background text,
  contribution text,
  outcome text,
  tools text[],
  external_links text[],
  need_content text,
  need_status text,
  feedback_reason text,
  feedback text
);

insert into finding_gemini_users values
${values};

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  username || '@finding-gemini.test',
  crypt('FindingTest2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name, 'username', username, 'is_simulated', true),
  now() - (i || ' hours')::interval,
  now()
from finding_gemini_users
on conflict (id) do update set
  email = excluded.email,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (
  id, username, display_name, avatar_emoji, bio, location, language, skills,
  reputation_score, is_simulated, created_at, updated_at
)
select
  id, username, display_name, avatar_emoji, bio, city || ', ' || country,
  array_to_string(languages, ' · '), skills, reputation_score, true,
  now() - (i || ' hours')::interval, now()
from finding_gemini_users
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
  id, card_title, card_category, card_summary, card_details, card_tags,
  supply_skills, supply_languages, country, city, offer_summary, education,
  projects, work_experience, places_lived, proof_links, proof_note,
  array['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'],
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'public', reputation_score, 78 + (i % 20), now() - (i || ' hours')::interval, now()
from finding_gemini_users
on conflict do nothing;

insert into public.portfolio_items (
  user_id, title, description, year, role, project_background, contribution,
  outcome, tools, external_links, media_url, media_urls, media_type, sort_order,
  created_at, updated_at
)
select
  id, portfolio_title, portfolio_description, portfolio_year, portfolio_role,
  project_background, contribution, outcome, tools, external_links,
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  array[
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80'
  ],
  'image', 0, now() - (i || ' hours')::interval, now()
from finding_gemini_users
on conflict do nothing;

insert into public.needs (
  user_id, content, status, is_archived, parsed_intent, created_at, updated_at
)
select
  id, need_content, need_status,
  need_status in ('closed', 'completed', 'failed'),
  jsonb_build_object('simulation', true, 'source', 'gemini-api', 'city', city, 'skills', skills, 'languages', languages),
  now() - ((i * 37) || ' minutes')::interval, now()
from finding_gemini_users
on conflict do nothing;

insert into public.matches (
  conversation_id, need_id, participant_one_id, participant_two_id,
  participant_two_profile_id, partner_name, match_tag, status, match_score,
  created_at, updated_at
)
select
  'gemini:' || owner.username || ':' || target.username,
  (select n.id from public.needs n where n.user_id = owner.id order by n.created_at desc limit 1),
  owner.id, target.id, target.id, target.display_name,
  owner.role || ' ↔ ' || target.role,
  case when owner.i % 13 = 0 then 'completed' else 'active' end,
  72 + ((owner.i * 3) % 25),
  now() - ((owner.i * 19) || ' minutes')::interval, now()
from finding_gemini_users owner
join finding_gemini_users target on target.i = ((owner.i + 9 - 1) % 50) + 1
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
  m.id, m.participant_one_id,
  'Hi, Finding matched us because your card seems relevant to my current request.',
  m.created_at + interval '1 minute'
from public.matches m
where m.conversation_id like 'gemini:%'
on conflict do nothing;

insert into public.messages (match_id, sender_id, content, created_at)
select
  m.id, m.participant_two_profile_id,
  'Thanks for reaching out. I can help with this and can share a quick example from my card.',
  m.created_at + interval '3 minutes'
from public.matches m
where m.conversation_id like 'gemini:%'
  and m.participant_two_profile_id is not null
on conflict do nothing;

insert into public.need_feedback (user_id, need_id, event_type, reason, feedback, created_at)
select
  n.user_id, n.id,
  case when n.status = 'completed' then 'complete' when n.status = 'failed' then 'fail' else 'close' end,
  u.feedback_reason,
  nullif(u.feedback, ''),
  now()
from public.needs n
join finding_gemini_users u on u.id = n.user_id
where n.status in ('closed', 'completed', 'failed')
on conflict do nothing;

notify pgrst, 'reload schema';

select
  (select count(*) from public.profiles where is_simulated = true and id::text like '22000000-%') as gemini_profiles,
  (select count(*) from public.information_cards c where c.user_id::text like '22000000-%') as gemini_cards,
  (select count(*) from public.portfolio_items p where p.user_id::text like '22000000-%') as gemini_portfolio_items,
  (select count(*) from public.needs n where n.user_id::text like '22000000-%') as gemini_needs,
  (select count(*) from public.matches where conversation_id like 'gemini:%') as gemini_conversations;
`;

await mkdir(new URL("../supabase", import.meta.url), { recursive: true });
const out = new URL("../supabase/generated_gemini_simulation.sql", import.meta.url);
await writeFile(out, sql, "utf8");

console.log(
  JSON.stringify(
    {
      ok: true,
      model,
      users: users.length,
      output: out.pathname,
      note: "API key was read from .env.local and was not written to output.",
    },
    null,
    2,
  ),
);
