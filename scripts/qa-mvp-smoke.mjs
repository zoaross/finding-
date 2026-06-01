import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

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

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL/key in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const stamp = Date.now();
const email = `finding.qa.${stamp}@gmail.com`;
const password = `FindingQA${stamp}!`;
const results = [];
let user = null;
let needId = null;
let cardId = null;
let matchId = crypto.randomUUID();
let targetProfile = null;

function pass(name, details = {}) {
  results.push({ flow: name, status: "PASS", ...details });
}

function fail(name, error, details = {}) {
  results.push({
    flow: name,
    status: "FAIL",
    error: error?.message || String(error),
    code: error?.code,
    details,
  });
}

async function step(name, fn) {
  try {
    const details = await fn();
    pass(name, details);
  } catch (error) {
    fail(name, error);
  }
}

for (const table of [
  "profiles",
  "needs",
  "information_cards",
  "matches",
  "messages",
  "saved_users",
  "saved_cards",
  "saved_needs",
  "saved_portfolio_items",
  "portfolio_items",
  "reports",
  "blocked_users",
  "user_settings",
  "conversation_ratings",
]) {
  await step(`Supabase schema: ${table}`, async () => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return { count };
  });
}

await step("Auth: sign up", async () => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: "Finding QA User", username: `qa_${stamp}` } },
  });
  if (error) throw error;
  user = data.user;
  return { email, userId: user?.id, hasSession: Boolean(data.session) };
});

await step("Auth: log in", async () => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  user = data.user;
  return { userId: user?.id, hasSession: Boolean(data.session) };
});

await step("Auth: session persistence", async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user?.id) throw new Error("No active session after login");
  return { userId: data.session.user.id };
});

await step("Profile: upsert/select profile", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const payload = {
    id: user.id,
    username: `qa_${stamp}`,
    avatar_emoji: "🧪",
    bio: "QA simulation user for Finding MVP stabilization.",
    location: "Seoul, Korea",
    language: "English fluent · Korean learning",
    skills: ["QA testing", "SNS flows", "Supabase"],
    reputation_score: 4.2,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("profiles").upsert(payload);
  if (error) throw error;
  const { data, error: readError } = await supabase.from("profiles").select("id, username").eq("id", user.id).single();
  if (readError) throw readError;
  return data;
});

await step("Needs: post need", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const { data, error } = await supabase
    .from("needs")
    .insert({
      user_id: user.id,
      content: "Need a Korean speaking partner tonight for relaxed IELTS-style practice.",
      status: "open",
      is_archived: false,
      parsed_intent: { simulation: true, source: "qa", tags: ["IELTS", "Korean"], region: "Seoul" },
    })
    .select("id, content, status")
    .single();
  if (error) throw error;
  needId = data.id;
  return data;
});

await step("Needs: Home/My Needs select", async () => {
  if (!user?.id || !needId) throw new Error("No need to read");
  const { data, error } = await supabase
    .from("needs")
    .select("id, content, status, is_archived")
    .eq("user_id", user.id)
    .eq("id", needId)
    .single();
  if (error) throw error;
  return data;
});

await step("Identity cards: storage upload image/video/voice", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const uploads = [
    ["image", "qa-card-image.png", Buffer.from("89504e470d0a1a0a", "hex"), "image/png"],
    ["video", "qa-card-video.webm", Buffer.from("1a45dfa3", "hex"), "video/webm"],
    ["voice", "qa-voice-intro.mp3", Buffer.from("49443303000000000000", "hex"), "audio/mpeg"],
  ];
  const urls = {};
  for (const [kind, name, body, contentType] of uploads) {
    const path = `${user.id}/qa-${stamp}-${name}`;
    const { error } = await supabase.storage.from("card-media").upload(path, body, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(`${kind} upload failed: ${error.message}`);
    urls[kind] = supabase.storage.from("card-media").getPublicUrl(path).data.publicUrl;
  }
  return urls;
});

await step("Identity cards: create/save/select card", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const imagePath = `${user.id}/qa-${stamp}-qa-card-image.png`;
  const voicePath = `${user.id}/qa-${stamp}-qa-voice-intro.mp3`;
  const imageUrl = supabase.storage.from("card-media").getPublicUrl(imagePath).data.publicUrl;
  const voiceUrl = supabase.storage.from("card-media").getPublicUrl(voicePath).data.publicUrl;
  const { data, error } = await supabase
    .from("information_cards")
    .insert({
      user_id: user.id,
      title: "QA social supply card",
      category: "Skill",
      summary: "I can test SNS interaction flows and Supabase persistence.",
      details: "Created by automated QA smoke test. This is supply, not demand.",
      tags: ["QA", "Supabase", "social app"],
      supply_skills: ["QA testing", "Supabase persistence", "SNS flow audit"],
      supply_languages: ["en:fluent", "ko:learning"],
      supply_country: "Korea",
      supply_city: "Seoul",
      offer_summary: "I can test interaction loops and report failed persistence clearly.",
      projects: "MVP smoke testing for Finding social loop.",
      work_experience: "Automated QA simulation.",
      places_lived: ["Seoul"],
      proof_links: ["https://finding.example/qa"],
      proof_note: "QA proof for structured identity card fields.",
      media_urls: [imageUrl],
      voice_intro_url: voiceUrl,
      visibility: "public",
    })
    .select("id, title, media_urls, voice_intro_url, supply_skills, supply_languages")
    .single();
  if (error) throw error;
  cardId = data.id;
  return data;
});

await step("Discover/Matching: public profiles selectable", async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, skills, is_simulated")
    .neq("id", user?.id || "00000000-0000-0000-0000-000000000000")
    .order("is_simulated", { ascending: false })
    .limit(5);
  if (error) throw error;
  if (!data?.length) throw new Error("No other public profiles available");
  targetProfile = data[0];
  return { count: data.length, sample: data[0]?.username, simulated: Boolean(data[0]?.is_simulated) };
});

await step("Discover/Matching: save need", async () => {
  if (!user?.id || !needId) throw new Error("No authenticated user or need");
  const { error } = await supabase.from("saved_needs").insert({ user_id: user.id, need_id: needId });
  if (error) throw error;
  const { data, error: readError } = await supabase
    .from("saved_needs")
    .select("id, need_id")
    .eq("user_id", user.id)
    .eq("need_id", needId);
  if (readError) throw readError;
  return { count: data?.length || 0 };
});

await step("Discover/Matching: save user/card", async () => {
  if (!user?.id || !targetProfile?.id || !cardId) throw new Error("Missing user, target profile, or card");
  const [userSave, cardSave] = await Promise.all([
    supabase.from("saved_users").insert({ user_id: user.id, target_profile_id: targetProfile.id }),
    supabase.from("saved_cards").insert({ user_id: user.id, card_id: cardId }),
  ]);
  if (userSave.error) throw userSave.error;
  if (cardSave.error) throw cardSave.error;
  return { savedUser: targetProfile.username, savedCard: cardId };
});

await step("Chat: create conversation with public profile target", async () => {
  if (!user?.id || !targetProfile?.id) throw new Error("No authenticated user or target profile");
  const conversationId = `qa:${user.id}:${targetProfile.id}:${stamp}`;
  const { error } = await supabase.from("matches").insert({
    id: matchId,
    conversation_id: conversationId,
    need_id: needId,
    participant_one_id: user.id,
    participant_two_id: targetProfile.is_simulated ? null : targetProfile.id,
    participant_two_profile_id: targetProfile.id,
    partner_name: targetProfile.display_name || targetProfile.username || "QA simulated partner",
    match_tag: "QA compatibility",
    status: "active",
    match_score: 88,
  });
  if (error) throw error;
  return { matchId };
});

await step("Chat: send/read message", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: user.id,
      content: "QA message: testing SNS DM persistence and translation preview surface.",
    })
    .select("id, content")
    .single();
  if (error) throw error;
  const { data: rows, error: readError } = await supabase
    .from("messages")
    .select("id, content")
    .eq("match_id", matchId);
  if (readError) throw readError;
  return { inserted: data.id, count: rows?.length || 0 };
});

await step("Needs: close with lifecycle state", async () => {
  if (!user?.id || !needId) throw new Error("No need to close");
  const { data, error } = await supabase
    .from("needs")
    .update({ is_archived: true, status: "closed" })
    .eq("id", needId)
    .select("id, status, is_archived")
    .single();
  if (error) throw error;
  const feedback = await supabase.from("need_feedback").insert({
    user_id: user.id,
    need_id: needId,
    event_type: "close",
    reason: "temporarily_no_longer_needed",
    feedback: "QA close flow feedback.",
  });
  if (feedback.error) throw feedback.error;
  return data;
});

await step("Settings: persist zh/en/ko language settings", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      app_language: "ko",
      translation_language: "en",
      notification_settings: { messages: true, matches: true },
      privacy_settings: { publicProfile: true },
      chat_settings: { autoTranslate: true },
      ai_preferences: { simulation: true },
    })
    .select("app_language, translation_language")
    .single();
  if (error) throw error;
  if (data.app_language !== "ko" || data.translation_language !== "en") {
    throw new Error("Language settings did not persist as language codes");
  }
  return data;
});

await step("Settings: report and block target", async () => {
  if (!user?.id || !targetProfile?.id) throw new Error("No authenticated user or target profile");
  const report = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_profile_id: targetProfile.id,
    reason: "qa_simulation",
    note: "QA report persistence test.",
  });
  if (report.error) throw report.error;
  const block = await supabase.from("blocked_users").insert({
    blocker_id: user.id,
    blocked_profile_id: targetProfile.id,
    reason: "QA block persistence test.",
  });
  if (block.error) throw block.error;
  return { target: targetProfile.username };
});

await step("Invalid input: need status constraint rejects obsolete value", async () => {
  if (!user?.id) throw new Error("No authenticated user");
  const { error } = await supabase.from("needs").insert({
    user_id: user.id,
    content: "This invalid status insert should fail.",
    status: "matching",
    is_archived: false,
  });
  if (!error) throw new Error("Invalid need status was accepted");
  return { rejected: true, message: error.message };
});

await step("Settings/Auth: log out", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  const { data } = await supabase.auth.getSession();
  if (data.session) throw new Error("Session still exists after signOut");
  return { signedOut: true };
});

const summary = {
  generatedAt: new Date().toISOString(),
  testUser: { email, password, userId: user?.id || null },
  passed: results.filter((r) => r.status === "PASS").length,
  failed: results.filter((r) => r.status === "FAIL").length,
  results,
  created: { needId, cardId, matchId },
};

console.log(JSON.stringify(summary, null, 2));
