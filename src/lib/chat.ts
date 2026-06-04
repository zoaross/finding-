import { supabase } from "@/lib/supabase";
import { hasPublicIdentityCard } from "@/lib/realMatches";
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

export type OpenConversationParams = {
  partnerId?: string | null;
  partnerUsername?: string | null;
  partnerName?: string | null;
  sourceNeedId?: string | null;
  matchId?: string | null;
  matchTag?: string | null;
};

export const HIDDEN_CONVERSATION_STATUSES = ["rejected", "closed", "dismissed", "completed"];
const ACTIVE_MATCH_KEY = "finding:active-match-id";
export const CONVERSATION_OPENED_EVENT = "finding:conversation-opened";
export const SYSTEM_MESSAGE_PREFIX = "__finding_system__:";

export function setRequestedMatch(matchId: string) {
  try {
    localStorage.setItem(ACTIVE_MATCH_KEY, matchId);
  } catch {
    // The conversation still exists even if storage is unavailable.
  }
}

function notifyConversationOpened(matchId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CONVERSATION_OPENED_EVENT, {
      detail: { matchId },
    }),
  );
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
    .limit(1);
  if (error) throw new Error(error.message);
  const profile = (data ?? [])[0];
  if (!profile?.id) return null;
  return profile as { id: string; username: string; is_simulated?: boolean | null };
}

async function findProfileById(
  id: string,
): Promise<{ id: string; username: string | null; is_simulated?: boolean | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, is_simulated")
    .eq("id", id)
    .limit(1);
  if (error) throw new Error(error.message);
  const profile = (data ?? [])[0];
  if (!profile?.id) return null;
  return profile as { id: string; username: string | null; is_simulated?: boolean | null };
}

function directConversationId(currentUserId: string, targetUserId: string, needId?: string | null) {
  const pair = [currentUserId, targetUserId].sort().join(":");
  return needId ? `direct:${pair}:need:${needId}` : `direct:${pair}`;
}

async function findExistingConversation(
  currentUserId: string,
  targetUserId: string,
  sourceNeedId?: string | null,
): Promise<string | null> {
  let ownedQuery = (supabase as any)
    .from("matches")
    .select("id, updated_at")
    .eq("participant_one_id", currentUserId)
    .or(`participant_two_profile_id.eq.${targetUserId},participant_two_id.eq.${targetUserId}`)
    .not("status", "in", `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`)
    .order("updated_at", { ascending: false })
    .limit(1);

  let reverseQuery = (supabase as any)
    .from("matches")
    .select("id, updated_at")
    .eq("participant_two_id", currentUserId)
    .eq("participant_one_id", targetUserId)
    .not("status", "in", `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (sourceNeedId) {
    ownedQuery = ownedQuery.eq("need_id", sourceNeedId);
    reverseQuery = reverseQuery.eq("need_id", sourceNeedId);
  } else {
    ownedQuery = ownedQuery.is("need_id", null);
    reverseQuery = reverseQuery.is("need_id", null);
  }

  const [owned, reverse] = await Promise.all([ownedQuery, reverseQuery]);
  if ((owned as any).error) throw new Error((owned as any).error.message);
  if ((reverse as any).error) throw new Error((reverse as any).error.message);

  const candidates = [...(((owned as any).data ?? []) as any[]), ...(((reverse as any).data ?? []) as any[])];
  candidates.sort(
    (a, b) =>
      new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
  );
  return candidates[0]?.id ?? null;
}

async function activateExistingConversation(
  matchId: string,
  currentUserId: string,
  targetName: string,
  matchTag?: string | null,
): Promise<string> {
  await (supabase as any)
    .from("matches")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", matchId);
  await ensureSystemWelcomeMessage(matchId, currentUserId, targetName, matchTag);
  setRequestedMatch(matchId);
  notifyConversationOpened(matchId);
  return matchId;
}

async function currentAuthUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Please sign in first.");
  return userId;
}

async function openOrCreateConversationForUser(
  currentUserId: string,
  targetInput: string | ConversationTarget | OpenConversationParams,
): Promise<string> {
  const isNewParams =
    typeof targetInput !== "string" &&
    ("partnerId" in targetInput ||
      "partnerUsername" in targetInput ||
      "partnerName" in targetInput ||
      "sourceNeedId" in targetInput ||
      "matchId" in targetInput);
  const target: ConversationTarget =
    typeof targetInput === "string"
      ? { userId: targetInput }
      : isNewParams
        ? {
            userId: (targetInput as OpenConversationParams).partnerId,
            username: (targetInput as OpenConversationParams).partnerUsername,
            displayName: (targetInput as OpenConversationParams).partnerName,
            needId: (targetInput as OpenConversationParams).sourceNeedId,
            matchTag: (targetInput as OpenConversationParams).matchTag,
          }
        : targetInput;
  const explicitMatchId =
    typeof targetInput !== "string" && isNewParams ? (targetInput as OpenConversationParams).matchId : null;

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
  if (targetIsSimulated) {
    throw new Error("Cannot start chat: production UI does not allow simulated users.");
  }
  if (!(await hasPublicIdentityCard(targetUserId))) {
    throw new Error("Cannot start chat: target profile has no public identity card.");
  }

  if (await hasBlockBetween(currentUserId, targetUserId)) {
    throw new Error("Chat is blocked by privacy settings.");
  }

  const reusableId = await findExistingConversation(currentUserId, targetUserId, target.needId);
  if (reusableId) {
    return activateExistingConversation(reusableId, currentUserId, targetName, target.matchTag);
  }

  if (explicitMatchId) {
    const { data: rows, error } = await (supabase as any)
      .from("matches")
      .select("id, partner_name, match_tag")
      .eq("id", explicitMatchId)
      .limit(1);
    if (error) throw new Error(error.message);
    const existing = ((rows as any[]) ?? [])[0];
    if (existing?.id) {
      return activateExistingConversation(
        existing.id as string,
        currentUserId,
        (target.displayName || existing.partner_name || targetName) as string,
        target.matchTag || (existing.match_tag as string | null),
      );
    }
  }

  const conversationId = directConversationId(currentUserId, targetUserId, target.needId);
  const { data: existing, error: readError } = await supabase
    .from("matches")
    .select("id")
    .eq("conversation_id", conversationId)
    .limit(1);

  if (readError) throw new Error(readError.message);
  const existingMatch = (existing ?? [])[0];
  if (existingMatch?.id) {
    if (target.needId) {
      await (supabase as any)
        .from("matches")
        .update({ need_id: target.needId, updated_at: new Date().toISOString() })
        .eq("id", existingMatch.id)
        .is("need_id", null);
    }
    const existingId = existingMatch.id as string;
    await activateExistingConversation(
      existingId,
      currentUserId,
      targetName,
      target.matchTag,
    );
    return existingId;
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
  await ensureSystemWelcomeMessage(data.id as string, currentUserId, targetName, target.matchTag);
  if (target.needId) {
    await (supabase as any)
      .from("needs")
      .update({ status: "matched", is_archived: false, updated_at: new Date().toISOString() })
      .eq("id", target.needId)
      .eq("user_id", currentUserId);
  }
  setRequestedMatch(data.id as string);
  notifyConversationOpened(data.id as string);
  return data.id as string;
}

export async function openOrCreateConversation(
  params: OpenConversationParams,
): Promise<string>;
export async function openOrCreateConversation(
  currentUserId: string,
  targetInput: string | ConversationTarget,
): Promise<string>;
export async function openOrCreateConversation(
  currentUserIdOrParams: string | OpenConversationParams,
  targetInput?: string | ConversationTarget,
): Promise<string> {
  if (typeof currentUserIdOrParams === "string") {
    if (!targetInput) throw new Error("Missing conversation target.");
    return openOrCreateConversationForUser(currentUserIdOrParams, targetInput);
  }
  return openOrCreateConversationForUser(await currentAuthUserId(), currentUserIdOrParams);
}

export const startConversation = openOrCreateConversation;

export async function rejectConversation(
  matchId: string,
  currentUserId: string,
  reason = "not_a_match",
): Promise<void> {
  const payload = {
    status: "rejected",
    rejection_reason: reason,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase as any).from("matches").update(payload).eq("id", matchId);
  if (!error) {
    window.dispatchEvent(new CustomEvent("finding:conversation-rejected", { detail: { matchId } }));
    return;
  }
  if (!error.message.includes("rejection_reason")) throw new Error(error.message);
  const { error: fallbackError } = await (supabase as any)
    .from("matches")
    .update({ status: "rejected", updated_at: payload.updated_at })
    .eq("id", matchId);
  if (fallbackError) throw new Error(fallbackError.message);
  window.dispatchEvent(new CustomEvent("finding:conversation-rejected", { detail: { matchId } }));
}

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
    .limit(1);

  if (readError) {
    throw new Error(readError.message);
  }
  if ((existing ?? []).length > 0) return;

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
 * Insert through the persisted conversation id used by `matches`.
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

export async function ensureSystemWelcomeMessage(
  matchId: string,
  senderId: string,
  partnerName = "Finding partner",
  matchTag?: string | null,
): Promise<DBMessage | null> {
  const { data: existing, error: readError } = await supabase
    .from("messages")
    .select("id, content")
    .eq("match_id", matchId)
    .limit(20);

  if (readError) {
    console.warn("[chat] system welcome check failed:", readError.message);
    return null;
  }
  const existingMessages = (existing ?? []) as Array<{ content: string }>;
  if (existingMessages.some((message) => message.content.startsWith(SYSTEM_MESSAGE_PREFIX))) {
    return null;
  }

  const tag = matchTag || "Finding match";
  const { data, error } = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: senderId,
      content: `${SYSTEM_MESSAGE_PREFIX}Match accepted with ${partnerName}. Conversation opened from ${tag}.`,
    })
    .select("id, match_id, sender_id, content, created_at")
    .single();

  if (error) {
    console.warn("[chat] system welcome failed:", error.message);
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
