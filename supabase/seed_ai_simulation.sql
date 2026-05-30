-- Finding AI simulation seed
-- Run after:
-- 1. supabase/fix_public_needs.sql
-- 2. supabase/fix_mvp_core.sql
-- 3. supabase/fix_simulated_chat.sql
-- Purpose: populate MVP routes with realistic SNS-like users, cards, needs,
-- activity, matches, messages, reports, and blocks for stress testing.
--
-- This is simulation data. It creates synthetic auth users so existing
-- foreign keys and RLS-friendly public tables behave like a real social app.

create extension if not exists pgcrypto;

create temporary table finding_seed_users (
  id uuid primary key,
  email text not null,
  username text not null,
  display_name text not null,
  city text not null,
  country text not null,
  language text not null,
  skills text[] not null,
  bio text not null,
  primary_offer text not null,
  current_need text not null,
  emoji text not null,
  avatar_seed text not null,
  reputation numeric(3,1) not null,
  created_hours_ago integer not null
) on commit drop;

insert into finding_seed_users values
('10000000-0000-0000-0000-000000000001','hana.park.sim@finding.test','hana_seoul','Hana Park','Seoul','Korea','Korean native · English fluent',array['IELTS speaking','Korean tutoring','study accountability'],'Seoul-based language coach helping shy speakers become comfortable in real conversations. Loves quiet cafes, stationery, and practical study plans.','IELTS speaking partner in Korea','Need a consistent IELTS speaking partner twice a week, preferably evening Korea time.','🗣️','hana-seoul',4.9,2),
('10000000-0000-0000-0000-000000000002','minjun.backend.sim@finding.test','minjun_backend','Minjun Kim','Seoul','Korea','Korean native · English fluent',array['Backend','Node.js','Postgres','Supabase'],'Backend engineer building social products and realtime systems. Good at turning messy ideas into reliable APIs.','Backend developer','Looking for a frontend partner to prototype a lightweight AI social feature this weekend.','🛠️','minjun-backend',4.8,4),
('10000000-0000-0000-0000-000000000003','ava.frontend.sim@finding.test','ava_pixels','Ava Thompson','San Francisco','United States','English native · Spanish intermediate',array['React','TypeScript','Framer Motion','Design systems'],'Frontend developer who cares about tiny interaction details and social app polish. Often works with founders on fast MVPs.','Frontend developer','Need feedback from product designers on a creator profile interaction flow.','💻','ava-pixels',4.7,5),
('10000000-0000-0000-0000-000000000004','yui.design.sim@finding.test','yui_designs','Yui Nakamura','Tokyo','Japan','Japanese native · English fluent',array['Product design','UI/UX','Figma','Prototyping'],'Product designer focused on calm, expressive social tools. Likes designing profiles, cards, and messaging surfaces.','Product designer','Looking for an engineer to turn a Figma prototype into a clickable web app.','🎨','yui-designs',4.9,7),
('10000000-0000-0000-0000-000000000005','leo.ai.sim@finding.test','leo_builds_ai','Leo Martinez','New York','United States','English native · Spanish native',array['AI product','Founder','Go-to-market','Prompting'],'AI startup founder testing social matching, community onboarding, and early user research loops.','AI startup founder','Need a cofounder-style collaborator who can challenge product strategy and ship small experiments.','🚀','leo-ai',4.6,9),
('10000000-0000-0000-0000-000000000006','sora.korean.sim@finding.test','sora_korean','Sora Choi','Busan','Korea','Korean native · Japanese fluent',array['Korean tutoring','TOPIK','Conversation practice'],'Korean tutor with a warm, structured style. Helps learners speak naturally instead of memorizing scripts.','Korean tutor','Looking for Japanese speakers who want Korean conversation exchange.','📚','sora-korean',4.8,11),
('10000000-0000-0000-0000-000000000007','james.english.sim@finding.test','james_speaks','James O''Neil','Toronto','Canada','English native · French intermediate',array['English speaking','Presentation coaching','Editing'],'English speaker and editor helping international students sound clear and confident in interviews.','English speaker','Want to meet Korean or Japanese learners for relaxed speaking practice.','🎙️','james-english',4.7,12),
('10000000-0000-0000-0000-000000000008','mei.exchange.sim@finding.test','mei_exchange','Mei Lin','Shanghai','China','Chinese native · English fluent · Korean learning',array['Language exchange','Mandarin','Korean learning'],'Language exchange partner who likes cafes, K-pop, travel planning, and honest study routines.','Language exchange partner','Need a Korean friend for casual voice chats and culture exchange.','🌏','mei-exchange',4.6,13),
('10000000-0000-0000-0000-000000000009','nina.marketing.sim@finding.test','nina_growth','Nina Patel','London','United Kingdom','English native · Hindi fluent',array['Marketing','TikTok','Student communities','Growth'],'Marketing student experimenting with social discovery, micro-communities, and creator-led campaigns.','Marketing student','Looking for a designer to review a student campaign deck before Friday.','📣','nina-growth',4.5,15),
('10000000-0000-0000-0000-000000000010','mika.ux.sim@finding.test','mika_ux','Mika Sato','Osaka','Japan','Japanese native · English intermediate',array['UI/UX','Research','Mobile apps','Accessibility'],'UI/UX designer who enjoys practical research and humane onboarding flows.','UI/UX designer','Need a frontend developer to help test mobile responsive states for a profile page.','🧩','mika-ux',4.8,18),
('10000000-0000-0000-0000-000000000011','jun.study.sim@finding.test','jun_studies','Jun Wei','Singapore','Singapore','English fluent · Chinese native',array['Study partner','TOPIK','Data science','Accountability'],'Study partner who likes daily check-ins, small goals, and friendly pressure.','Study partner','Looking for someone to do daily TOPIK and data science accountability.','📖','jun-study',4.6,20),
('10000000-0000-0000-0000-000000000012','luna.creative.sim@finding.test','luna_collab','Luna Garcia','Mexico City','Mexico','Spanish native · English fluent',array['Creative collaboration','Illustration','Storytelling'],'Creative collaborator mixing illustration, music references, and narrative worlds for indie projects.','Creative collaborator','Need a music producer for a short animated concept teaser.','✨','luna-creative',4.7,23),
('10000000-0000-0000-0000-000000000013','sara.photo.sim@finding.test','sara_shoots','Sara Khalid','Dubai','UAE','Arabic native · English fluent',array['Photography','Portraits','Short video','Brand visuals'],'Photographer creating warm portraits and short social clips for founders and creators.','Photographer','Looking for a Seoul-based stylist to collaborate on a creator portrait set.','📸','sara-photo',4.8,26),
('10000000-0000-0000-0000-000000000014','tom.gaming.sim@finding.test','tom_game_night','Tom Becker','Berlin','Germany','German native · English fluent',array['Gaming friends','Indie games','Pixel art','Discord communities'],'Indie game fan and community organizer who likes cozy co-op, roguelikes, and thoughtful Discord spaces.','Gaming friend','Want gaming friends tonight for co-op or indie game testing.','🎮','tom-gaming',4.4,28),
('10000000-0000-0000-0000-000000000015','aiko.ielts.sim@finding.test','aiko_ielts','Aiko Tanaka','Tokyo','Japan','Japanese native · English fluent',array['IELTS','English speaking','Japanese tutoring'],'IELTS high scorer helping learners practice speaking under real timing. Also enjoys language exchange.','IELTS speaking partner','Need a Korean tutor for polite speech practice before a work trip.','📝','aiko-ielts',4.9,30),
('10000000-0000-0000-0000-000000000016','noah.product.sim@finding.test','noah_pm','Noah Williams','Austin','United States','English native',array['Product management','User interviews','Roadmapping'],'Product manager who helps early teams turn scattered ideas into testable user flows.','Product mentor','Looking for three people to review an AI matching onboarding flow.','🧭','noah-product',4.6,32),
('10000000-0000-0000-0000-000000000017','jiwoo.voice.sim@finding.test','jiwoo_voice','Jiwoo Han','Seoul','Korea','Korean native · English intermediate',array['Voice intro','Podcast editing','Korean culture'],'Audio editor and voice intro coach helping people sound more natural on profiles and short clips.','Voice intro coach','Need English feedback on a 60-second voice intro for my public profile.','🎧','jiwoo-voice',4.7,34),
('10000000-0000-0000-0000-000000000018','emily.wellbeing.sim@finding.test','emily_listens','Emily Chen','Vancouver','Canada','English native · Chinese fluent',array['Emotional support','Peer listening','Study stress'],'Peer listener focused on gentle, non-judgmental conversations for students and remote workers.','Peer listener','Feeling overwhelmed before exams and want someone calm to talk with tonight.','💬','emily-wellbeing',4.9,36),
('10000000-0000-0000-0000-000000000019','rafa.video.sim@finding.test','rafa_cuts','Rafa Silva','São Paulo','Brazil','Portuguese native · English fluent',array['Video editing','Reels','YouTube','Motion graphics'],'Video editor making punchy social clips, startup demos, and creator reels.','Video editor','Looking for voiceover help for an English product explainer.','🎬','rafa-video',4.6,38),
('10000000-0000-0000-0000-000000000020','claire.french.sim@finding.test','claire_lang','Claire Dubois','Paris','France','French native · English fluent · Korean learning',array['French tutoring','Language exchange','Travel planning'],'French tutor and travel planner who likes cross-cultural friendships and structured speaking practice.','French tutor','Need Korean speaking practice and cafe recommendations for Seoul.','🥐','claire-french',4.7,40),
('10000000-0000-0000-0000-000000000021','omar.music.sim@finding.test','omar_sounds','Omar Khalil','Dubai','UAE','Arabic native · English fluent',array['Music production','Lo-fi','Sound design','Collaboration'],'Music producer making warm lo-fi textures for games, videos, and animated stories.','Music producer','Looking for an illustrator to make cover art for a lo-fi EP.','🎵','omar-music',4.8,42),
('10000000-0000-0000-0000-000000000022','zoe.data.sim@finding.test','zoe_data','Zoe Miller','Melbourne','Australia','English native',array['Data analysis','Dashboards','Python','Study partner'],'Data analyst who enjoys explaining statistics clearly and helping students build confidence.','Data mentor','Need a study partner for Python data projects twice a week.','📊','zoe-data',4.5,44),
('10000000-0000-0000-0000-000000000023','ken.startup.sim@finding.test','ken_ops','Ken Watanabe','Kyoto','Japan','Japanese native · English fluent',array['Startup operations','Notion systems','Community ops'],'Startup operator building lightweight systems for small communities and founder teams.','Startup operations mentor','Need someone to test a Notion-based creator CRM workflow.','📎','ken-startup',4.6,46),
('10000000-0000-0000-0000-000000000024','maria.design.sim@finding.test','maria_brand','Maria Rossi','Milan','Italy','Italian native · English fluent',array['Brand design','Typography','Fashion visuals'],'Brand designer with a fashion and editorial background. Loves expressive but practical identity systems.','Brand designer','Looking for a frontend developer to build a tiny portfolio landing page.','🖌️','maria-design',4.7,48),
('10000000-0000-0000-0000-000000000025','david.backend.sim@finding.test','david_api','David Nguyen','Ho Chi Minh City','Vietnam','Vietnamese native · English fluent',array['Backend','APIs','DevOps','Realtime'],'Backend developer focused on APIs, deployment, and stable realtime messaging foundations.','Backend developer','Need a designer to help make developer tools feel less cold.','🔧','david-backend',4.8,51),
('10000000-0000-0000-0000-000000000026','sophia.study.sim@finding.test','sophia_notes','Sophia Lee','Los Angeles','United States','English native · Korean fluent',array['Study groups','IELTS','College essays'],'Study organizer who runs small accountability rooms and helps people keep momentum.','Study partner','Looking for morning study buddies for IELTS writing and speaking.','☕','sophia-study',4.6,54),
('10000000-0000-0000-0000-000000000027','ivan.gameart.sim@finding.test','ivan_pixels','Ivan Petrov','Warsaw','Poland','Polish native · English fluent',array['Pixel art','Game art','2D animation'],'Pixel artist making character sprites, tiny worlds, and game jam art packs.','Pixel artist','Need a Unity developer for a weekend game jam prototype.','🕹️','ivan-gameart',4.5,56),
('10000000-0000-0000-0000-000000000028','fatima.community.sim@finding.test','fatima_circle','Fatima Al Nouri','Doha','Qatar','Arabic native · English fluent',array['Community building','Women in tech','Mentoring'],'Community builder creating supportive spaces for early-career women in tech.','Community mentor','Need speakers for a small online women-in-tech circle.','🤝','fatima-community',4.9,59),
('10000000-0000-0000-0000-000000000029','liam.founder.sim@finding.test','liam_founder','Liam Brown','Dublin','Ireland','English native',array['Founder support','Pitch feedback','B2B SaaS'],'Founder who enjoys honest pitch feedback, early sales thinking, and pragmatic launch plans.','Pitch feedback mentor','Looking for someone to roleplay a skeptical investor conversation.','💼','liam-founder',4.6,62),
('10000000-0000-0000-0000-000000000030','nari.kpop.sim@finding.test','nari_kculture','Nari Jung','Seoul','Korea','Korean native · English fluent · Japanese intermediate',array['K-culture','Seoul guide','Language exchange'],'Seoul local who helps visitors find real neighborhoods, concerts, cafes, and conversation partners.','Seoul local guide','Need international friends for a weekend Seoul city walk.','🗺️','nari-kpop',4.7,64),
('10000000-0000-0000-0000-000000000031','maya.motion.sim@finding.test','maya_motion','Maya Singh','Bangalore','India','English fluent · Hindi native',array['Motion design','Lottie','UI animation'],'Motion designer who adds personality to interfaces without making them noisy.','Motion designer','Need a React developer to implement small UI animations.','🌀','maya-motion',4.6,67),
('10000000-0000-0000-0000-000000000032','chris.translation.sim@finding.test','chris_translate','Chris Morgan','Manchester','United Kingdom','English native · Japanese fluent',array['Translation','Localization','Game scripts'],'Translator specializing in game scripts, app copy, and natural bilingual tone.','Translator','Looking for a Korean reviewer for an app localization pass.','🌐','chris-translation',4.8,70),
('10000000-0000-0000-0000-000000000033','yara.ui.sim@finding.test','yara_ui','Yara Haddad','Amman','Jordan','Arabic native · English fluent',array['UI design','Design critique','Accessibility'],'UI designer focused on accessible layouts and social tools that feel calm but alive.','UI designer','Need product feedback on a bilingual onboarding page.','🪄','yara-ui',4.7,73),
('10000000-0000-0000-0000-000000000034','ben.english.sim@finding.test','ben_coach','Ben Carter','Auckland','New Zealand','English native',array['English coaching','Interview prep','Remote work'],'English coach helping non-native speakers with remote work interviews and daily confidence.','English interview coach','Need a Japanese speaker to explain polite business phrasing.','🗨️','ben-english',4.6,76),
('10000000-0000-0000-0000-000000000035','rina.tutor.sim@finding.test','rina_topik','Rina Mori','Fukuoka','Japan','Japanese native · Korean fluent',array['Korean learning','Japanese tutoring','TOPIK'],'Japanese tutor who learned Korean as an adult and knows how awkward speaking practice feels.','Japanese tutor','Looking for a TOPIK study partner who can meet online on Sundays.','🍵','rina-tutor',4.7,78),
('10000000-0000-0000-0000-000000000036','sam.designeng.sim@finding.test','sam_designeng','Sam Rivera','Seattle','United States','English native · Spanish fluent',array['Design engineering','React','Prototyping'],'Design engineer who turns social product ideas into realistic prototypes fast.','Design engineer','Need a founder or PM to test an AI card matching prototype.','⚡','sam-designeng',4.8,81),
('10000000-0000-0000-0000-000000000037','elena.research.sim@finding.test','elena_research','Elena Petrova','Prague','Czechia','Czech native · English fluent · Russian fluent',array['User research','Interview synthesis','UX strategy'],'UX researcher who loves finding the real human motive behind messy product requests.','User researcher','Looking for people to interview about online friendship and trust.','🔍','elena-research',4.9,84),
('10000000-0000-0000-0000-000000000038','tariq.devrel.sim@finding.test','tariq_devrel','Tariq Hassan','Cairo','Egypt','Arabic native · English fluent',array['DevRel','Documentation','Community events'],'Developer advocate helping tools explain themselves and communities welcome newcomers.','DevRel mentor','Need help turning technical docs into friendlier onboarding content.','📡','tariq-devrel',4.6,86),
('10000000-0000-0000-0000-000000000039','olivia.creator.sim@finding.test','olivia_creator','Olivia Green','Portland','United States','English native',array['Creator strategy','Newsletter','Community rituals'],'Creator strategist helping small communities build rituals, voice, and repeatable formats.','Creator strategist','Looking for a designer to make my newsletter profile feel more personal.','📝','olivia-creator',4.5,89),
('10000000-0000-0000-0000-000000000040','tae.frontend.sim@finding.test','tae_frontend','Tae Wilson','Seoul','Korea','English native · Korean intermediate',array['Frontend','Accessibility','React Native'],'Frontend engineer living in Seoul, interested in accessible social apps and language exchange.','Frontend developer','Need Korean speaking practice and a designer for a weekend prototype.','🌉','tae-frontend',4.7,92);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
select
  id,
  'authenticated',
  'authenticated',
  email,
  crypt('FindingTest2026!', gen_salt('bf')),
  now() - (created_hours_ago || ' hours')::interval,
  '{"provider":"email","providers":["email"],"simulation":true}'::jsonb,
  jsonb_build_object(
    'display_name', display_name,
    'avatar_url', 'https://api.dicebear.com/8.x/personas/svg?seed=' || avatar_seed,
    'simulation', true
  ),
  now() - (created_hours_ago || ' hours')::interval,
  now() - (least(created_hours_ago, 12) || ' hours')::interval
from finding_seed_users
on conflict (id) do update set
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into public.profiles (
  id,
  username,
  display_name,
  avatar_url,
  avatar_emoji,
  bio,
  location,
  language,
  skills,
  reputation_score,
  is_simulated,
  created_at,
  updated_at
)
select
  id,
  username,
  display_name,
  'https://api.dicebear.com/8.x/personas/svg?seed=' || avatar_seed,
  emoji,
  bio,
  city || ', ' || country,
  language,
  skills,
  reputation,
  true,
  now() - (created_hours_ago || ' hours')::interval,
  now() - (least(created_hours_ago, 10) || ' hours')::interval
from finding_seed_users
on conflict (id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  avatar_emoji = excluded.avatar_emoji,
  bio = excluded.bio,
  location = excluded.location,
  language = excluded.language,
  skills = excluded.skills,
  reputation_score = excluded.reputation_score,
  is_simulated = true,
  updated_at = now();

delete from public.information_cards
where user_id in (select id from finding_seed_users);

insert into public.information_cards (
  id,
  user_id,
  title,
  category,
  summary,
  details,
  tags,
  media_urls,
  voice_intro_url,
  visibility,
  reputation_score,
  response_rate,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  id,
  primary_offer,
  case
    when primary_offer ilike '%tutor%' or primary_offer ilike '%partner%' or primary_offer ilike '%coach%' then 'What I can offer'
    when primary_offer ilike '%designer%' or primary_offer ilike '%developer%' or primary_offer ilike '%engineer%' then 'Skill'
    else 'Experience'
  end,
  'I can help with ' || lower(primary_offer) || ' through practical, friendly collaboration.',
  bio || ' Best for: ' || array_to_string(skills[1:3], ', ') || '.',
  skills[1:3],
  array[
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop'
  ],
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'public',
  reputation,
  82 + ((created_hours_ago % 17)::int),
  now() - ((created_hours_ago - 1) || ' hours')::interval,
  now() - (least(created_hours_ago, 8) || ' hours')::interval
from finding_seed_users
on conflict do nothing;

insert into public.information_cards (
  id,
  user_id,
  title,
  category,
  summary,
  details,
  tags,
  media_urls,
  voice_intro_url,
  visibility,
  reputation_score,
  response_rate,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  id,
  'Language and collaboration style',
  'Language',
  language || '. Usually replies within a few hours.',
  'Works best with people who explain context naturally and want real conversation, not rigid forms.',
  array['language support','cross-cultural','responsive'],
  array['https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&auto=format&fit=crop'],
  null,
  'public',
  reputation,
  78 + ((created_hours_ago % 20)::int),
  now() - ((created_hours_ago - 2) || ' hours')::interval,
  now() - (least(created_hours_ago, 7) || ' hours')::interval
from finding_seed_users
on conflict do nothing;

delete from public.needs
where user_id in (select id from finding_seed_users)
  and coalesce(parsed_intent->>'simulation', '') = 'true';

insert into public.needs (
  id,
  user_id,
  content,
  status,
  is_archived,
  parsed_intent,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  id,
  current_need,
  'matching',
  false,
  jsonb_build_object(
    'summary', current_need,
    'region', city,
    'tags', to_jsonb(skills[1:3]),
    'intent_type', 'social_matching',
    'simulation', true
  ),
  now() - (created_hours_ago || ' hours')::interval,
  now() - (least(created_hours_ago, 6) || ' hours')::interval
from finding_seed_users
on conflict do nothing;

create temporary table finding_seed_matches (
  id uuid primary key,
  participant_one_id uuid not null,
  participant_two_id uuid not null,
  partner_name text not null,
  match_tag text not null,
  match_score numeric(5,2) not null,
  message_one text not null,
  message_two text not null,
  message_three text not null,
  hours_ago integer not null
) on commit drop;

insert into finding_seed_matches values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000015','Aiko Tanaka','IELTS speaking · Korea/Japan',96,'Hi Hana, your IELTS practice rhythm sounds exactly like what I need.','Great, we can do 20-minute mock speaking and 10-minute feedback.','Perfect. I can do Tuesday evening Korea time.',3),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','Ava Thompson','Backend ↔ Frontend prototype',94,'I can handle Supabase and realtime. Want to pair on the interface?','Yes, I can make the DM flow feel more social and less admin.','Let us start with profile click -> chat continuity.',6),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000040','Tae Wilson','Design ↔ Frontend',92,'Your accessible frontend background fits this prototype well.','Thanks. Your profile/card design direction is clear.','I can implement a small public profile interaction first.',9),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000016','Noah Williams','AI product strategy',91,'I am testing whether AI matching feels emotionally real.','Then we should interview users around trust and first messages.','Agreed. I will prepare a short scenario script.',12),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000008','Mei Lin','Korean ↔ Mandarin exchange',89,'안녕하세요 Mei! Casual voice chat sounds good.','Great, I want to practice everyday Korean without pressure.','Let us do 15 minutes Korean and 15 minutes Mandarin.',14),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000024','Maria Rossi','Marketing deck ↔ Brand design',88,'Could you review the visual hierarchy of my campaign deck?','Yes. Send the rough slides and I will mark the first three issues.','Amazing, I need it to feel more creator-led.',16),
('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000022','Zoe Miller','Study accountability',87,'Daily data science check-ins would help me stay consistent.','I can do weekdays, 30 minutes async plus Sunday review.','That structure works for TOPIK and Python.',20),
('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000021','Omar Khalil','Illustration ↔ Music',93,'Your lo-fi sound would fit my animated teaser.','I can make a 30-second loop if you send the moodboard.','I will share three visual references tonight.',22),
('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000027','Ivan Petrov','Game testing ↔ Pixel art',90,'Want to test a co-op prototype tonight?','Yes, and I can sketch a tiny pixel enemy after the session.','Perfect. Discord at 9pm Berlin time?',25),
('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000026','Sophia Lee','Exam stress support',86,'I saw your study group card. I need a calm accountability rhythm.','We can start with one gentle check-in and no pressure.','Thank you. That sounds exactly right.',29),
('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000019','10000000-0000-0000-0000-000000000034','Ben Carter','Video voiceover',85,'Could you help make my English voiceover sound natural?','Yes, send the script and I will suggest a cleaner rhythm.','Great. It is for a one-minute product explainer.',33),
('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000023','10000000-0000-0000-0000-000000000039','Olivia Green','Creator CRM workflow',84,'Your creator strategy background fits this Notion CRM test.','I can test it as a newsletter workflow and give notes.','I will send the template link and a simple task.',37),
('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000025','10000000-0000-0000-0000-000000000033','Yara Haddad','Developer tools UX',88,'I want developer tools to feel less cold.','I can review the first-run UI and empty states.','That is exactly where it feels broken right now.',41),
('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000028','10000000-0000-0000-0000-000000000038','Tariq Hassan','Community event docs',82,'We need speakers and friendlier onboarding content.','I can help rewrite the event invitation and developer notes.','Let us make it warm but still precise.',45),
('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000030','10000000-0000-0000-0000-000000000020','Claire Dubois','Seoul guide ↔ Korean practice',91,'I can help with cafe recommendations and a city walk.','Great, I also need Korean speaking practice.','Let us combine both: order coffee in Korean and explore nearby.',49);

insert into public.matches (
  id,
  conversation_id,
  participant_one_id,
  participant_two_id,
  participant_two_profile_id,
  partner_name,
  match_tag,
  status,
  match_score,
  created_at,
  updated_at
)
select
  id,
  id::text,
  participant_one_id,
  participant_two_id,
  participant_two_id,
  partner_name,
  match_tag,
  case when hours_ago % 5 = 0 then 'saved' else 'active' end,
  match_score,
  now() - (hours_ago || ' hours')::interval,
  now() - (least(hours_ago, 8) || ' hours')::interval
from finding_seed_matches
on conflict (id) do update set
  status = excluded.status,
  match_score = excluded.match_score,
  updated_at = now();

delete from public.messages
where match_id in (select id from finding_seed_matches);

insert into public.messages (match_id, sender_id, content, created_at)
select id, participant_one_id, message_one, now() - (hours_ago || ' hours')::interval
from finding_seed_matches
on conflict do nothing;

insert into public.messages (match_id, sender_id, content, created_at)
select id, participant_two_id, message_two, now() - ((hours_ago - 1) || ' hours')::interval
from finding_seed_matches
on conflict do nothing;

insert into public.messages (match_id, sender_id, content, created_at)
select id, participant_one_id, message_three, now() - ((hours_ago - 2) || ' hours')::interval
from finding_seed_matches
on conflict do nothing;

-- Simulated saved state between AI users.
delete from public.bookmarks
where user_id in (select id from finding_seed_users)
  and need_id is not null;

insert into public.bookmarks (user_id, need_id, created_at)
select
  u.id,
  n.id,
  now() - ((u.created_hours_ago % 30 + 1) || ' hours')::interval
from finding_seed_users u
join lateral (
  select id from public.needs
  where user_id <> u.id
  order by created_at desc
  offset (u.created_hours_ago % 8)
  limit 1
) n on true
on conflict do nothing;

-- Reporting/blocking simulation tables for safety-flow testing.
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  note text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

drop policy if exists "Users can create own reports" on public.user_reports;
create policy "Users can create own reports"
on public.user_reports for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view own reports" on public.user_reports;
create policy "Users can view own reports"
on public.user_reports for select
to authenticated
using (auth.uid() = reporter_id);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_user_id uuid references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_user_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "Users can manage own blocks" on public.blocked_users;
create policy "Users can manage own blocks"
on public.blocked_users for all
to authenticated
using (auth.uid() = blocker_id)
with check (auth.uid() = blocker_id);

delete from public.user_reports
where reporter_id in (select id from finding_seed_users)
  and reported_user_id in (select id from finding_seed_users);

insert into public.user_reports (reporter_id, reported_user_id, reason, note, status, created_at)
values
('10000000-0000-0000-0000-000000000018','10000000-0000-0000-0000-000000000029','spam','Simulated stress test report: repeated pitch messages.','resolved',now() - interval '19 hours'),
('10000000-0000-0000-0000-000000000033','10000000-0000-0000-0000-000000000014','tone_mismatch','Simulated report for moderation UI state.','open',now() - interval '8 hours')
on conflict do nothing;

insert into public.blocked_users (blocker_id, blocked_user_id, reason, created_at)
values
('10000000-0000-0000-0000-000000000020','10000000-0000-0000-0000-000000000029','Too many cold pitch messages',now() - interval '7 hours'),
('10000000-0000-0000-0000-000000000026','10000000-0000-0000-0000-000000000014','Not a fit for study group boundaries',now() - interval '4 hours')
on conflict do nothing;

grant all on public.user_reports to authenticated;
grant all on public.blocked_users to authenticated;

notify pgrst, 'reload schema';
