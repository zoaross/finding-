import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { supabase } from "@/lib/supabase";
import { openOrCreateConversation } from "@/lib/chat";
import {
  setSavedCard,
  setSavedNeed,
  setSavedPortfolioItem,
  setSavedUser,
} from "@/lib/socialActions";
import { useI18n } from "@/lib/i18n";
import {
  FindingMark,
  IconTarget,
  IconGlobe,
  IconChat,
  IconBell,
  IconSettings,
  IconLogout,
  IconShield,
  IconUser,
} from "@/components/icons/FindingIcons";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
  head: () => ({
    meta: [
      { title: "收藏 — Finding." },
      { name: "description", content: "你收藏的需求和关注的用户。" },
    ],
  }),
});

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const, active: true },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const },
];

type SavedNeed = {
  id: string;
  userId: string;
  emoji: string;
  name: string;
  flag: string;
  ago: string;
  content: string;
  tags: string[];
};

type SavedUser = {
  id: string;
  emoji: string;
  name: string;
  flag: string;
  location: string;
  identities: string[];
  matchPct?: number;
};

type SavedCard = {
  id: string;
  source: "identity_card" | "portfolio_item";
  ownerId: string;
  emoji: string;
  ownerName: string;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  mediaUrl?: string;
};

function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function idHash(id: string, mod: number, offset = 0) {
  return (
    (Math.abs(id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % mod) + offset
  );
}

function BookmarksPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"needs" | "users" | "cards">("needs");
  const [needs, setNeeds] = useState<SavedNeed[]>([]);
  const [users, setUsers] = useState<SavedUser[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load only items explicitly saved by current user ────────────────────
  const loadSavedItems = async (uid: string) => {
    setLoading(true);
    try {
      const [needSaveRows, userSaveRows, cardSaveRows, portfolioSaveRows] = await Promise.all([
        (supabase as any)
          .from("saved_needs")
          .select("need_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(60),
        (supabase as any)
          .from("saved_users")
          .select("target_profile_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(60),
        (supabase as any)
          .from("saved_cards")
          .select("card_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(60),
        (supabase as any)
          .from("saved_portfolio_items")
          .select("portfolio_item_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(60),
      ]);

      if (needSaveRows.error) throw new Error(needSaveRows.error.message);
      if (userSaveRows.error) throw new Error(userSaveRows.error.message);
      if (cardSaveRows.error) throw new Error(cardSaveRows.error.message);
      if (portfolioSaveRows.error) throw new Error(portfolioSaveRows.error.message);

      const savedNeedIds = ((needSaveRows.data as any[]) ?? [])
        .map((row: any) => row.need_id as string)
        .filter(Boolean);
      const savedUserIds = ((userSaveRows.data as any[]) ?? [])
        .map((row: any) => row.target_profile_id as string)
        .filter(Boolean);
      const savedCardIds = ((cardSaveRows.data as any[]) ?? [])
        .map((row: any) => row.card_id as string)
        .filter(Boolean);
      const savedPortfolioIds = ((portfolioSaveRows.data as any[]) ?? [])
        .map((row: any) => row.portfolio_item_id as string)
        .filter(Boolean);

      if (savedNeedIds.length) {
        const { data: needRows } = await (supabase as any)
          .from("needs")
          .select("id, content, created_at, user_id, parsed_intent")
          .in("id", savedNeedIds);
        const needUserIds = [...new Set(((needRows as any[]) ?? []).map((n: any) => n.user_id))];
        const { data: profiles } = needUserIds.length
          ? await (supabase as any)
              .from("profiles")
              .select("id, username, avatar_emoji")
              .in("id", needUserIds)
          : { data: [] };
        const profileMap = new Map<string, any>(
          ((profiles as any[]) ?? []).map((profile: any) => [profile.id as string, profile]),
        );
        const needOrder = new Map(savedNeedIds.map((id, index) => [id, index]));
        setNeeds(
          ((needRows as any[]) ?? [])
            .sort((a: any, b: any) => (needOrder.get(a.id) ?? 0) - (needOrder.get(b.id) ?? 0))
            .map((n: any) => {
              const profile = profileMap.get(n.user_id as string);
              return {
                id: n.id as string,
                userId: n.user_id as string,
                emoji: (profile?.avatar_emoji as string) ?? "📝",
                name: (profile?.username as string) ?? t("home.userFallback"),
                flag: "🌏",
                ago: relTime(n.created_at as string),
                content: (n.content as string).slice(0, 80),
                tags: Array.isArray(n.parsed_intent?.tags)
                  ? (n.parsed_intent.tags as string[]).slice(0, 3)
                  : [],
              };
            }),
        );
      } else {
        setNeeds([]);
      }

      if (savedUserIds.length) {
        const { data: profileRows } = await (supabase as any)
          .from("profiles")
          .select("id, username, bio, location, avatar_emoji, skills")
          .in("id", savedUserIds);
        const userOrder = new Map(savedUserIds.map((id, index) => [id, index]));
        setUsers(
          ((profileRows as any[]) ?? [])
            .sort((a: any, b: any) => (userOrder.get(a.id) ?? 0) - (userOrder.get(b.id) ?? 0))
            .map((p: any) => ({
              id: p.id as string,
              emoji:
                (p.avatar_emoji as string) ?? (p.username as string)?.[0]?.toUpperCase() ?? "👤",
              name: (p.username as string) ?? t("home.userFallback"),
              flag: "🌏",
              location: (p.location as string) ?? `🌏 ${t("home.global")}`,
              identities:
                Array.isArray(p.skills) && (p.skills as string[]).length
                  ? (p.skills as string[]).slice(0, 3)
                  : [t("home.findingUser")],
              matchPct: idHash(p.id as string, 15, 82),
            })),
        );
      } else {
        setUsers([]);
      }

      const nextCards: SavedCard[] = [];
      if (savedCardIds.length) {
        const { data: cardRows } = await (supabase as any)
          .from("information_cards")
          .select("id, user_id, title, category, summary, tags, media_urls")
          .in("id", savedCardIds);
        const cardUserIds = [
          ...new Set(((cardRows as any[]) ?? []).map((card: any) => card.user_id)),
        ];
        const { data: profiles } = cardUserIds.length
          ? await (supabase as any)
              .from("profiles")
              .select("id, username, avatar_emoji")
              .in("id", cardUserIds)
          : { data: [] };
        const profileMap = new Map<string, any>(
          ((profiles as any[]) ?? []).map((profile: any) => [profile.id as string, profile]),
        );
        const cardOrder = new Map(savedCardIds.map((id, index) => [id, index]));
        nextCards.push(
          ...((cardRows as any[]) ?? [])
            .sort((a: any, b: any) => (cardOrder.get(a.id) ?? 0) - (cardOrder.get(b.id) ?? 0))
            .map((card: any) => {
              const profile = profileMap.get(card.user_id as string);
              const mediaUrls = Array.isArray(card.media_urls) ? (card.media_urls as string[]) : [];
              return {
                id: card.id as string,
                source: "identity_card" as const,
                ownerId: card.user_id as string,
                emoji: (profile?.avatar_emoji as string) ?? "⭐",
                ownerName: (profile?.username as string) ?? t("home.userFallback"),
                title: (card.title as string) ?? t("bookmarks.viewCard"),
                category: (card.category as string) ?? "Skill",
                summary: (card.summary as string) ?? "",
                tags: Array.isArray(card.tags) ? (card.tags as string[]).slice(0, 4) : [],
                mediaUrl: mediaUrls[0],
              };
            }),
        );
      }
      if (savedPortfolioIds.length) {
        const { data: portfolioRows } = await (supabase as any)
          .from("portfolio_items")
          .select("id, user_id, title, description, role, tools, media_url, media_urls")
          .in("id", savedPortfolioIds);
        const portfolioUserIds = [
          ...new Set(((portfolioRows as any[]) ?? []).map((item: any) => item.user_id)),
        ];
        const { data: profiles } = portfolioUserIds.length
          ? await (supabase as any)
              .from("profiles")
              .select("id, username, avatar_emoji")
              .in("id", portfolioUserIds)
          : { data: [] };
        const profileMap = new Map<string, any>(
          ((profiles as any[]) ?? []).map((profile: any) => [profile.id as string, profile]),
        );
        const portfolioOrder = new Map(savedPortfolioIds.map((id, index) => [id, index]));
        nextCards.push(
          ...((portfolioRows as any[]) ?? [])
            .sort(
              (a: any, b: any) => (portfolioOrder.get(a.id) ?? 0) - (portfolioOrder.get(b.id) ?? 0),
            )
            .map((item: any) => {
              const profile = profileMap.get(item.user_id as string);
              const mediaUrls = Array.isArray(item.media_urls)
                ? (item.media_urls as string[])
                : item.media_url
                  ? [item.media_url as string]
                  : [];
              return {
                id: item.id as string,
                source: "portfolio_item" as const,
                ownerId: item.user_id as string,
                emoji: (profile?.avatar_emoji as string) ?? "🖼️",
                ownerName: (profile?.username as string) ?? t("home.userFallback"),
                title: (item.title as string) ?? t("bookmarks.viewCard"),
                category: (item.role as string) ?? "Portfolio",
                summary: (item.description as string) ?? "",
                tags: Array.isArray(item.tools) ? (item.tools as string[]).slice(0, 4) : [],
                mediaUrl: mediaUrls[0],
              };
            }),
        );
      }
      setCards(nextCards);
    } catch (error) {
      console.warn("[bookmarks] load failed:", error);
      setNeeds([]);
      setUsers([]);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const removeNeed = async (needId: string) => {
    if (!user) return;
    setNeeds((prev) => prev.filter((need) => need.id !== needId));
    try {
      await setSavedNeed(user.id, needId, false);
      toast.success(t("social.unsaved"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
      void loadSavedItems(user.id);
    }
  };

  const removeUser = async (profileId: string) => {
    if (!user) return;
    setUsers((prev) => prev.filter((savedUser) => savedUser.id !== profileId));
    try {
      await setSavedUser(user.id, profileId, false);
      toast.success(t("social.unsaved"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
      void loadSavedItems(user.id);
    }
  };

  const removeSavedCard = async (card: SavedCard) => {
    if (!user) return;
    setCards((prev) => prev.filter((savedCard) => savedCard.id !== card.id));
    try {
      if (card.source === "portfolio_item") {
        await setSavedPortfolioItem(user.id, card.id, false);
      } else {
        await setSavedCard(user.id, card.id, false);
      }
      toast.success(t("social.unsaved"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
      void loadSavedItems(user.id);
    }
  };

  const openNeedOwnerChat = async (need: SavedNeed) => {
    if (!user) return;
    if (need.userId === user.id) {
      navigate({ to: "/needs" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation(user.id, {
        userId: need.userId,
        username: need.name,
        displayName: need.name,
        matchTag: need.content,
        needId: need.id,
      });
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const openSavedUserChat = async (savedUser: SavedUser) => {
    if (!user) return;
    try {
      const conversationId = await openOrCreateConversation(user.id, {
        userId: savedUser.id,
        username: savedUser.name,
        displayName: savedUser.name,
        matchTag: savedUser.identities[0],
      });
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      void loadSavedItems(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      else {
        setUser(session.user);
        void loadSavedItems(session.user.id);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const displayName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    user?.email?.split("@")[0] ||
    "朋友";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] gap-5 px-4 py-5 lg:px-6">
        {/* Sidebar */}
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
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
                {displayName.charAt(0).toUpperCase()}
              </div>
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

        {/* Main */}
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <FindingMark size={28} />
              <span className="font-display text-lg font-extrabold">
                Finding<span className="text-accent">.</span>
              </span>
            </Link>
          </div>

          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-sm text-muted-foreground">{t("bookmarks.privateLib")}</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              <span className="text-gradient">{t("bookmarks.title")}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("bookmarks.summary", {
                n: needs.length + users.length + cards.length,
              })}
            </p>
          </motion.section>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            {(
              [
                { key: "needs", label: `${t("bookmarks.tab.needs")} ${needs.length}` },
                { key: "users", label: `${t("bookmarks.tab.users")} ${users.length}` },
                { key: "cards", label: `${t("bookmarks.tab.cards")} ${cards.length}` },
              ] as const
            ).map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`relative rounded-full px-5 py-1.5 text-sm transition-colors ${
                  tab === tb.key
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === tb.key && (
                  <motion.span
                    layoutId="bm-tab-pill"
                    className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{tb.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {tab === "needs" && (
              <motion.div
                key="needs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="glass-card animate-pulse rounded-3xl p-5 h-40" />
                    ))}
                  </div>
                ) : needs.length === 0 ? (
                  <EmptyState
                    title={t("bookmarks.empty.needs")}
                    desc="在需求大厅点击「收藏」即可保存你感兴趣的需求"
                    cta={t("bookmarks.cta.toDiscover")}
                    to="/discover"
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {needs.map((n) => (
                      <NeedCard
                        key={n.id}
                        need={n}
                        t={t}
                        onRemove={() => removeNeed(n.id)}
                        onHelp={() => void openNeedOwnerChat(n)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {users.length === 0 ? (
                  <EmptyState
                    title={t("bookmarks.empty.users")}
                    desc={t("bookmarks.empty.usersDesc")}
                    cta={t("bookmarks.cta.findPeople")}
                    to="/discover"
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {users.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        t={t}
                        onRemove={() => removeUser(u.id)}
                        onMessage={() => void openSavedUserChat(u)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "cards" && (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {cards.length === 0 ? (
                  <EmptyState
                    title={t("bookmarks.empty.cards")}
                    desc={t("bookmarks.empty.cardsDesc")}
                    cta={t("bookmarks.cta.findPeople")}
                    to="/discover"
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map((card) => (
                      <SavedCardView
                        key={card.id}
                        card={card}
                        t={t}
                        onRemove={() => removeSavedCard(card)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function NeedCard({
  need,
  onHelp,
  onRemove,
  t,
}: {
  need: SavedNeed;
  onRemove: () => void;
  onHelp: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass-card card-premium hover-lift group relative flex flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20" />

      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-lg shadow-[var(--shadow-glow)]">
          <span>{need.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {need.name} <span className="ml-1">{need.flag}</span>
          </p>
          <p className="text-xs text-muted-foreground">{need.ago}</p>
        </div>
        {/* Remove bookmark */}
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-[var(--border)] p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          title="取消收藏"
        >
          🔖
        </button>
      </div>

      <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed">{need.content}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {need.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-soft"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-end border-t border-[var(--border)] pt-4">
        <button
          onClick={onHelp}
          className="inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
        >
          {t("bookmarks.canHelp")}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>
    </motion.div>
  );
}

function UserCard({
  user,
  t,
  onRemove,
  onMessage,
  removeLabel,
}: {
  user: SavedUser;
  t: (k: string, p?: Record<string, string | number>) => string;
  onRemove: () => void;
  onMessage: () => void;
  removeLabel?: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass-card card-premium hover-lift group relative flex flex-col overflow-hidden rounded-3xl p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20" />

      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-2xl shadow-[var(--shadow-glow)]">
          {user.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-base font-display font-bold">
              {user.name} <span className="ml-1">{user.flag}</span>
            </p>
            {typeof user.matchPct === "number" && (
              <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent-soft">
                {t("bookmarks.matchPct", { n: user.matchPct })}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{user.location}</p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-[var(--border)] p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          title={removeLabel ?? t("social.unsaved")}
        >
          {removeLabel ? "✓" : "🔖"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {user.identities.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-soft"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-[var(--border)] pt-4">
        <Link
          to="/user/$username"
          params={{ username: user.name }}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/5"
        >
          {t("bookmarks.viewCard")}
        </Link>
        <button
          onClick={onMessage}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
        >
          {t("bookmarks.startChat")}
        </button>
      </div>
    </motion.div>
  );
}

function SavedCardView({
  card,
  t,
  onRemove,
}: {
  card: SavedCard;
  t: (k: string, p?: Record<string, string | number>) => string;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="glass-card card-premium hover-lift group relative flex flex-col overflow-hidden rounded-3xl p-5"
    >
      {card.mediaUrl && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-black/20">
          {/\.(mp4|mov|webm)(\?|$)/i.test(card.mediaUrl) ? (
            <video src={card.mediaUrl} className="h-32 w-full object-cover" muted playsInline />
          ) : (
            <img src={card.mediaUrl} alt={card.title} className="h-32 w-full object-cover" />
          )}
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-xl shadow-[var(--shadow-glow)]">
          {card.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-display font-bold">{card.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{card.ownerName} · {card.category}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg border border-[var(--border)] p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
          title={t("social.unsaved")}
        >
          🔖
        </button>
      </div>
      {card.summary && <p className="mt-4 line-clamp-3 text-sm leading-relaxed">{card.summary}</p>}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {card.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent-soft"
          >
            #{tag}
          </span>
        ))}
      </div>
      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <div className="grid gap-2">
          {card.source === "identity_card" ? (
            <Link
              to="/cards/$cardId"
              params={{ cardId: card.id }}
              className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/5"
            >
              {t("bookmarks.viewCard")}
            </Link>
          ) : (
            <Link
              to="/user/$username"
              params={{ username: card.ownerName }}
              className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--border-strong)] px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-white/5"
            >
              View portfolio owner
            </Link>
          )}
          <Link
            to="/user/$username"
            params={{ username: card.ownerName }}
            className="inline-flex w-full items-center justify-center gap-1 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          >
            View owner profile
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({
  title,
  desc,
  cta,
  to,
}: {
  title: string;
  desc: string;
  cta: string;
  to: "/discover" | "/home";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card relative overflow-hidden rounded-3xl p-10 text-center md:p-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-radial-purple opacity-40" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="relative mb-6 grid h-28 w-28 place-items-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-2xl" />
          <svg viewBox="0 0 64 64" className="relative h-24 w-24">
            <defs>
              <linearGradient id="bm-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.18 295)" />
                <stop offset="100%" stopColor="oklch(0.55 0.22 290)" />
              </linearGradient>
            </defs>
            <path
              d="M18 8h28a4 4 0 0 1 4 4v44l-18-10-18 10V12a4 4 0 0 1 4-4z"
              fill="none"
              stroke="url(#bm-grad)"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="28" r="4" fill="url(#bm-grad)" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        <Link
          to={to}
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
        >
          {cta}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </motion.div>
  );
}
