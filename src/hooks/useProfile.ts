import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  latitude_rounded: number | null;
  longitude_rounded: number | null;
  location_accuracy_meters: number | null;
  show_region: boolean | null;
  language: string | null;
  skills: string[] | null;
  reputation_score: number | null;
  birth_date: string | null;
  is_adult_verified: boolean | null;
  created_at: string | null;
};

const empty = (id: string): Profile => ({
  id,
  username: null,
  avatar_url: null,
  avatar_emoji: null,
  bio: null,
  location: null,
  country: null,
  city: null,
  region: null,
  latitude_rounded: null,
  longitude_rounded: null,
  location_accuracy_meters: null,
  show_region: true,
  language: null,
  skills: null,
  reputation_score: null,
  birth_date: null,
  is_adult_verified: null,
  created_at: null,
});

/**
 * Fetch + cache the current authenticated user's profile row from
 * `public.profiles`. Falls back gracefully (returns nulls) if the row
 * or the table does not yet exist, so the UI keeps rendering.
 */
export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!user);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, avatar_url, avatar_emoji, bio, location, country, city, region, latitude_rounded, longitude_rounded, location_accuracy_meters, show_region, language, skills, reputation_score, birth_date, is_adult_verified, created_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      // Table missing or RLS blocked — degrade gracefully.
      console.warn("[useProfile] fetch failed:", error.message);
      const meta = (user.user_metadata ?? {}) as {
        display_name?: string;
        avatar_url?: string;
        bio?: string;
      };
      setProfile({
        ...empty(user.id),
        username: meta.display_name ?? user.email?.split("@")[0] ?? null,
        avatar_url: meta.avatar_url ?? null,
        bio: meta.bio ?? null,
        created_at: user.created_at ?? null,
      });
    } else if (!data) {
      // No row yet — synthesize one from auth metadata.
      const meta = (user.user_metadata ?? {}) as {
        display_name?: string;
        avatar_url?: string;
        bio?: string;
      };
      setProfile({
        ...empty(user.id),
        username: meta.display_name ?? user.email?.split("@")[0] ?? null,
        avatar_url: meta.avatar_url ?? null,
        bio: meta.bio ?? null,
        created_at: user.created_at ?? null,
      });
    } else {
      // Row exists but `username` may be null — fall back to auth metadata
      // or the email local-part so UI surfaces never render a bare "@".
      const meta = (user.user_metadata ?? {}) as {
        display_name?: string;
        avatar_url?: string;
        bio?: string;
      };
      const fallbackName = meta.display_name ?? user.email?.split("@")[0] ?? null;
      setProfile({
        ...(data as Profile),
        username: (data as Profile).username ?? fallbackName,
        avatar_url: (data as Profile).avatar_url ?? meta.avatar_url ?? null,
        bio: (data as Profile).bio ?? meta.bio ?? null,
        created_at: (data as Profile).created_at ?? user.created_at ?? null,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh, setProfile };
}

/**
 * Save profile fields.
 * Uses UPDATE when the row exists (safe with owner-update RLS policy),
 * falls back to INSERT for first-time users (requires owner-insert policy).
 * Avoids upsert to sidestep the RLS INSERT-before-UPDATE behavior.
 */
export async function saveProfile(
  user: User,
  patch: Partial<Omit<Profile, "id" | "created_at">>,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (...a: unknown[]) => {
        eq: (...a: unknown[]) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
      };
      update: (...a: unknown[]) => {
        eq: (...a: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      insert: (...a: unknown[]) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };

  const now = new Date().toISOString();

  // 1. Check whether the row already exists
  const { data: existing } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();

  if (existing) {
    // Row exists → UPDATE (covered by "Owner update profile" policy)
    const result = await db
      .from("profiles")
      .update({ ...patch, updated_at: now })
      .eq("id", user.id);
    return result as { data: unknown; error: { message: string } | null };
  } else {
    // No row yet → INSERT (requires "Owner insert profile" policy)
    const result = await db.from("profiles").insert({ id: user.id, ...patch, updated_at: now });
    return result as { data: unknown; error: { message: string } | null };
  }
}

/**
 * Upload an avatar image to the `avatars` storage bucket and return the
 * public URL. The file is namespaced under the user's id so RLS policies
 * scoped to `auth.uid()::text = (storage.foldername(name))[1]` work.
 */
export async function uploadAvatar(user: User, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/png",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
