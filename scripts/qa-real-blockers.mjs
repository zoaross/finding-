import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile } from "node:fs/promises";

const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env");

function client() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const stamp = Date.now();
const password = `FindingBlockerQA${stamp}!`;
const owner = {
  email: `finding.qa.blocker.owner.${stamp}@gmail.com`,
  username: `qa_blocker_owner_${stamp}`,
  displayName: "QA Blocker Owner",
  headline: "Real QA headline for profile save",
};
const partner = {
  email: `finding.qa.blocker.partner.${stamp}@gmail.com`,
  username: `qa_blocker_partner_${stamp}`,
  displayName: "QA Blocker Partner",
  headline: "Real partner headline",
};
const results = [];

function err(error) {
  return {
    message: error?.message || String(error),
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
}

async function step(name, fn) {
  try {
    const details = await fn();
    results.push({ name, status: "PASS", details });
    return details;
  } catch (error) {
    results.push({ name, status: "FAIL", error: err(error) });
    return null;
  }
}

await step("Setup: create two real auth users", async () => {
  for (const u of [owner, partner]) {
    u.client = client();
    const { data, error } = await u.client.auth.signUp({
      email: u.email,
      password,
      options: {
        data: {
          username: u.username,
          display_name: u.displayName,
          birth_date: "1998-01-01",
          is_adult_verified: true,
        },
      },
    });
    if (error) throw error;
    u.id = data.user?.id;
    if (!u.id) throw new Error(`No user id for ${u.username}`);
    if (!data.session) {
      const login = await u.client.auth.signInWithPassword({ email: u.email, password });
      if (login.error) throw login.error;
    }
  }
  return { owner: owner.id, partner: partner.id };
});

await step("Profile save with headline", async () => {
  for (const u of [owner, partner]) {
    const { data, error } = await u.client
      .from("profiles")
      .upsert({
        id: u.id,
        username: u.username,
        display_name: u.displayName,
        headline: u.headline,
        bio: "Real Supabase QA blocker test profile.",
        location: "Seoul, Korea",
        country: "Korea",
        city: "Seoul",
        is_simulated: false,
        updated_at: new Date().toISOString(),
      })
      .select("id, username, headline")
      .single();
    if (error) throw error;
    if (data.headline !== u.headline) throw new Error("Headline did not persist");
  }
  return { ownerHeadline: owner.headline, partnerHeadline: partner.headline };
});

await step("Setup: create real card, need, match, and messages", async () => {
  const card = await partner.client
    .from("information_cards")
    .insert({
      user_id: partner.id,
      title: "Real QA completion partner card",
      category: "Skill",
      summary: "I can complete real QA collaboration tests.",
      details: "Real blocker QA supply card.",
      tags: ["QA", "Completion"],
      supply_skills: ["QA", "Completion"],
      supply_languages: ["en:fluent", "ko:fluent"],
      visibility: "public",
    })
    .select("id")
    .single();
  if (card.error) throw card.error;
  partner.cardId = card.data.id;

  const need = await owner.client
    .from("needs")
    .insert({
      user_id: owner.id,
      content: "Need a real QA partner to verify completion feedback sync.",
      status: "open",
      is_archived: false,
      parsed_intent: { source: "real_blocker_qa", tags: ["QA", "Completion"] },
    })
    .select("id, status, is_archived")
    .single();
  if (need.error) throw need.error;
  owner.needId = need.data.id;

  const match = await owner.client
    .from("matches")
    .insert({
      conversation_id: `qa-blocker:${stamp}:${owner.id}:${partner.id}:${owner.needId}`,
      need_id: owner.needId,
      participant_one_id: owner.id,
      participant_two_id: partner.id,
      participant_two_profile_id: partner.id,
      partner_name: partner.displayName,
      match_tag: "QA completion",
      status: "active",
      match_score: 95,
    })
    .select("id, need_id, status")
    .single();
  if (match.error) throw match.error;
  owner.matchId = match.data.id;

  for (const [sender, content] of [
    [owner, "__finding_system__:Real QA completion conversation opened."],
    [owner, "Owner message before completion."],
    [partner, "Partner reply before completion."],
  ]) {
    const msg = await sender.client.from("messages").insert({
      match_id: owner.matchId,
      sender_id: sender.id,
      content,
    });
    if (msg.error) throw msg.error;
  }

  return { needId: owner.needId, matchId: owner.matchId, partnerCardId: partner.cardId };
});

await step("Complete collaboration: feedback saved and need archived", async () => {
  const now = new Date().toISOString();
  const rating = await owner.client
    .from("conversation_ratings")
    .upsert(
      {
        rater_id: owner.id,
        conversation_id: owner.matchId,
        need_id: owner.needId,
        partner_profile_id: partner.id,
        partner_name: partner.displayName,
        match_tag: "QA completion",
        rating: 5,
        feedback: "Real QA completion feedback saved.",
        success_tags: ["responsive", "completed"],
        status: "completed",
        updated_at: now,
      },
      { onConflict: "rater_id,conversation_id" },
    )
    .select("id, conversation_id, need_id, partner_profile_id, success_tags, rating, feedback, status")
    .single();
  if (rating.error) throw rating.error;

  const match = await owner.client
    .from("matches")
    .update({ status: "completed", updated_at: now })
    .eq("id", owner.matchId)
    .select("id, status")
    .single();
  if (match.error) throw match.error;

  const need = await owner.client
    .from("needs")
    .update({ status: "completed", is_archived: true, updated_at: now })
    .eq("id", owner.needId)
    .eq("user_id", owner.id)
    .select("id, status, is_archived")
    .single();
  if (need.error) throw need.error;

  const needFeedback = await owner.client.from("need_feedback").insert({
    user_id: owner.id,
    need_id: owner.needId,
    event_type: "complete",
    reason: "completed",
    feedback: "Real QA need feedback saved.",
  });
  if (needFeedback.error) throw needFeedback.error;

  return { rating: rating.data, match: match.data, need: need.data };
});

await step("Need archived in My Needs query after refresh", async () => {
  const first = await owner.client
    .from("needs")
    .select("id, status, is_archived")
    .eq("id", owner.needId)
    .eq("user_id", owner.id)
    .single();
  if (first.error) throw first.error;
  const second = await owner.client
    .from("needs")
    .select("id, status, is_archived")
    .eq("id", owner.needId)
    .eq("user_id", owner.id)
    .single();
  if (second.error) throw second.error;
  if (second.data.status !== "completed" || second.data.is_archived !== true) {
    throw new Error("Need is not archived/completed after refresh");
  }
  return second.data;
});

await step("/admin/feedback data visible to owner", async () => {
  const { data, error } = await owner.client
    .from("conversation_ratings")
    .select("id, conversation_id, need_id, partner_profile_id, partner_name, match_tag, rating, feedback, success_tags, status, created_at")
    .eq("conversation_id", owner.matchId)
    .single();
  if (error) throw error;
  if (data.status !== "completed") throw new Error("Feedback row is not completed");
  return data;
});

await step("Sign out QA users", async () => {
  for (const u of [owner, partner]) {
    const { error } = await u.client.auth.signOut();
    if (error) throw error;
  }
  return { signedOut: 2 };
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: "real_supabase_blockers_only",
  summary: {
    passed: results.filter((r) => r.status === "PASS").length,
    failed: results.filter((r) => r.status === "FAIL").length,
  },
  users: {
    owner: { id: owner.id, username: owner.username, email: owner.email, needId: owner.needId, matchId: owner.matchId },
    partner: { id: partner.id, username: partner.username, email: partner.email, cardId: partner.cardId },
  },
  results,
};

await writeFile(new URL("../qa-real-blockers-report.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
