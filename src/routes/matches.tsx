import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { HIDDEN_CONVERSATION_STATUSES, openOrCreateConversation } from "@/lib/chat";
import { setSavedUser } from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/matches")({
  component: MatchesPage,
  head: () => ({
    meta: [
      { title: "匹配结果 — Finding." },
      { name: "description", content: "Finding 中真实生成的匹配结果。" },
    ],
  }),
});

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
  is_simulated: boolean | null;
};

type IdentityCardRow = {
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
};

type RealMatch = {
  id: string;
  needId: string | null;
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
  cards: IdentityCardRow[];
  dataSource: "real_supabase";
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "F";
}

function formatTime(iso: string | null) {
  if (!iso) return "最近";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function MatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<RealMatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMatches() {
      setLoading(true);
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        navigate({ to: "/auth" });
        return;
      }

      const hiddenFilter = `(${HIDDEN_CONVERSATION_STATUSES.join(",")})`;
      const { data: matchRows, error: matchError } = await (supabase as any)
        .from("matches")
        .select(
          "id, need_id, participant_one_id, participant_two_id, participant_two_profile_id, partner_name, match_tag, match_score, status, updated_at",
        )
        .eq("participant_one_id", uid)
        .not("status", "in", hiddenFilter)
        .order("match_score", { ascending: false })
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (matchError) {
        setError(matchError.message);
        setMatches([]);
        setLoading(false);
        return;
      }

      const rows = ((matchRows ?? []) as MatchRow[]).filter((row) => row.need_id);
      const profileIds = [
        ...new Set(
          rows
            .map((row) => row.participant_two_profile_id ?? row.participant_two_id)
            .filter(Boolean) as string[],
        ),
      ];

      if (profileIds.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const [{ data: profileRows, error: profileError }, { data: cardRows, error: cardError }] =
        await Promise.all([
          (supabase as any)
            .from("profiles")
            .select("id, username, display_name, avatar_emoji, bio, location, reputation_score, is_simulated")
            .in("id", profileIds),
          (supabase as any)
            .from("information_cards")
            .select(
              "id, user_id, title, category, summary, details, tags, supply_skills, supply_languages, supply_country, supply_city, offer_summary, connection_preferences, media_urls, voice_intro_url, reputation_score, response_rate",
            )
            .in("user_id", profileIds)
            .eq("visibility", "public")
            .order("created_at", { ascending: false }),
        ]);

      if (cancelled) return;
      if (profileError || cardError) {
        setError(profileError?.message ?? cardError?.message ?? "Failed to load matches.");
        setMatches([]);
        setLoading(false);
        return;
      }

      const profiles = new Map<string, ProfileRow>(
        ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
      );
      const cardsByProfile = new Map<string, IdentityCardRow[]>();
      for (const card of (cardRows ?? []) as IdentityCardRow[]) {
        cardsByProfile.set(card.user_id, [...(cardsByProfile.get(card.user_id) ?? []), card]);
      }

      const realMatches = rows
        .map((row): RealMatch | null => {
          const profileId = row.participant_two_profile_id ?? row.participant_two_id;
          if (!profileId) return null;
          const profile = profiles.get(profileId);
          if (!profile) return null;
          const cards = cardsByProfile.get(profileId) ?? [];
          const username = profile.username ?? row.partner_name ?? profile.id;
          const displayName = profile.display_name ?? profile.username ?? row.partner_name ?? "Finding user";
          const primaryCard = cards[0];
          return {
            id: row.id,
            needId: row.need_id,
            profileId,
            username,
            displayName,
            avatar: profile.avatar_emoji ?? initials(displayName),
            headline: primaryCard?.title ?? row.match_tag ?? profile.bio ?? "Finding profile",
            location:
              profile.location ??
              [primaryCard?.supply_city, primaryCard?.supply_country].filter(Boolean).join(", ") ??
              "Global",
            score: Number(row.match_score ?? 0),
            reputation: Number(profile.reputation_score ?? primaryCard?.reputation_score ?? 5),
            status: row.status ?? "active",
            updatedAt: row.updated_at,
            cards,
            dataSource: "real_supabase",
          };
        })
        .filter(Boolean) as RealMatch[];

      setMatches(realMatches);
      setLoading(false);
    }

    void loadMatches();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const opened = useMemo(() => matches.find((match) => match.id === openId) ?? null, [matches, openId]);

  const startChat = async (match: RealMatch) => {
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: match.profileId,
        partnerUsername: match.username,
        partnerName: match.displayName,
        sourceNeedId: match.needId,
        matchId: match.id,
        matchTag: match.headline,
      });
      toast.success(`Conversation opened: ${conversationId}`);
      navigate({ to: "/messages", search: { conversationId } });
    } catch (chatError) {
      toast.error("无法创建对话", {
        description: chatError instanceof Error ? chatError.message : String(chatError),
      });
    }
  };

  const toggleSaveMatch = async (match: RealMatch) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    const next = !saved[match.profileId];
    setSaved((state) => ({ ...state, [match.profileId]: next }));
    try {
      await setSavedUser(currentUser.id, match.profileId, next);
      toast.success(next ? "已保存" : "已取消保存");
    } catch (saveError) {
      setSaved((state) => ({ ...state, [match.profileId]: !next }));
      toast.error("保存失败", {
        description: saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/home"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/[0.03] px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground active:scale-95"
          >
            ← 返回首页
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <FindingMark size={26} />
            <span className="font-display text-lg font-extrabold">
              Finding<span className="text-accent">.</span>
            </span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            真实匹配结果
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            数据源: needs → matches → profiles → identity_cards
          </p>
        </motion.div>

        {loading && (
          <div className="glass-card rounded-3xl p-8 text-center text-sm text-muted-foreground">
            正在读取 Supabase 匹配结果...
          </div>
        )}

        {!loading && error && (
          <div className="glass-card rounded-3xl border border-rose-400/30 p-8 text-center text-sm text-rose-200">
            匹配结果加载失败: {error}
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl">
              ✦
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">还没有真实匹配结果</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              当前没有从 Supabase matches 表读取到可显示的真实匹配。发布需求并生成匹配后，这里才会显示用户。
            </p>
            <button
              onClick={() => navigate({ to: "/home" })}
              className="mt-5 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all active:scale-[0.98]"
            >
              回到 Home / Find
            </button>
          </div>
        )}

        <ul className="grid gap-5">
          {matches.map((match, index) => {
            const isBest = index === 0;
            return (
              <motion.li
                key={match.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className={`glass-card card-premium group relative overflow-hidden rounded-3xl p-5 md:p-6 ${
                  isBest ? "border-amber-300/40" : ""
                }`}
              >
                {isBest && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-black">
                    最高分 ✦
                  </span>
                )}
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-2xl font-bold text-primary-foreground">
                    {match.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-bold tracking-tight">
                        {match.displayName}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                        {Math.round(match.score)}% 匹配
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{match.headline}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{match.location}</span>
                      <span>声誉 {match.reputation.toFixed(1)}</span>
                      <span>{formatTime(match.updatedAt)}</span>
                      <span>source: {match.dataSource}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(match.cards[0]?.tags ?? match.cards[0]?.supply_skills ?? []).slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(match.id)}
                    className="rounded-full border border-[var(--border-strong)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06] active:scale-[0.98]"
                  >
                    查看身份卡
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSaveMatch(match)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                      saved[match.profileId]
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-[var(--border-strong)] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                    }`}
                  >
                    {saved[match.profileId] ? "已保存" : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startChat(match)}
                    className="group/btn flex items-center justify-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all active:scale-[0.98]"
                  >
                    发起聊天 →
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence>
        {opened && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setOpenId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              className="glass-card max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-2xl font-bold text-primary-foreground">
                  {opened.avatar}
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">{opened.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{opened.location}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {opened.cards.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    这个用户目前没有公开 identity card。
                  </p>
                ) : (
                  opened.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-lg font-bold">{card.title}</h3>
                          <p className="text-xs text-muted-foreground">{card.category}</p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {card.response_rate ?? 90}% response
                        </span>
                      </div>
                      {card.summary && <p className="mt-3 text-sm text-foreground">{card.summary}</p>}
                      {card.details && <p className="mt-2 text-sm text-muted-foreground">{card.details}</p>}
                      {card.offer_summary && (
                        <p className="mt-2 text-sm text-muted-foreground">{card.offer_summary}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[
                          ...(card.tags ?? []),
                          ...(card.supply_skills ?? []),
                          ...(card.supply_languages ?? []),
                        ]
                          .slice(0, 10)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => void startChat(opened)}
                  className="rounded-full bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  发起聊天
                </button>
                <button
                  onClick={() => navigate({ to: "/user/$username", params: { username: opened.username } })}
                  className="rounded-full border border-[var(--border-strong)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  查看公开主页
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
