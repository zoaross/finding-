/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { HIDDEN_CONVERSATION_STATUSES, openOrCreateConversation } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { setSavedNeed } from "@/lib/socialActions";
import { parseNeedIntent } from "@/lib/claude";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/lib/i18n";
import {
  FindingMark,
  IconTarget,
  IconGlobe,
  IconChat,
  IconBell,
  IconSettings,
  IconUser,
  IconLogout,
  IconShield,
  IconInfinity,
} from "@/components/icons/FindingIcons";
import { ProfilePreviewModal, type ProfilePreviewData } from "@/components/ProfilePreviewModal";
import { SearchDropdown } from "@/components/SearchDropdown";

export const Route = createFileRoute("/home")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Home — Finding." },
      { name: "description", content: "Finding home — global needs and intelligent matching." },
    ],
  }),
});

// ── Types ────────────────────────────────────────────────────────────────────

type FeedItem = {
  id: string;
  emoji: string;
  text: string;
  region: string;
  time: string;
  color: "accent" | "green" | "blue";
};

type HotNeed = {
  id: string;
  posterId?: string | null;
  rank: number;
  title: string;
  heat: number;
  views: number;
  tag: string;
  trend: string;
};

type RecUser = {
  id: string;
  name: string;
  title: string;
  region: string;
  match: number;
  emoji: string;
};

type KnownPerson = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  mutual: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string, lang: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const locale = lang === "zh" ? "zh-CN" : lang;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60) return rtf.format(0, "second");
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), "hour");
  if (diff < 86400 * 7) return rtf.format(-Math.floor(diff / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/** Deterministic number from a string ID so cards look stable across renders */
function idHash(id: string, mod: number, offset = 0): number {
  const h = id.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0);
  return (Math.abs(h) % mod) + offset;
}

function explainNeedError(message: string) {
  if (message.includes("public.needs") || message.includes("schema cache")) {
    return `${message}\nRun supabase/fix_public_needs.sql in Supabase SQL Editor, then reload this page.`;
  }
  return message;
}

// ── Nav ──────────────────────────────────────────────────────────────────────

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const, active: true },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const },
];

const REGION_OPTIONS = [
  { key: "global", labelKey: "region.global" },
  { key: "asia", labelKey: "region.asia" },
  { key: "europeAmerica", labelKey: "region.europeAmerica" },
  { key: "remote", labelKey: "region.remote" },
  { key: "northAmerica", labelKey: "region.northAmerica" },
  { key: "southeastAsia", labelKey: "region.southeastAsia" },
  { key: "africa", labelKey: "region.africa" },
] as const;

const feedColor: Record<string, string> = {
  accent: "border-accent/30 bg-accent/10 text-accent",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

type NeedDetail = {
  id?: string;
  posterId?: string | null;
  title: string;
  description: string;
  tags: string[];
  poster: string;
  emoji: string;
};

// ── Component ─────────────────────────────────────────────────────────────────

function HomePage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [need, setNeed] = useState("");
  const [matchState, setMatchState] = useState<"idle" | "matching" | "success">("idle");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [needDetail, setNeedDetail] = useState<NeedDetail | null>(null);
  const [profilePreview, setProfilePreview] = useState<ProfilePreviewData | null>(null);
  const [savedNeeds, setSavedNeeds] = useState<Set<string>>(new Set());

  // ── Real data state ──
  const [activeNeedCount, setActiveNeedCount] = useState<number | null>(null);
  const [totalMatchCount, setTotalMatchCount] = useState<number | null>(null);
  const [userConvCount, setUserConvCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<string>("…");
  const [todayNeedsStr, setTodayNeedsStr] = useState<string>("…");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [hotNeedsItems, setHotNeedsItems] = useState<HotNeed[]>([]);
  const [recUsers, setRecUsers] = useState<RecUser[]>([]);
  const [knownPeople, setKnownPeople] = useState<KnownPerson[]>([]);

  // ── Handlers ──
  const openChatWith = async (
    name: string,
    target?: { userId?: string | null; needId?: string | null; matchTag?: string | null },
  ) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: target?.userId,
        partnerUsername: name,
        partnerName: name,
        sourceNeedId: target?.needId,
        matchTag: target?.matchTag,
      });
      toast.success(t("home.chatOpened", { name }));
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("messages.sendFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleRegion = (tag: string) => {
    setSelectedRegions((s) => (s.includes(tag) ? s.filter((r) => r !== tag) : [...s, tag]));
  };

  const openProfile = (
    name: string,
    initial: string,
    extra: { role: string; region?: string; tags?: string[]; bio?: string },
    userId?: string | null,
  ) => {
    setProfilePreview({
      userId,
      name,
      initial,
      role: extra.role,
      region: extra.region,
      bio: extra.bio ?? t("home.partnerBio", { name, role: extra.role }),
      tags: extra.tags ?? [t("region.remote"), "cross-cultural", "responsive"],
    });
  };

  const openHotNeed = (h: HotNeed) => {
    setNeedDetail({
      id: h.id,
      posterId: h.posterId,
      title: h.title,
      description: t("home.hotNeedDesc"),
      tags: [h.tag, t("home.popular"), t("home.global")],
      poster: t("home.publisher"),
      emoji: "🔥",
    });
  };

  const toggleSaveNeed = async (needId?: string) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!needId) return;
    const already = savedNeeds.has(needId);
    setSavedNeeds((current) => {
      const next = new Set(current);
      if (already) next.delete(needId);
      else next.add(needId);
      return next;
    });
    try {
      await setSavedNeed(user.id, needId, !already);
      toast.success(!already ? t("social.saved") : t("social.unsaved"));
    } catch (error) {
      setSavedNeeds((current) => {
        const next = new Set(current);
        if (already) next.add(needId);
        else next.delete(needId);
        return next;
      });
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const openLiveItem = (f: FeedItem) => {
    setNeedDetail({
      title: f.text,
      description: t("home.liveNeedDesc", { region: f.region }),
      tags: [t("home.realtime"), f.region.replace(/^\S+\s/, "")],
      poster: f.text.split(" ")[0],
      emoji: f.emoji,
    });
  };

  // ── Data loading ──
  const refreshActiveCount = async (uid: string) => {
    const { count } = await supabase
      .from("needs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("is_archived", false);
    setActiveNeedCount(count ?? 0);
  };

  const loadPageData = async (uid: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const db = supabase as unknown as {
      from: (t: string) => {
        select: (...a: unknown[]) => {
          neq: (...a: unknown[]) => unknown;
          not: (...a: unknown[]) => unknown;
          gte: (...a: unknown[]) => unknown;
          eq: (...a: unknown[]) => unknown;
          in: (...a: unknown[]) => unknown;
          order: (...a: unknown[]) => unknown;
          limit: (...a: unknown[]) => unknown;
        };
      };
    };

    try {
      // ── Counts ──
      const [todayR, profilesR, matchRowsR, c1R, c2R] = await Promise.all([
        (supabase as any)
          .from("needs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString())
          .eq("is_archived", false),
        (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
        (supabase as any)
          .from("matches")
          .select("participant_two_id, participant_two_profile_id")
          .not("status", "in", `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`),
        (supabase as any)
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("participant_one_id", uid)
          .not("status", "in", `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`),
        (supabase as any)
          .from("matches")
          .select("id", { count: "exact", head: true })
          .eq("participant_two_id", uid)
          .not("status", "in", `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`),
      ] as Promise<{ count: number | null }>[]);

      const todayN = (todayR as any).count ?? 0;
      const profTotal = (profilesR as any).count ?? 0;
      const matchRows = ((matchRowsR as any).data ?? []) as Array<{
        participant_two_id?: string | null;
        participant_two_profile_id?: string | null;
      }>;
      const matchProfileIds = [
        ...new Set(
          matchRows
            .map((row) => row.participant_two_profile_id ?? row.participant_two_id)
            .filter(Boolean) as string[],
        ),
      ];
      const { data: matchProfiles } = matchProfileIds.length
        ? await (supabase as any).from("profiles").select("id, is_simulated").in("id", matchProfileIds)
        : { data: [] };
      const simulatedMatchProfileIds = new Set(
        ((matchProfiles as any[]) ?? [])
          .filter((profile) => profile.is_simulated)
          .map((profile) => profile.id as string),
      );
      const matchTotal = matchRows.filter((row) => {
        const profileId = row.participant_two_profile_id ?? row.participant_two_id;
        return profileId && !simulatedMatchProfileIds.has(profileId);
      }).length;
      const c1 = (c1R as any).count ?? 0;
      const c2 = (c2R as any).count ?? 0;

      setTodayNeedsStr(todayN > 0 ? `+${todayN}` : "0");
      setOnlineCount(profTotal > 0 ? profTotal.toLocaleString() : "—");
      setTotalMatchCount(matchTotal);
      setUserConvCount(c1 + c2);

      // ── Live feed (recent 5 needs) ──
      const { data: recentNeeds } = await (supabase as any)
        .from("needs")
        .select("id, content, created_at, user_id, parsed_intent")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentNeeds && recentNeeds.length > 0) {
        const userIds = [...new Set((recentNeeds as any[]).map((n) => n.user_id as string))];
        const { data: profData } = await (supabase as any)
          .from("profiles")
          .select("id, username")
          .in("id", userIds);

        const nameMap = new Map<string, string>(
          ((profData as any[]) ?? []).map((p) => [
            p.id as string,
            (p.username as string) ?? t("home.userFallback"),
          ]),
        );
        const COLORS = ["accent", "green", "blue"] as const;
        const items: FeedItem[] = (recentNeeds as any[]).map((n, i) => ({
          id: n.id as string,
          emoji: "📝",
          text: t("home.newNeedActivity", {
            name: nameMap.get(n.user_id as string) ?? t("home.userFallback"),
            content: `${(n.content as string).slice(0, 22)}${(n.content as string).length > 22 ? "…" : ""}`,
          }),
          region: `🌏 ${t("home.global")}`,
          time: formatTime(n.created_at as string, lang),
          color: COLORS[i % 3],
        }));
        setFeedItems(items);
      }

      // ── Hot needs (most recent 3 active) ──
      const { data: hotData } = await (supabase as any)
        .from("needs")
        .select("id, content, created_at, parsed_intent, user_id")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(3);

      if (hotData && hotData.length > 0) {
        const trends = ["🔥🔥🔥", "🔥🔥", "🔥"];
        const items: HotNeed[] = (hotData as any[]).map((n, i) => {
          const tags = Array.isArray(n.parsed_intent?.tags)
            ? (n.parsed_intent.tags as string[])
            : [];
          return {
            id: n.id as string,
            posterId: n.user_id as string,
            rank: i + 1,
            title:
              (n.content as string).slice(0, 36) + ((n.content as string).length > 36 ? "…" : ""),
            tag: tags[0] ?? t("home.needFallback"),
            views: idHash(n.id as string, 900, 300),
            heat: idHash(n.id as string, 2000, 800),
            trend: trends[i],
          };
        });
        setHotNeedsItems(items);
      }

      // ── Recommendations + People you may know (real profiles) ──
      const { data: otherProfiles } = await (supabase as any)
        .from("profiles")
        .select("id, username, bio, location, avatar_url, avatar_emoji")
        .neq("id", uid)
        .limit(8);

      if (otherProfiles && otherProfiles.length > 0) {
        const { data: blockedRows } = await (supabase as any)
          .from("blocked_users")
          .select("blocked_profile_id")
          .eq("blocker_id", uid);
        const { data: hiddenMatchRows } = await (supabase as any)
          .from("matches")
          .select("participant_two_id, participant_two_profile_id")
          .eq("participant_one_id", uid)
          .in("status", HIDDEN_CONVERSATION_STATUSES);
        const blockedIds = new Set(
          ((blockedRows as any[]) ?? []).map((r: any) => r.blocked_profile_id as string),
        );
        const hiddenPartnerIds = new Set(
          ((hiddenMatchRows as any[]) ?? [])
            .flatMap((r: any) => [r.participant_two_profile_id, r.participant_two_id])
            .filter(Boolean) as string[],
        );
        const profs = (otherProfiles as any[]).filter(
          (p: any) => !blockedIds.has(p.id as string) && !hiddenPartnerIds.has(p.id as string),
        );
        const toRecUser = (p: any): RecUser => ({
          id: p.id as string,
          name: (p.username as string) ?? t("home.userFallback"),
          title: p.bio ? (p.bio as string).slice(0, 18) : t("home.findingUser"),
          region: (p.location as string) ?? `🌏 ${t("home.global")}`,
          match: idHash(p.id as string, 15, 82),
          emoji: (p.avatar_emoji as string) ?? (p.username as string)?.[0]?.toUpperCase() ?? "👤",
        });
        const toKnown = (p: any): KnownPerson => ({
          id: p.id as string,
          name: (p.username as string) ?? t("home.userFallback"),
          role: p.bio ? (p.bio as string).slice(0, 14) : t("home.findingUser"),
          emoji: (p.avatar_emoji as string) ?? (p.username as string)?.[0]?.toUpperCase() ?? "👤",
          mutual: idHash(p.id as string, 7, 1),
        });
        setRecUsers(profs.slice(0, 3).map(toRecUser));
        setKnownPeople(profs.slice(3, 6).map(toKnown));
      }

      const { data: savedRows } = await (supabase as any)
        .from("saved_needs")
        .select("need_id")
        .eq("user_id", uid);
      if (savedRows) {
        setSavedNeeds(new Set((savedRows as any[]).map((row: any) => row.need_id as string)));
      }
    } catch (err) {
      console.warn("[home] loadPageData error:", err);
    }
  };

  // ── Auth + initial load ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      void refreshActiveCount(data.session.user.id);
      void loadPageData(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) navigate({ to: "/auth" });
      else {
        setUser(session.user);
        void refreshActiveCount(session.user.id);
        void loadPageData(session.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!need.trim() || matchState !== "idle") return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setMatchState("matching");
    const text = need.trim();
    const region = selectedRegions[0] ?? t("home.global");
    try {
      const { data: inserted, error: insertError } = await supabase
        .from("needs")
        .insert({
          user_id: user.id,
          content: text,
          status: "open",
          is_archived: false,
          parsed_intent: { region, regions: selectedRegions, tags: [] },
        })
        .select("id")
        .single();

      if (insertError) {
        console.warn("[home] need insert failed:", insertError.message);
        toast.error(t("home.postFailed"), { description: explainNeedError(insertError.message) });
        setMatchState("idle");
        return;
      } else {
        void refreshActiveCount(user.id);
        void parseNeedIntent(text, { region, regions: selectedRegions }).then(async (intent) => {
          if (!inserted?.id) return;
          await supabase.from("needs").update({ parsed_intent: intent }).eq("id", inserted.id);
        });
      }
      await supabase.auth.updateUser({ data: { latest_need: text } }).catch(() => {});
    } catch (err) {
      console.warn("[home] handlePost error:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("home.postFailed"), { description: explainNeedError(message) });
      setMatchState("idle");
      return;
    }
    setTimeout(() => setMatchState("success"), 3000);
  };

  const { profile } = useProfile(user);
  const displayName =
    profile?.username ||
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    user?.email?.split("@")[0] ||
    t("home.friend");
  const avatarUrl = profile?.avatar_url || null;

  const [greeting, setGreeting] = useState(() => t("home.greetingMorning"));
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 6
        ? t("home.greetingNight")
        : h < 12
          ? t("home.greetingMorning")
          : h < 18
            ? t("home.greetingAfternoon")
            : t("home.greetingEvening"),
    );
  }, [t]);

  // ── Stats cards ──
  const stats = [
    {
      label: t("home.stats.activeNeeds"),
      value: activeNeedCount === null ? "—" : String(activeNeedCount),
      trend: t("home.stats.live"),
      glow: true,
    },
    {
      label: t("home.stats.globalMatches"),
      value: totalMatchCount === null ? "—" : totalMatchCount.toLocaleString(),
      trend: t("home.stats.today"),
    },
    {
      label: t("home.stats.conversations"),
      value: userConvCount === null ? "—" : String(userConvCount),
      trend: t("home.stats.conversationUnit"),
    },
    { label: t("home.stats.completionRate"), value: "—", trend: t("home.stats.collecting") },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] gap-5 px-4 py-5 lg:px-6">
        {/* LEFT SIDEBAR */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 flex-shrink-0 flex-col rounded-3xl p-5 lg:flex"
        >
          <Link to="/" className="mb-8 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-strong)] bg-background/60 shadow-[var(--shadow-glow)]">
              <FindingMark size={26} />
            </span>
            <span className="font-display text-xl font-extrabold tracking-tight">
              Finding<span className="text-accent">.</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                    item.active
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-[var(--border-strong)]"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
            >
              <IconLogout size={14} />
              {t("nav.logout")}
            </button>
          </div>
        </motion.aside>

        {/* CENTER */}
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          {/* mobile top bar */}
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <FindingMark size={28} />
              <span className="font-display text-lg font-extrabold">
                Finding<span className="text-accent">.</span>
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[var(--border)] p-2 text-muted-foreground"
            >
              <IconLogout size={16} />
            </button>
          </div>

          {/* Search */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-30"
          >
            <SearchDropdown placeholder={t("home.searchPlaceholder")} />
          </motion.section>

          {/* Greeting */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              <span className="text-gradient">{displayName}</span>
              <span className="text-foreground">{t("home.greetingQuestion")}</span>
            </h1>
          </motion.section>

          {/* Stats — real data */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 gap-3 md:grid-cols-4"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className={`glass-card card-premium hover-lift rounded-2xl p-4 ${s.glow ? "border-[var(--border-strong)] shadow-[var(--shadow-glow)]" : ""}`}
              >
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-gradient">
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{s.trend}</p>
              </div>
            ))}
          </motion.section>

          {/* Need input */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card relative overflow-hidden rounded-3xl p-6 md:p-7"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-3xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-strong)] bg-background/40 text-accent">
                  <IconInfinity size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">{t("home.postNeed")}</h2>
                  <p className="text-xs text-muted-foreground">{t("home.postNeedDesc")}</p>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {matchState === "idle" && (
                  <motion.form
                    key="form"
                    onSubmit={handlePost}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <textarea
                      value={need}
                      onChange={(e) => setNeed(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }}
                      placeholder={t("home.needPlaceholder")}
                      rows={5}
                      className="w-full resize-none rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {REGION_OPTIONS.map((region) => {
                          const tag = t(region.labelKey);
                          const active = selectedRegions.includes(tag);
                          return (
                            <button
                              key={region.key}
                              type="button"
                              onClick={() => toggleRegion(tag)}
                              aria-pressed={active}
                              className={`rounded-full border px-3 py-1 text-xs transition-all active:scale-95 ${
                                active
                                  ? "border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                                  : "border-[var(--border)] bg-white/[0.02] text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="submit"
                        disabled={!need.trim()}
                        className="group inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t("home.matchNow")}
                        <span className="transition-transform group-hover:translate-x-0.5">→</span>
                      </button>
                    </div>
                  </motion.form>
                )}
                {matchState === "matching" && <MatchingView />}
                {matchState === "success" && (
                  <SuccessView
                    onView={() => navigate({ to: "/matches" })}
                    onContinue={() => {
                      setMatchState("idle");
                      setNeed("");
                    }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* PLATFORM LIVE FEED — real needs */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-3xl p-5 md:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-strong)] bg-background/40 text-accent">
                  <IconInfinity size={16} />
                </span>
                <h2 className="font-display text-lg font-bold">{t("home.platformLive")}</h2>
                <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  LIVE
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{t("home.realtimeGlobal")}</span>
            </div>
            {feedItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("home.noLatestActivity")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {feedItems.map((f, i) => (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.06 }}
                  >
                    <button
                      type="button"
                      onClick={() => openLiveItem(f)}
                      className="flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors hover:bg-white/5 last:border-b-0"
                    >
                      <span
                        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border text-sm ${feedColor[f.color]}`}
                      >
                        {f.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{f.text}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {f.region} · {f.time}
                        </p>
                      </div>
                      <span className="text-muted-foreground/50">→</span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* RECENT MATCHES — kept as informational placeholder */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("home.recentMatches")}</h2>
              <Link to="/needs" className="text-xs text-accent hover:underline">
                {t("home.viewAllArrow")}
              </Link>
            </div>
            {recUsers.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
                {t("home.matchesAfterPosting")}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recUsers.map((m, i) => (
                  <motion.button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      openProfile(m.name, m.emoji, { role: m.title, region: m.region }, m.id)
                    }
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="glass-card card-premium hover-lift relative overflow-hidden rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
                  >
                    <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[image:var(--gradient-primary)] opacity-15 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-base font-bold text-primary-foreground">
                        {m.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{m.name}</p>
                          <span className="flex-shrink-0 rounded-full bg-[image:var(--gradient-primary)] px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                            {m.match}%
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{m.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          {m.region}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.section>
        </main>

        {/* RIGHT SIDEBAR */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden w-80 flex-shrink-0 flex-col gap-4 xl:flex"
        >
          {/* Live counters — real data */}
          <div className="glass-card grid grid-cols-2 gap-2 rounded-2xl p-3">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {t("home.onlineUsers")}
              </div>
              <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-emerald-300">
                {onlineCount}
              </p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-accent">
                {t("home.todayNewNeeds")}
              </div>
              <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-accent">
                {todayNeedsStr}
              </p>
            </div>
          </div>

          {/* Platform live feed */}
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold">{t("home.platformLive")}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  LIVE
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">{t("home.realtime")}</span>
            </div>
            {feedItems.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {t("home.noActivity")}
              </p>
            ) : (
              <ul className="flex flex-col">
                {feedItems.map((f, i) => (
                  <li
                    key={`rsb-${i}`}
                    className="flex items-start gap-2.5 border-b border-border/40 py-2 last:border-0"
                  >
                    <span
                      className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border text-xs ${feedColor[f.color]}`}
                    >
                      {f.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] leading-snug">{f.text}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {f.region} · {f.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Hot Needs — real data */}
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <h3 className="font-display text-base font-bold">{t("home.hotNeeds")}</h3>
              </div>
              <span className="text-[10px] text-muted-foreground">{t("home.today")}</span>
            </div>
            {hotNeedsItems.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {t("home.noHotNeeds")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {hotNeedsItems.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => openHotNeed(h)}
                      className="hover-lift block w-full rounded-xl border border-[var(--border)] bg-white/[0.02] p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-md font-display text-xs font-bold ${
                            h.rank === 1
                              ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                              : h.rank === 2
                                ? "bg-accent/20 text-accent"
                                : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {h.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-xs font-medium leading-snug">{h.title}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="rounded-full border border-border px-1.5 py-0.5">
                              {h.tag}
                            </span>
                            <span className="tabular-nums">👁 {h.views.toLocaleString()}</span>
                            <span className="tabular-nums">
                              {h.trend} {h.heat.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recommendations — real profiles */}
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <IconTarget size={16} className="text-accent" />
              <h3 className="font-display text-base font-bold">{t("home.recommendations")}</h3>
            </div>
            {recUsers.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {t("home.noRecommendations")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {recUsers.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-xl border border-[var(--border)] bg-white/[0.02] p-2.5 transition hover:border-[var(--border-strong)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openProfile(r.name, r.emoji, { role: r.title, region: r.region }, r.id)
                      }
                      className="flex w-full items-center gap-2.5 text-left transition active:scale-[0.99]"
                    >
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-base text-primary-foreground">
                        {r.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold hover:text-accent">
                            {r.name}
                          </p>
                          <span className="flex-shrink-0 rounded-full bg-[image:var(--gradient-primary)] px-1.5 py-0 text-[9px] font-bold text-primary-foreground">
                            {r.match}%
                          </span>
                        </div>
                        <p className="truncate text-[11px] text-muted-foreground">{r.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground/70">{r.region}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => void openChatWith(r.name, { userId: r.id, matchTag: r.title })}
                      className="mt-2 w-full rounded-lg border border-accent/30 bg-accent/10 py-1 text-[10px] font-semibold text-accent transition hover:bg-accent/20 active:scale-[0.98]"
                    >
                      {t("home.contactArrow")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/recommendations"
              className="mt-3 block rounded-lg border border-[var(--border)] bg-white/[0.02] py-1.5 text-center text-[10px] text-muted-foreground transition hover:border-[var(--border-strong)] hover:text-foreground"
            >
              {t("home.moreRecs")}
            </Link>
          </div>

          {/* People you may know */}
          <div className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-base font-bold">{t("home.peopleYouMayKnow")}</h3>
              <Link to="/recommendations" className="text-[10px] text-accent hover:underline">
                {t("home.more")}
              </Link>
            </div>
            {knownPeople.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                {t("home.noRecommendedUsers")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {knownPeople.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => openProfile(p.name, p.emoji, { role: p.role }, p.id)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition active:scale-[0.99]"
                    >
                      <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-[var(--border-strong)] bg-background/60 text-sm">
                        {p.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium hover:text-accent">{p.name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {p.role} · {t("home.mutualFriends", { n: p.mutual })}
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => void openChatWith(p.name, { userId: p.id, matchTag: p.role })}
                      className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-accent/40 hover:text-accent active:scale-95"
                    >
                      {t("common.message")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.aside>
      </div>

      {/* Need detail modal */}
      <AnimatePresence>
        {needDetail && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setNeedDetail(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card relative w-full max-w-md rounded-t-3xl p-6 sm:rounded-3xl"
            >
              <button
                onClick={() => setNeedDetail(null)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] text-muted-foreground transition hover:border-[var(--border-strong)] hover:text-foreground"
                aria-label={t("common.close")}
              >
                ✕
              </button>
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-[var(--border-strong)] bg-background/60 text-2xl">
                  {needDetail.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold leading-tight">
                    {needDetail.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("home.postedBy", { poster: needDetail.poster })}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {needDetail.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {needDetail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => void toggleSaveNeed(needDetail.id)}
                className={`mt-5 w-full rounded-full border py-2.5 text-sm font-medium transition active:scale-[0.99] ${
                  needDetail.id && savedNeeds.has(needDetail.id)
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-[var(--border-strong)] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                }`}
              >
                {needDetail.id && savedNeeds.has(needDetail.id)
                  ? t("social.saved")
                  : t("social.save")}
              </button>
              <button
                onClick={() => {
                  const name = needDetail.poster;
                  setNeedDetail(null);
                  void openChatWith(name, {
                    userId: needDetail.posterId,
                    needId: needDetail.id,
                    matchTag: needDetail.tags[0],
                  });
                }}
                className="mt-2.5 w-full rounded-full bg-[image:var(--gradient-primary)] py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition hover:shadow-[var(--shadow-glow-lg)] active:scale-[0.99]"
              >
                {t("home.startContact")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfilePreviewModal open={profilePreview} onClose={() => setProfilePreview(null)} />
    </div>
  );
}

// ── Matching / Success views (unchanged) ─────────────────────────────────────

const MATCH_PHASE_KEYS = ["home.matchPhase1", "home.matchPhase2", "home.matchPhase3"] as const;

function MatchingView() {
  const { t } = useI18n();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p + 1) % MATCH_PHASE_KEYS.length), 1000);
    return () => clearInterval(id);
  }, []);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  return (
    <motion.div
      key="matching"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl py-12"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_top,oklch(0.4_0.18_295/0.45),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.45_0.2_270/0.35),transparent_55%)] animate-gradient-shift" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-accent/70 shadow-[0_0_8px_2px_oklch(0.72_0.18_295/0.6)]"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
            animate={{ y: [-6, 6, -6], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
      <p className="font-display text-2xl font-bold text-white">{t("home.matching")}</p>
      <div className="relative grid h-36 w-36 place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 140 140">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.85 0.18 295)" />
              <stop offset="100%" stopColor="oklch(0.6 0.2 270)" />
            </linearGradient>
          </defs>
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke="oklch(1 0 0 / 0.08)"
            strokeWidth="4"
            fill="none"
          />
          <motion.circle
            cx="70"
            cy="70"
            r={radius}
            stroke="url(#ringGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * 0.05 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 12px oklch(0.72 0.18 295 / 0.8))" }}
          />
        </svg>
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-4xl text-accent drop-shadow-[0_0_18px_oklch(0.72_0.18_295/0.9)]"
        >
          ✦
        </motion.div>
      </div>
      <div className="h-5 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="text-sm text-muted-foreground"
          >
            {t(MATCH_PHASE_KEYS[phase])}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SuccessView({ onView, onContinue }: { onView: () => void; onContinue: () => void }) {
  const { t } = useI18n();
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl py-10"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-white"
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_center,oklch(0.7_0.18_155/0.25),transparent_65%)]" />
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/40" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className="grid h-20 w-20 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,oklch(0.85_0.18_155),oklch(0.55_0.18_155))] text-3xl text-white shadow-[0_0_40px_oklch(0.7_0.18_155/0.7)]"
        >
          ✓
        </motion.div>
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold text-white">{t("home.matchFound")}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("home.matchFoundDesc")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onView}
          className="group inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
        >
          {t("home.viewMatchResults")}{" "}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.06]"
        >
          {t("home.continuePost")}
        </button>
      </div>
    </motion.div>
  );
}
