import { supabase } from "@/lib/supabase";
import { hasBlockBetween } from "@/lib/socialActions";

export type DBMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type ConversationTarget = {
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
  needId?: string | null;
  matchTag?: string | null;
};

const ACTIVE_MATCH_KEY = "finding:active-match-id";

export function setRequestedMatch(matchId: string) {
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, matchId);
  } catch {
    // The conversation still exists even if storage is unavailable.
  }
}

export function consumeRequestedMatch(): string | null {
  try {
    const matchId = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (matchId) localStorage.removeItem(ACTIVE_MATCH_KEY);
    return matchId;
  } catch {
    return null;
  }
}

async function findProfileByUsername(
  username: string,
): Promise<{ id: string; username: string; is_simulated?: boolean | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_simulated")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return data as { id: string; username: string; is_simulated?: boolean | null };
}

async function findProfileById(
  id: string,
): Promise<{ id: string; username: string | null; is_simulated?: boolean | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_simulated")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return data as { id: string; username: string | null; is_simulated?: boolean | null };
}

function directConversationId(currentUserId: string, targetUserId: string, needId?: string | null) {
  const pair = [currentUserId, targetUserId].sort().join(":");
  return needId ? `direct:${pair}:need:${needId}` : `direct:${pair}`;
}

export async function openOrCreateConversation(
  currentUserId: string,
  targetInput: string | ConversationTarget,
): Promise<string> {
  const target: ConversationTarget =
    typeof targetInput === "string" ? { userId: targetInput } : targetInput;
  let targetUserId = target.userId ?? null;
  let targetName = target.displayName || target.username || "Finding partner";
  let targetIsSimulated = false;

  if (!targetUserId && target.username) {
    const profile = await findProfileByUsername(target.username);
    if (profile) {
      targetUserId = profile.id;
      targetName = profile.username || targetName;
      targetIsSimulated = !!profile.is_simulated;
    }
  }

  if (!targetUserId) {
    throw new Error(
      "Cannot start chat: target user is not in profiles. Run supabase/seed_ai_simulation.sql or pass a real profile id.",
    );
  }
  if (targetUserId === currentUserId) {
    throw new Error("Cannot start a chat with yourself.");
  }

  if (!targetIsSimulated) {
    const profile = await findProfileById(targetUserId);
    if (profile) {
      targetName = profile.username || targetName;
      targetIsSimulated = !!profile.is_simulated;
    }
  }

  if (await hasBlockBetween(currentUserId, targetUserId)) {
    throw new Error("Chat is blocked by privacy settings.");
  }

  const conversationId = directConversationId(currentUserId, targetUserId, target.needId);
  const { data: existing, error: readError } = await supabase
    .from("matches")
    .select("id")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (existing?.id) {
    if (targetIsSimulated && targetUserId) {
      await ensureInitialSimulatedReply(existing.id as string, targetUserId, targetName);
    }
    setRequestedMatch(existing.id as string);
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("matches")
    .insert({
      conversation_id: conversationId,
      need_id: target.needId ?? null,
      participant_one_id: currentUserId,
      participant_two_id: targetIsSimulated ? null : targetUserId,
      participant_two_profile_id: targetUserId,
      partner_name: targetName,
      match_tag: target.matchTag || "Finding match",
      status: "active",
      match_score: 88,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Conversation was not created.");
  if (target.needId) {
    await (supabase as any)
      .from("needs")
      .update({ status: "matched", is_archived: false, updated_at: new Date().toISOString() })
      .eq("id", target.needId)
      .eq("user_id", currentUserId);
  }
  if (targetIsSimulated) {
    await ensureInitialSimulatedReply(data.id as string, targetUserId, targetName);
  }
  setRequestedMatch(data.id as string);
  return data.id as string;
}

export const startConversation = openOrCreateConversation;

export async function ensureConversation(
  matchId: string,
  senderId: string,
  partnerName = "Finding partner",
  matchTag = "Finding match",
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }
  if (existing) return;

  const { error } = await supabase.from("matches").insert({
    id: matchId,
    conversation_id: matchId,
    participant_one_id: senderId,
    participant_two_id: null,
    participant_two_profile_id: null,
    partner_name: partnerName,
    match_tag: matchTag,
    status: "active",
  });

  if (error) throw new Error(error.message);
}

/** Pull the full message history for a conversation, oldest first. */
export async function listMessages(matchId: string): Promise<DBMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, content, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[chat] listMessages failed:", error.message);
    return [];
  }
  return (data ?? []) as DBMessage[];
}

/**
 * Insert a new message and return the saved row.
 * No longer requires a matching row in `matches` — the FK was dropped so
 * demo conversations and real conversations both work with any UUID.
 */
export async function sendMessage(
  matchId: string,
  senderId: string,
  content: string,
  partnerName?: string,
): Promise<DBMessage | null> {
  await ensureConversation(matchId, senderId, partnerName);

  const { data, error } = await supabase
    .from("messages")
    .insert({ match_id: matchId, sender_id: senderId, content })
    .select("id, match_id, sender_id, content, created_at")
    .single();

  if (error) {
    console.error("[chat] sendMessage failed:", error);
    throw new Error(error.message);
  }
  return data as DBMessage;
}

export function mockReplyFor(text: string, partnerName = "Finding partner"): string {
  const lower = text.toLowerCase();
  if (/ielts|speaking|english|雅思|口语|영어/.test(lower)) {
    return "That sounds good. I can do a short speaking practice and give gentle feedback after.";
  }
  if (/react|frontend|backend|supabase|api|developer|开发|工程/.test(lower)) {
    return "I can help with that. Send me the current flow and I will point out the first practical step.";
  }
  if (/design|ui|ux|figma|设计/.test(lower)) {
    return "I like this direction. I can review the profile/card flow and suggest cleaner interaction states.";
  }
  if (/korean|korea|seoul|한국|韩语|首尔/.test(lower)) {
    return "좋아요. We can keep it casual and mix Korean with your preferred language.";
  }
  return `Thanks for reaching out. ${partnerName} is interested and can continue from here.`;
}

export async function ensureInitialSimulatedReply(
  matchId: string,
  simulatedProfileId: string,
  partnerName = "Finding partner",
): Promise<DBMessage | null> {
  const { data: existing, error: readError } = await supabase
    .from("messages")
    .select("id")
    .eq("match_id", matchId)
    .limit(1);

  if (readError) {
    console.warn("[chat] initial simulated reply check failed:", readError.message);
    return null;
  }
  if (existing && existing.length > 0) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: simulatedProfileId,
      content: `Hi, I am ${partnerName}. I saw the match context and I am open to chatting.`,
    })
    .select("id, match_id, sender_id, content, created_at")
    .single();

  if (error) {
    console.warn("[chat] initial simulated reply failed:", error.message);
    return null;
  }
  return data as DBMessage;
}

export async function sendSimulatedReply(
  matchId: string,
  simulatedProfileId: string,
  inboundText: string,
  partnerName?: string,
): Promise<DBMessage | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: simulatedProfileId,
      content: mockReplyFor(inboundText, partnerName),
    })
    .select("id, match_id, sender_id, content, created_at")
    .single();

  if (error) {
    console.warn("[chat] simulated reply failed:", error.message);
    return null;
  }
  return data as DBMessage;
}

/**
 * Subscribe to INSERT events on `messages` for a given match.
 * Returns an unsubscribe function — call it on cleanup.
 */
export function subscribeMessages(matchId: string, onInsert: (msg: DBMessage) => void): () => void {
  const channel = supabase
    .channel(`messages:${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      },
      (payload: { new: DBMessage }) => {
        onInsert(payload.new as DBMessage);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Build a stable UUID for a demo conversation ID.
 * Persisted in localStorage so the same demo conv always maps to the same UUID.
 */
const MAP_KEY = "finding:mock-conv-uuid";

function readMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeMap(map: Record<string, string>) {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getMockMatchId(convId: string): string {
  const map = readMap();
  if (map[convId]) return map[convId];
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}-${convId}`;
  map[convId] = uuid;
  writeMap(map);
  return uuid;
}
