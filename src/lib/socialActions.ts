import { supabase } from "@/lib/supabase";

export type UserSettingsPayload = {
  app_language?: "zh" | "en" | "ko";
  translation_language?: "zh" | "en" | "ko";
  notification_settings?: Record<string, unknown>;
  privacy_settings?: Record<string, unknown>;
  chat_settings?: Record<string, unknown>;
  ai_preferences?: Record<string, unknown>;
  appearance_settings?: Record<string, unknown>;
};

export async function loadUserSettings(userId: string) {
  const { data, error } = await (supabase as any)
    .from("user_settings")
    .select(
      "app_language, translation_language, notification_settings, privacy_settings, chat_settings, ai_preferences, appearance_settings",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as (UserSettingsPayload & { user_id?: string }) | null;
}

export async function saveUserSettings(userId: string, payload: UserSettingsPayload) {
  const { error } = await (supabase as any)
    .from("user_settings")
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function isSavedUser(userId: string, targetProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("saved_users")
    .select("id")
    .eq("user_id", userId)
    .eq("target_profile_id", targetProfileId)
    .limit(1);
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function setSavedUser(userId: string, targetProfileId: string, saved: boolean) {
  if (saved) {
    const { error } = await (supabase as any)
      .from("saved_users")
      .upsert(
        { user_id: userId, target_profile_id: targetProfileId },
        { onConflict: "user_id,target_profile_id" },
      );
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await (supabase as any)
    .from("saved_users")
    .delete()
    .eq("user_id", userId)
    .eq("target_profile_id", targetProfileId);
  if (error) throw new Error(error.message);
}

export async function setSavedNeed(userId: string, needId: string, saved: boolean) {
  if (saved) {
    const { error } = await (supabase as any)
      .from("saved_needs")
      .upsert({ user_id: userId, need_id: needId }, { onConflict: "user_id,need_id" });
    if (error) throw new Error(error.message);
    await (supabase as any)
      .from("bookmarks")
      .upsert({ user_id: userId, need_id: needId }, { onConflict: "user_id,need_id" });
    return;
  }
  const [{ error }, legacy] = await Promise.all([
    (supabase as any).from("saved_needs").delete().eq("user_id", userId).eq("need_id", needId),
    (supabase as any).from("bookmarks").delete().eq("user_id", userId).eq("need_id", needId),
  ]);
  if (error) throw new Error(error.message);
  if (legacy.error) console.warn("[social] legacy bookmark delete failed:", legacy.error.message);
}

export async function setSavedCard(userId: string, cardId: string, saved: boolean) {
  if (saved) {
    const { error } = await (supabase as any)
      .from("saved_cards")
      .upsert({ user_id: userId, card_id: cardId }, { onConflict: "user_id,card_id" });
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await (supabase as any)
    .from("saved_cards")
    .delete()
    .eq("user_id", userId)
    .eq("card_id", cardId);
  if (error) throw new Error(error.message);
}

export async function isSavedCard(userId: string, cardId: string) {
  const { data, error } = await (supabase as any)
    .from("saved_cards")
    .select("id")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .limit(1);
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0;
}

export async function setSavedPortfolioItem(
  userId: string,
  portfolioItemId: string,
  saved: boolean,
) {
  if (saved) {
    const { error } = await (supabase as any)
      .from("saved_portfolio_items")
      .upsert(
        { user_id: userId, portfolio_item_id: portfolioItemId },
        { onConflict: "user_id,portfolio_item_id" },
      );
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await (supabase as any)
    .from("saved_portfolio_items")
    .delete()
    .eq("user_id", userId)
    .eq("portfolio_item_id", portfolioItemId);
  if (error) throw new Error(error.message);
}

export async function blockProfile(userId: string, targetProfileId: string, reason?: string) {
  const { error } = await (supabase as any)
    .from("blocked_users")
    .upsert(
      { blocker_id: userId, blocked_profile_id: targetProfileId, reason: reason ?? null },
      { onConflict: "blocker_id,blocked_profile_id" },
    );
  if (error) throw new Error(error.message);
}

export async function unblockProfile(userId: string, targetProfileId: string) {
  const { error } = await (supabase as any)
    .from("blocked_users")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_profile_id", targetProfileId);
  if (error) throw new Error(error.message);
}

export async function hasBlockBetween(userId: string, targetProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${userId},blocked_profile_id.eq.${targetProfileId}),and(blocker_id.eq.${targetProfileId},blocked_profile_id.eq.${userId})`,
    )
    .limit(1);
  if (error) throw new Error(error.message);
  return !!data?.length;
}

export async function reportProfile(
  reporterId: string,
  targetProfileId: string,
  reason: string,
  note?: string,
) {
  const { error } = await (supabase as any).from("reports").insert({
    reporter_id: reporterId,
    target_profile_id: targetProfileId,
    reason,
    note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export type NeedCloseReason =
  | "found_someone"
  | "temporarily_not_needed"
  | "bad_match_quality"
  | "wrong_content"
  | "other";

export async function saveNeedCloseFeedback(
  userId: string,
  needId: string,
  reason: NeedCloseReason,
  feedback?: string,
) {
  const { error } = await (supabase as any).from("need_feedback").insert({
    user_id: userId,
    need_id: needId,
    event_type: "close",
    reason,
    feedback: feedback?.trim() || null,
  });
  if (error) throw new Error(error.message);
}
