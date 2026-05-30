import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type InformationCard = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  summary: string | null;
  details: string | null;
  tags: string[];
  media_urls: string[];
  voice_intro_url: string | null;
  visibility: "public" | "private";
  created_at: string | null;
  updated_at: string | null;
};

export type InformationCardInput = {
  title: string;
  category?: string;
  summary?: string | null;
  details?: string | null;
  tags?: string[];
  media_urls?: string[];
  voice_intro_url?: string | null;
  visibility?: "public" | "private";
};

const CARD_BUCKET = "card-media";

export async function loadInformationCards(userId: string): Promise<InformationCard[]> {
  const { data, error } = await (supabase as any)
    .from("information_cards")
    .select("id, user_id, title, category, summary, details, tags, media_urls, voice_intro_url, visibility, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as any[]).map(normalizeCard);
}

export async function saveInformationCard(
  user: User,
  input: InformationCardInput,
  id?: string,
): Promise<InformationCard> {
  const payload = {
    user_id: user.id,
    title: input.title.trim(),
    category: input.category ?? "Skill",
    summary: input.summary?.trim() || null,
    details: input.details?.trim() || null,
    tags: input.tags ?? [],
    media_urls: input.media_urls ?? [],
    voice_intro_url: input.voice_intro_url ?? null,
    visibility: input.visibility ?? "public",
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? (supabase as any).from("information_cards").update(payload).eq("id", id).eq("user_id", user.id)
    : (supabase as any).from("information_cards").insert(payload);

  const { data, error } = await query.select("id, user_id, title, category, summary, details, tags, media_urls, voice_intro_url, visibility, created_at, updated_at").single();
  if (error) throw error;
  return normalizeCard(data);
}

export async function deleteInformationCard(user: User, id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("information_cards")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function uploadCardMedia(user: User, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const path = `${user.id}/${Date.now()}-${safeName || `card.${ext}`}`;
  const { error } = await supabase.storage.from(CARD_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(CARD_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function normalizeCard(row: any): InformationCard {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? ""),
    category: String(row.category ?? "Skill"),
    summary: row.summary ?? null,
    details: row.details ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    voice_intro_url: row.voice_intro_url ?? null,
    visibility: row.visibility === "private" ? "private" : "public",
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}
