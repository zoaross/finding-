import { supabase } from "@/lib/supabase";

export const HIDDEN_REAL_MATCH_STATUSES = ["rejected", "closed", "dismissed", "completed"];

type MatchRow = {
  id: string;
  need_id: string | null;
  participant_one_id: string | null;
  participant_two_id: string | null;
  participant_two_profile_id: string | null;
  partner_name: string | null;
  match_tag: string | null;
  match_score: number | null;
  status: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_emoji: string | null;
  bio: string | null;
  location: string | null;
  reputation_score: number | null;
  is_simulated?: boolean | null;
};

export type RealIdentityCard = {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  summary: string | null;
  details: string | null;
  tags: string[] | null;
  supply_skills?: string[] | null;
  supply_languages?: string[] | null;
  supply_country?: string | null;
  supply_city?: string | null;
  offer_summary?: string | null;
  connection_preferences?: string | null;
  media_urls?: string[] | null;
  voice_intro_url?: string | null;
  reputation_score?: number | null;
  response_rate?: number | null;
  created_at?: string | null;
};

export type RealMatch = {
  id: string;
  needId: string;
  profileId: string;
  username: string;
  displayName: string;
  avatar: string;
  headline: string;
  location: string;
  score: number;
  reputation: number;
  status: string;
  updatedAt: string | null;
  cards: RealIdentityCard[];
  primaryCard: RealIdentityCard;
  cardId: string;
  cardTitle: string;
  dataSource: "real_supabase";
};

export type RealMatchResult = {
  matches: RealMatch[];
  realMatchCount: number;
  seedFilteredCount: number;
  source: "real_supabase";
};

export type RealMatchCount = {
  real: number;
  seedFiltered: number;
  source: "real_supabase";
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "F";
}

function hiddenFilter() {
  return `(${HIDDEN_REAL_MATCH_STATUSES.join(",")})`;
}

function partnerIdFor(row: MatchRow) {
  return row.participant_two_profile_id ?? row.participant_two_id ?? null;
}

async function rowsToRealMatches(rows: MatchRow[]): Promise<RealMatchResult> {
  const profileIds = [...new Set(rows.map(partnerIdFor).filter(Boolean) as string[])];
  if (!profileIds.length) {
    return { matches: [], realMatchCount: 0, seedFilteredCount: 0, source: "real_supabase" };
  }

  const [{ data: profileRows, error: profileError }, { data: cardRows, error: cardError }] =
    await Promise.all([
      (supabase as any)
        .from("profiles")
        .select(
          "id, username, display_name, avatar_emoji, bio, location, reputation_score, is_simulated",
        )
        .in("id", profileIds),
      (supabase as any)
        .from("information_cards")
        .select(
          "id, user_id, title, category, summary, details, tags, supply_skills, supply_languages, supply_country, supply_city, offer_summary, connection_preferences, media_urls, voice_intro_url, reputation_score, response_rate, created_at",
        )
        .in("user_id", profileIds)
        .eq("visibility", "public")
        .order("created_at", { ascending: false }),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (cardError) throw new Error(cardError.message);

  const profiles = new Map<string, ProfileRow>(
    ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const cardsByProfile = new Map<string, RealIdentityCard[]>();
  for (const card of (cardRows ?? []) as RealIdentityCard[]) {
    cardsByProfile.set(card.user_id, [...(cardsByProfile.get(card.user_id) ?? []), card]);
  }

  let seedFilteredCount = 0;
  const matches = rows
    .map((row): RealMatch | null => {
      const profileId = partnerIdFor(row);
      if (!profileId || !row.need_id) return null;
      const profile = profiles.get(profileId);
      if (!profile) return null;
      if (profile.is_simulated) {
        seedFilteredCount += 1;
        return null;
      }
      const cards = cardsByProfile.get(profileId) ?? [];
      const primaryCard = cards[0];
      if (!primaryCard) return null;
      const username = profile.username ?? row.partner_name ?? profile.id;
      const displayName = profile.display_name ?? profile.username ?? row.partner_name ?? "Finding user";
      return {
        id: row.id,
        needId: row.need_id,
        profileId,
        username,
        displayName,
        avatar: profile.avatar_emoji ?? initials(displayName),
        headline: primaryCard.title ?? row.match_tag ?? profile.bio ?? "Finding profile",
        location:
          profile.location ??
          [primaryCard.supply_city, primaryCard.supply_country].filter(Boolean).join(", ") ??
          "Global",
        score: Number(row.match_score ?? 0),
        reputation: Number(profile.reputation_score ?? primaryCard.reputation_score ?? 5),
        status: row.status ?? "active",
        updatedAt: row.updated_at,
        cards,
        primaryCard,
        cardId: primaryCard.id,
        cardTitle: primaryCard.title,
        dataSource: "real_supabase",
      };
    })
    .filter(Boolean) as RealMatch[];

  return {
    matches,
    realMatchCount: matches.length,
    seedFilteredCount,
    source: "real_supabase",
  };
}

export async function getRealMatchesForNeed(needId: string): Promise<RealMatchResult> {
  const { data, error } = await (supabase as any)
    .from("matches")
    .select(
      "id, need_id, participant_one_id, participant_two_id, participant_two_profile_id, partner_name, match_tag, match_score, status, updated_at",
    )
    .eq("need_id", needId)
    .not("status", "in", hiddenFilter())
    .order("match_score", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rowsToRealMatches(((data ?? []) as MatchRow[]).filter((row) => !!row.need_id));
}

export async function getRealMatchesForUser(userId: string): Promise<RealMatchResult> {
  const { data, error } = await (supabase as any)
    .from("matches")
    .select(
      "id, need_id, participant_one_id, participant_two_id, participant_two_profile_id, partner_name, match_tag, match_score, status, updated_at",
    )
    .eq("participant_one_id", userId)
    .not("status", "in", hiddenFilter())
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rowsToRealMatches(((data ?? []) as MatchRow[]).filter((row) => !!row.need_id));
}

export async function getRealMatchCountsForNeeds(needIds: string[]): Promise<Record<string, RealMatchCount>> {
  const next: Record<string, RealMatchCount> = {};
  for (const id of needIds) next[id] = { real: 0, seedFiltered: 0, source: "real_supabase" };
  if (!needIds.length) return next;

  const { data, error } = await (supabase as any)
    .from("matches")
    .select(
      "id, need_id, participant_one_id, participant_two_id, participant_two_profile_id, partner_name, match_tag, match_score, status, updated_at",
    )
    .in("need_id", needIds)
    .not("status", "in", hiddenFilter());
  if (error) throw new Error(error.message);

  const rowsByNeed = new Map<string, MatchRow[]>();
  for (const row of ((data ?? []) as MatchRow[]).filter((row) => !!row.need_id)) {
    rowsByNeed.set(row.need_id as string, [...(rowsByNeed.get(row.need_id as string) ?? []), row]);
  }

  await Promise.all(
    Array.from(rowsByNeed.entries()).map(async ([needId, rows]) => {
      const result = await rowsToRealMatches(rows);
      next[needId] = {
        real: result.realMatchCount,
        seedFiltered: result.seedFilteredCount,
        source: "real_supabase",
      };
    }),
  );

  return next;
}

export async function hasPublicIdentityCard(profileId: string): Promise<boolean> {
  const { data, error } = await (supabase as any)
    .from("information_cards")
    .select("id")
    .eq("user_id", profileId)
    .eq("visibility", "public")
    .limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string }>).length > 0;
}
