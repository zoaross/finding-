import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type PortfolioItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  year: string | null;
  role: string | null;
  project_background: string | null;
  contribution: string | null;
  outcome: string | null;
  tools: string[];
  external_links: string[];
  media_url: string;
  media_urls: string[];
  media_type: "image" | "video";
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type PortfolioInput = {
  title: string;
  description?: string | null;
  year?: string | null;
  role?: string | null;
  project_background?: string | null;
  contribution?: string | null;
  outcome?: string | null;
  tools?: string[];
  external_links?: string[];
  media_url: string;
  media_urls?: string[];
  media_type: "image" | "video";
  sort_order?: number;
};

const PORTFOLIO_BUCKET = "portfolio-media";

export async function loadPortfolioItems(userId: string): Promise<PortfolioItem[]> {
  const { data, error } = await (supabase as any)
    .from("portfolio_items")
    .select(
      "id, user_id, title, description, year, role, project_background, contribution, outcome, tools, external_links, media_url, media_urls, media_type, sort_order, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map(normalizePortfolioItem);
}

export async function savePortfolioItem(
  user: User,
  input: PortfolioInput,
  id?: string,
): Promise<PortfolioItem> {
  const payload = {
    user_id: user.id,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    year: input.year?.trim() || null,
    role: input.role?.trim() || null,
    project_background: input.project_background?.trim() || null,
    contribution: input.contribution?.trim() || null,
    outcome: input.outcome?.trim() || null,
    tools: input.tools ?? [],
    external_links: input.external_links ?? [],
    media_url: input.media_url,
    media_urls: input.media_urls?.length ? input.media_urls : [input.media_url],
    media_type: input.media_type,
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };

  const query = id
    ? (supabase as any).from("portfolio_items").update(payload).eq("id", id).eq("user_id", user.id)
    : (supabase as any).from("portfolio_items").insert(payload);

  const { data, error } = await query
    .select(
      "id, user_id, title, description, year, role, project_background, contribution, outcome, tools, external_links, media_url, media_urls, media_type, sort_order, created_at, updated_at",
    )
    .single();
  if (error) throw error;
  return normalizePortfolioItem(data);
}

export async function deletePortfolioItem(user: User, id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function reorderPortfolioItems(user: User, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    (supabase as any)
      .from("portfolio_items")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export async function uploadPortfolioMedia(user: User, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
  const path = `${user.id}/${Date.now()}-${safeName || "portfolio-media"}`;
  const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function normalizePortfolioItem(row: any): PortfolioItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title ?? ""),
    description: row.description ?? null,
    year: row.year ?? null,
    role: row.role ?? null,
    project_background: row.project_background ?? null,
    contribution: row.contribution ?? null,
    outcome: row.outcome ?? null,
    tools: Array.isArray(row.tools) ? row.tools.map(String) : [],
    external_links: Array.isArray(row.external_links) ? row.external_links.map(String) : [],
    media_url: String(row.media_url ?? ""),
    media_urls: Array.isArray(row.media_urls)
      ? row.media_urls.map(String)
      : row.media_url
        ? [String(row.media_url)]
        : [],
    media_type: row.media_type === "video" ? "video" : "image",
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}
