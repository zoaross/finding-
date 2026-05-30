import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { supabase } from "@/lib/supabase";
import {
  listMessages,
  sendMessage,
  sendSimulatedReply,
  subscribeMessages,
  getMockMatchId,
  consumeRequestedMatch,
  type DBMessage,
} from "@/lib/chat";
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
  IconSearch,
  IconX,
} from "@/components/icons/FindingIcons";
import {
  ProfilePreviewModal,
  type ProfilePreviewData,
  buildPortfolio,
  type PortfolioItem,
} from "@/components/ProfilePreviewModal";
import { PREF_LANG_KEY, PREF_LANGS, PINNED_LANG_CODES } from "@/routes/settings";
import { useI18n, useTranslationLanguage } from "@/lib/i18n";
import { blockProfile, reportProfile } from "@/lib/socialActions";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "消息 — Finding." },
      { name: "description", content: "Finding 消息中心 — 与匹配伙伴实时沟通。" },
    ],
  }),
});

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const, active: true },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const },
];

type Conversation = {
  id: string;
  userId?: string | null;
  name: string;
  emoji: string;
  region: string;
  preview: string;
  time: string;
  unread: number;
  online: boolean;
  matchTag: string;
  isSimulated?: boolean;
  needId?: string | null;
};

// Demo conversations shown when user has no real matches yet
const demoConversations: Conversation[] = [
  {
    id: "1",
    name: "luna_bjd",
    emoji: "🎨",
    region: "🇰🇷 首尔",
    preview: "好的!那我们周三视频细聊一下~",
    time: "刚刚",
    unread: 2,
    online: true,
    matchTag: "BJD 插画",
  },
  {
    id: "2",
    name: "Aiko 田中",
    emoji: "📚",
    region: "🇯🇵 东京",
    preview: "ありがとう!明日の14時で大丈夫です",
    time: "12 分钟前",
    unread: 0,
    online: true,
    matchTag: "日语家教",
  },
  {
    id: "3",
    name: "startup_ceo",
    emoji: "💻",
    region: "🇺🇸 旧金山",
    preview: "Sent you the JD, take a look",
    time: "1 小时前",
    unread: 1,
    online: false,
    matchTag: "前端工程师",
  },
  {
    id: "4",
    name: "foodie_서울",
    emoji: "🍜",
    region: "🇰🇷 江南区",
    preview: "周六中午在弘大见?",
    time: "昨天",
    unread: 0,
    online: true,
    matchTag: "约饭搭子",
  },
  {
    id: "5",
    name: "indie_music",
    emoji: "🎵",
    region: "🇯🇵 大阪",
    preview: "demo 收到了,旋律很有感觉",
    time: "昨天",
    unread: 0,
    online: false,
    matchTag: "音乐合作",
  },
  {
    id: "6",
    name: "photo_kim",
    emoji: "📸",
    region: "🇰🇷 弘大",
    preview: "形象照拍摄费用我私信发你",
    time: "2 天前",
    unread: 0,
    online: false,
    matchTag: "摄影师",
  },
  {
    id: "7",
    name: "game_dev",
    emoji: "🎮",
    region: "🇩🇪 柏林",
    preview: "Pixel art portfolio looks amazing",
    time: "3 天前",
    unread: 0,
    online: false,
    matchTag: "游戏美术",
  },
  {
    id: "8",
    name: "study_buddy",
    emoji: "📚",
    region: "🇨🇳 上海",
    preview: "今天的 TOPIK 模考你做完了吗?",
    time: "4 天前",
    unread: 0,
    online: true,
    matchTag: "学习搭子",
  },
];

function relTime(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
};

const initialThread: Record<string, Message[]> = {
  "1": [
    { id: "seed-1", from: "them", text: "你好!看到你的作品集了,风格非常对味 ✨", time: "14:02" },
    {
      id: "seed-2",
      from: "them",
      text: "我想找人帮我做一个暗黑奇幻系列的BJD原画,大概 4-6 张",
      time: "14:02",
    },
    { id: "seed-3", from: "me", text: "你好 luna!很高兴你喜欢我的风格 🎨", time: "14:08" },
    {
      id: "seed-4",
      from: "me",
      text: "可以详细聊一下,你心目中的氛围是偏哥特还是偏神秘学的?",
      time: "14:08",
    },
    {
      id: "seed-5",
      from: "them",
      text: "更偏神秘学一点,有月相、塔罗、星轨这些元素",
      time: "14:15",
    },
    {
      id: "seed-6",
      from: "me",
      text: "完美,我之前刚好做过类似的系列。我把参考稿发你看看?",
      time: "14:17",
    },
    { id: "seed-7", from: "them", text: "好的!那我们周三视频细聊一下~", time: "14:20" },
  ],
};

function NavRail() {
  const { t } = useI18n();
  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-white/5 bg-card/30 px-3 py-6 backdrop-blur-xl lg:flex">
      <Link to="/home" className="mb-8 flex items-center gap-2 px-3">
        <FindingMark size={26} />
        <span className="font-display text-lg font-bold tracking-tight">
          Finding<span className="text-primary">.</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              it.active
                ? "bg-gradient-to-r from-primary/25 to-primary/5 text-foreground shadow-[inset_0_0_0_1px_oklch(0.65_0.22_295/0.3)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <it.icon size={18} />
            <span>{t(it.key)}</span>
            {it.active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.65_0.22_295)]" />
            )}
          </Link>
        ))}
      </nav>
      <button className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
        <IconLogout size={18} />
        <span>{t("nav.logout")}</span>
      </button>
    </aside>
  );
}

function MessagesPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Message[]>(initialThread["1"]);
  const [partnerCollapsed, setPartnerCollapsed] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedRatings, setCompletedRatings] = useState<
    Record<string, { rating: number; feedback: string | null; created_at: string }>
  >({});
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<ProfilePreviewData | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "complete" | "mismatch">(null);
  const [showBlock, setShowBlock] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<string>("harassment");
  const [reportNote, setReportNote] = useState("");

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [convLang, setConvLang] = useState<Record<string, string>>({});
  // Reactive: when translation language changes in Settings, this updates immediately
  // (and the language badge in the toolbar re-renders).
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage("zh");
  // Sticky: once the user picks a translation language anywhere, skip the picker
  // on future translate clicks across all conversations.
  const [hasChosenLang, setHasChosenLang] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load last-chosen translate lang (separate from settings preferred lang)
  useEffect(() => {
    try {
      const chosen = localStorage.getItem(PREF_LANG_KEY);
      if (chosen) setHasChosenLang(true);
    } catch {
      // Ignore unavailable localStorage.
    }
  }, []);

  // Backward compatibility for older buttons that only stored a display name.
  // New chat actions create a real matches row and store finding:active-match-id.
  useEffect(() => {
    try {
      const target = localStorage.getItem("finding:open-chat");
      if (target) {
        const match = convs.find((c) => c.name === target);
        if (match) setActiveId(match.id);
        localStorage.removeItem("finding:open-chat");
      }
    } catch {
      // Ignore unavailable localStorage.
    }
  }, [convs]);

  // Load existing ratings for this user and filter out completed conversations
  const loadRatings = async (uid: string) => {
    const { data, error } = await supabase
      .from("conversation_ratings")
      .select("conversation_id, rating, feedback, created_at, status")
      .eq("rater_id", uid);
    if (error) {
      // Table may not exist yet — fail silently so UI still works
      console.warn("[ratings] load failed:", error.message);
      return;
    }
    await (supabase as any)
      .from("matches")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", active.id);
    if (active.needId) {
      await (supabase as any)
        .from("needs")
        .update({ status: "completed", is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", active.needId)
        .eq("user_id", user.id);
    }
    if (!data) return;
    const map: Record<string, { rating: number; feedback: string | null; created_at: string }> = {};
    const completedIds = new Set<string>();
    for (const r of data) {
      map[r.conversation_id] = {
        rating: r.rating,
        feedback: r.feedback,
        created_at: r.created_at,
      };
      if (r.status === "completed") completedIds.add(r.conversation_id);
    }
    setCompletedRatings(map);
    setConvs((prev) => {
      const next = prev.filter((c) => !completedIds.has(c.id));
      if (next.length && !next.find((c) => c.id === activeId)) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const loadRealConversations = async (uid: string) => {
    // Load matches where current user is a participant
    const requestedMatchId = consumeRequestedMatch();
    const [r1, r2] = await Promise.all([
      (supabase as any)
        .from("matches")
        .select(
          "id, need_id, participant_two_id, participant_two_profile_id, match_tag, updated_at, partner_name",
        )
        .eq("participant_one_id", uid)
        .limit(20),
      (supabase as any)
        .from("matches")
        .select("id, need_id, participant_one_id, match_tag, updated_at, partner_name")
        .eq("participant_two_id", uid)
        .limit(20),
    ]);
    const rows1 = ((r1 as any).data ?? []) as any[];
    const rows2 = ((r2 as any).data ?? []) as any[];
    if (!rows1.length && !rows2.length) return; // no real matches, keep demo

    // Collect the other participant's ID
    const matchList = [
      ...rows1.map((r: any) => ({
        id: r.id,
        otherId: r.participant_two_profile_id ?? r.participant_two_id,
        tag: r.match_tag,
        updated: r.updated_at,
        partnerName: r.partner_name,
        needId: r.need_id,
      })),
      ...rows2.map((r: any) => ({
        id: r.id,
        otherId: r.participant_one_id,
        tag: r.match_tag,
        updated: r.updated_at,
        partnerName: r.partner_name,
        needId: r.need_id,
      })),
    ].filter((m) => m.otherId);

    if (!matchList.length) return;

    // Load profiles for other participants
    const otherIds = matchList.map((m) => m.otherId as string);
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, username, avatar_emoji, location, is_simulated")
      .in("id", otherIds);
    const pMap = new Map<string, any>(((profiles as any[]) ?? []).map((p: any) => [p.id, p]));

    // Load last message for each match
    const msgPromises = matchList.map((m) =>
      (supabase as any)
        .from("messages")
        .select("content, created_at")
        .eq("match_id", m.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    const msgResults = await Promise.all(msgPromises);

    const realConvs: Conversation[] = matchList.map((m, i) => {
      const p = pMap.get(m.otherId as string);
      const lastMsg = (msgResults[i] as any)?.data;
      return {
        id: m.id as string,
        userId: m.otherId as string,
        name: (p?.username as string) ?? (m.partnerName as string) ?? t("home.userFallback"),
        emoji: (p?.avatar_emoji as string) ?? "👤",
        region: (p?.location as string) ?? `🌏 ${t("home.global")}`,
        preview: lastMsg
          ? (lastMsg.content as string).slice(0, 30)
          : t("messages.startConversation"),
        time: lastMsg ? relTime(lastMsg.created_at as string) : relTime(m.updated as string),
        unread: 0,
        online: !!p?.is_simulated,
        matchTag: (m.tag as string) ?? t("messages.matchingTag"),
        isSimulated: !!p?.is_simulated,
        needId: m.needId as string | undefined,
      };
    });

    // Only show real conversations — no demo fallback
    setConvs(realConvs);
    if (realConvs.length > 0) {
      const requested = requestedMatchId ? realConvs.find((c) => c.id === requestedMatchId) : null;
      setActiveId((requested ?? realConvs[0]).id);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s?.user) navigate({ to: "/auth" });
      else {
        loadRatings(s.user.id);
        void loadRealConversations(s.user.id);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate({ to: "/auth" });
      else {
        loadRatings(session.user.id);
        void loadRealConversations(session.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Load history from DB + subscribe to realtime inserts whenever the
  // active conversation changes. Falls back to the seeded demo thread
  // (luna_bjd) for first-time users so the UI never looks empty.
  useEffect(() => {
    setTranslations({});
    if (!user) return;
    // Real conversations have UUID IDs (contain "-"); demo ones use "1","2",etc.
    const isRealConv = activeId.includes("-");
    const matchId = isRealConv ? activeId : getMockMatchId(activeId);
    let cancelled = false;

    const seed = initialThread[activeId] ?? [
      {
        id: "seed-greet",
        from: "them" as const,
        text: "你好!很高兴遇到你 ✨",
        time: t("time.now"),
      },
    ];

    const fmtTime = (iso: string) => {
      try {
        return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } catch {
        return "";
      }
    };

    const toMessage = (m: DBMessage): Message => ({
      id: m.id,
      from: m.sender_id === user.id ? "me" : "them",
      text: m.content,
      time: fmtTime(m.created_at),
    });

    void listMessages(matchId).then((rows) => {
      if (cancelled) return;
      const dbMsgs = rows.map(toMessage);
      // Show seeded thread only if the DB has nothing yet for this conv.
      setThread(dbMsgs.length ? dbMsgs : seed);
    });

    const unsub = subscribeMessages(matchId, (m) => {
      if (cancelled) return;
      setThread((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        // Drop seed messages once real DB messages start flowing.
        const cleaned = prev.filter((x) => !x.id.startsWith("seed-") && !x.id.startsWith("local-"));
        return [...cleaned, toMessage(m)];
      });
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [activeId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (!user) {
      toast.error(t("messages.signInRequired"));
      return;
    }
    // Real conversations use their own UUID; demo conversations get a stable UUID via getMockMatchId
    const isRealConv = activeId.includes("-");
    const matchId = isRealConv ? activeId : getMockMatchId(activeId);
    // Optimistic append so the bubble shows instantly.
    const tempId = `local-${Date.now()}`;
    setThread((p) => [...p, { id: tempId, from: "me", text, time: t("time.now") }]);
    setDraft("");
    let saved: DBMessage | null = null;
    try {
      saved = await sendMessage(matchId, user.id, text, active.name);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(t("messages.sendFailed"), { description: msg });
      setThread((p) => p.filter((m) => m.id !== tempId));
      return;
    }
    if (!saved) {
      toast.error(t("messages.sendRetry"));
      setThread((p) => p.filter((m) => m.id !== tempId));
      return;
    }
    // Swap the optimistic bubble for the real DB row (realtime echo will
    // be deduped by id).
    setThread((p) =>
      p.map((m) =>
        m.id === tempId
          ? {
              id: saved.id,
              from: "me",
              text: saved.content,
              time: new Date(saved.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            }
          : m,
      ),
    );
    setConvs((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, preview: saved.content.slice(0, 30), time: t("time.now") } : c,
      ),
    );

    if (active.isSimulated && active.userId) {
      window.setTimeout(() => {
        void sendSimulatedReply(matchId, active.userId!, text, active.name).then((reply) => {
          if (!reply) return;
          setThread((prev) => {
            if (prev.some((m) => m.id === reply.id)) return prev;
            return [
              ...prev,
              {
                id: reply.id,
                from: "them",
                text: reply.content,
                time: new Date(reply.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              },
            ];
          });
          setConvs((prev) =>
            prev.map((c) =>
              c.id === activeId
                ? { ...c, preview: reply.content.slice(0, 30), time: t("time.now"), unread: 1 }
                : c,
            ),
          );
        });
      }, 700);
    }
  };

  // active is only used when convs.length > 0; the JSX guards this
  const active = convs.find((c) => c.id === activeId) ?? convs[0] ?? ({} as Conversation);
  const filtered = convs.filter(
    (c) =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.matchTag.includes(search),
  );

  const handleComplete = () => setConfirmAction("complete");
  const confirmBlockUser = async () => {
    if (!user || !active.userId) {
      toast.error(t("messages.signInRequired"));
      return;
    }
    try {
      await blockProfile(user.id, active.userId, "blocked_from_messages");
      setShowBlock(false);
      setConvs((prev) => {
        const next = prev.filter((c) => c.id !== activeId);
        if (next.length) setActiveId(next[0].id);
        return next;
      });
      toast.success(t("messages.blockedToast"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const submitReport = async () => {
    if (!user || !active.userId) {
      toast.error(t("messages.signInRequired"));
      return;
    }
    try {
      await reportProfile(user.id, active.userId, reportReason, reportNote);
      setShowReport(false);
      setReportNote("");
      toast.success(t("messages.reportSubmitted"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const confirmComplete = () => {
    setConfirmAction(null);
    setShowRating(true);
  };
  const submitRating = async () => {
    if (!user) {
      toast.error(t("messages.signInRequired"));
      return;
    }
    setSubmitting(true);
    const payload = {
      rater_id: user.id,
      conversation_id: active.id,
      partner_name: active.name,
      match_tag: active.matchTag,
      rating,
      feedback: feedback.trim() || null,
      status: "completed",
    };
    const { error } = await supabase
      .from("conversation_ratings")
      .upsert(payload, { onConflict: "rater_id,conversation_id" });
    setSubmitting(false);
    if (error) {
      console.error("[ratings] save failed:", error);
      toast.error(t("messages.ratingSaveFailed"), {
        description: error.message.includes("does not exist")
          ? t("messages.ratingTableMissing")
          : error.message,
      });
      return;
    }
    setCompletedRatings((m) => ({
      ...m,
      [active.id]: {
        rating,
        feedback: feedback.trim() || null,
        created_at: new Date().toISOString(),
      },
    }));
    // Push to needs page queue → moves a need to "已归档"
    try {
      const q = JSON.parse(localStorage.getItem("finding:pending-need-status") || "[]");
      q.push("completed");
      localStorage.setItem("finding:pending-need-status", JSON.stringify(q));
    } catch {
      /* ignore */
    }
    toast.success(t("messages.collaborationCompleted"), {
      description: t("messages.collaborationRated", { name: active.name, rating }),
    });
    setShowRating(false);
    setFeedback("");
    setRating(5);
    setHoverRating(0);
    // Mark conversation as completed by removing it
    setConvs((prev) => {
      const next = prev.filter((c) => c.id !== activeId);
      if (next.length) setActiveId(next[0].id);
      return next;
    });
  };
  const handleMismatch = () => setConfirmAction("mismatch");
  const confirmMismatch = () => {
    setConfirmAction(null);
    if (active.needId && user) {
      void (supabase as any)
        .from("needs")
        .update({ status: "failed", is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", active.needId)
        .eq("user_id", user.id);
    }
    setConvs((prev) => {
      const next = prev.filter((c) => c.id !== activeId);
      if (next.length) setActiveId(next[0].id);
      return next;
    });
    // Push to needs page queue → moves a need to "未完成"
    try {
      const q = JSON.parse(localStorage.getItem("finding:pending-need-status") || "[]");
      q.push("failed");
      localStorage.setItem("finding:pending-need-status", JSON.stringify(q));
    } catch {
      /* ignore */
    }
    toast.success(t("messages.mismatchRecorded"));
  };

  // Naive demo translator: maps common phrases per language, else prefixes a label.
  const translateText = (text: string, langCode: string): string => {
    const lang = PREF_LANGS.find((l) => l.code === langCode);
    const label = lang?.label ?? "中文";
    const dict: Record<string, Array<[RegExp, string]>> = {
      zh: [
        [/ありがとう[!! ]*明日の14時で大丈夫です/, "谢谢!明天 14 点没问题"],
        [/Sent you the JD,?\s*take a look/i, "已经把 JD 发给你了,看一下"],
        [/Pixel art portfolio looks amazing/i, "你的像素艺术作品集太棒了"],
      ],
      en: [
        [/ありがとう[!! ]*明日の14時で大丈夫です/, "Thanks! 2 PM tomorrow works for me"],
        [/好的!那我们周三视频细聊一下/, "Great! Let's video chat on Wednesday"],
      ],
      ja: [
        [/Sent you the JD,?\s*take a look/i, "JDを送りましたので、ご確認ください"],
        [/好的!那我们周三视频细聊一下/, "了解!水曜日にビデオで詳しく話しましょう"],
      ],
      ko: [
        [/Sent you the JD,?\s*take a look/i, "JD 보내드렸어요, 확인해 주세요"],
        [/好的!那我们周三视频细聊一下/, "좋아요! 수요일에 영상으로 자세히 얘기해요"],
      ],
    };
    const map = dict[langCode] ?? [];
    for (const [re, out] of map) if (re.test(text)) return out;
    return `[${label}] ${text}`;
  };

  const toggleTranslate = (msg: Message, langCode?: string) => {
    const target = langCode || convLang[activeId] || translationLanguage;
    setTranslations((prev) => {
      const next = { ...prev };
      if (next[msg.id] && !langCode) {
        delete next[msg.id];
      } else {
        next[msg.id] = translateText(msg.text, target);
      }
      return next;
    });
  };

  // Translate ALL "them" messages in the current conversation.
  // If every them-message is already translated → hide all (toggle off).
  // Otherwise translate every them-message (including any not yet translated).
  const translateAll = (langCode?: string) => {
    const target = langCode || convLang[activeId] || translationLanguage;
    const themMsgs = thread.filter((m) => m.from === "them");
    if (themMsgs.length === 0) {
      toast.info(t("messages.noTranslate"));
      return;
    }
    const allShown = !langCode && themMsgs.every((m) => translations[m.id]);
    setTranslations((prev) => {
      if (allShown) return {};
      const next = { ...prev };
      for (const m of themMsgs) next[m.id] = translateText(m.text, target);
      return next;
    });
  };

  // Per-tag mini portfolios so each identity card shows distinct content
  const portfolioByTag: Record<string, PortfolioItem[] | undefined> = {
    "🎨 插画师": buildPortfolio([
      {
        title: "暗黑奇幻 BJD 系列 · 2024",
        desc: "8 张原画 · 神秘学主题",
        tags: ["插画", "BJD", "暗黑奇幻"],
      },
      { title: "霓虹少女 概念稿 · 2024", desc: "赛博朋克角色设定", tags: ["概念设计", "角色"] },
      { title: "古风系列 · 桃夭", desc: "传统水墨与现代构图融合", tags: ["古风", "水墨"] },
      { title: "原创角色 · 月神", desc: "神秘学符号与塔罗灵感", tags: ["原创", "塔罗"] },
    ]),
    "📚 N1 日语": buildPortfolio([
      {
        title: "JLPT N1 · 满分通过",
        desc: "听力 60/60 · 阅读 58/60",
        tags: ["日语", "N1", "教学"],
      },
      {
        title: "线上日语家教 · 50+ 学员",
        desc: "商务、JLPT 备考、口语陪练",
        tags: ["家教", "线上"],
      },
      { title: "日中互译实务 · 2023", desc: "动漫脚本 / 商务文件翻译", tags: ["翻译"] },
      { title: "日本文化分享 Vlog", desc: "B 站 2 万粉丝", tags: ["内容创作"] },
    ]),
    "🍜 约饭搭子": buildPortfolio([
      { title: "首尔探店地图 · 50+ 家", desc: "弘大 / 江南 / 圣水洞", tags: ["美食", "首尔"] },
      { title: "周末桌游聚会 · 月度", desc: "8-12 人小型线下", tags: ["社交", "桌游"] },
      { title: "City Walk 路线设计", desc: "为新朋友定制半日路线", tags: ["City Walk"] },
      { title: "K-Pop 演唱会拼车", desc: "多次组织小团出行", tags: ["演唱会"] },
    ]),
  };

  const openActiveProfile = (scrollTag?: string) => {
    setProfile({
      userId: active.userId,
      name: active.name,
      initial: active.emoji,
      role: scrollTag || active.matchTag,
      region: active.region,
      bio: `来自 ${active.region} 的 ${active.matchTag},正在 Finding 上寻找长期合作伙伴。${
        scrollTag ? `当前查看身份卡:${scrollTag}` : ""
      }`,
      tags: [active.matchTag, "🎨 插画师", "📚 N1 日语", "🍜 约饭搭子"],
      portfolio: scrollTag ? portfolioByTag[scrollTag] : undefined,
    });
  };

  const openPartnerFullProfile = () => {
    try {
      localStorage.setItem(
        "finding:viewing-profile",
        JSON.stringify({
          name: active.name,
          emoji: active.emoji,
          region: active.region,
          role: active.matchTag,
        }),
      );
    } catch {
      // Ignore unavailable localStorage.
    }
    navigate({ to: "/user/$username", params: { username: active.name } });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField density={70} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.18_295/0.25),transparent_55%)]" />

      <div className="relative z-10 flex h-screen">
        <NavRail />

        {/* Conversations list */}
        <aside className="relative z-20 flex w-[320px] shrink-0 flex-col border-r border-white/5 bg-card/20 backdrop-blur-xl">
          <div className="border-b border-white/5 px-3 py-5">
            <div className="flex items-center justify-between px-2">
              <h1 className="font-display text-2xl font-bold">{t("messages.title")}</h1>
              <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                3 {t("messages.unread")}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <IconSearch size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("messages.searchPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="scrollbar-auto-hide flex-1 overflow-y-auto py-2">
            {convs.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl">
                  💬
                </div>
                <p className="text-sm font-medium text-foreground">{t("messages.emptyTitle")}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t("messages.emptyDesc")}
                </p>
              </div>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                title={c.name}
                className={`group relative flex w-full items-center gap-3 px-3 py-3 text-left transition ${
                  c.id === activeId
                    ? "bg-gradient-to-r from-primary/15 to-transparent"
                    : "hover:bg-white/5"
                }`}
              >
                {c.id === activeId && (
                  <motion.span
                    layoutId="active-conv"
                    className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-primary shadow-[0_0_12px_oklch(0.65_0.22_295)]"
                  />
                )}
                <div className="relative shrink-0">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-fuchsia-500/30 text-xl shadow-inner transition-all ${c.id === activeId ? "ring-2 ring-primary/60" : ""}`}
                  >
                    {c.emoji}
                  </div>
                  {c.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_8px_oklch(0.75_0.18_150)]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{c.preview}</div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      {c.matchTag}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{c.region}</span>
                  </div>
                </div>
                {c.unread > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 px-1.5 text-[10px] font-bold text-white shadow-[0_0_10px_oklch(0.65_0.22_295/0.6)]">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat window — show empty state when no conversations */}
        <main className="flex min-w-0 flex-1 flex-col">
          {!activeId && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
              <div className="grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/5 text-4xl">
                ✦
              </div>
              <p className="font-display text-lg font-bold">{t("messages.firstConnection")}</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                {t("messages.firstConnectionDesc")}
              </p>
            </div>
          )}
          {/* Chat header — only when active conversation selected */}
          {convs.length > 0 && (
            <header className="flex items-center justify-between border-b border-white/5 bg-card/20 px-6 py-4 backdrop-blur-xl">
              <button
                onClick={() => openActiveProfile()}
                className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-white/5 active:scale-[0.99]"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/40 to-fuchsia-500/30 text-lg">
                    {active.emoji}
                  </div>
                  {active.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{active.name}</span>
                    <span className="text-xs text-muted-foreground">{active.region}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {active.online ? t("messages.online") : t("messages.offline")}
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  ⚡ {t("messages.matchingTag")} · {active.matchTag}
                </span>
                {partnerCollapsed && (
                  <button
                    onClick={() => setPartnerCollapsed(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("messages.expandPartner")}
                  </button>
                )}
              </div>
            </header>
          )}

          {/* Messages — only show when active conversation selected */}
          {convs.length > 0 && (
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur">
                {t("messages.connectedThrough")}
              </div>
              <AnimatePresence initial={false}>
                {thread.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[70%] flex-col gap-1 ${m.from === "me" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={
                          m.from === "me"
                            ? "rounded-2xl rounded-br-md bg-gradient-to-br from-primary via-fuchsia-500 to-purple-600 px-4 py-2.5 text-sm text-white shadow-[0_8px_30px_-10px_oklch(0.55_0.25_300/0.6)]"
                            : "rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground backdrop-blur-xl"
                        }
                      >
                        {m.text}
                      </div>
                      {translations[m.id] && (
                        <div className="max-w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs italic text-muted-foreground/80">
                          {t("messages.translatedLabel")}:{translations[m.id]}
                        </div>
                      )}
                      <span className="px-1 text-[10px] text-muted-foreground/70">{m.time}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Input + actions — only show when active */}
          {convs.length > 0 && (
            <div className="border-t border-white/5 bg-card/30 px-6 py-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  ✓ {t("messages.complete")}
                </button>
                <button
                  onClick={handleMismatch}
                  className="flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-400/20"
                >
                  ✗ {t("messages.mismatch")}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/10 hover:text-foreground active:scale-95"
                >
                  📎 {t("messages.attach")}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 10 * 1024 * 1024) {
                      toast.error(t("messages.fileTooLarge"));
                      return;
                    }
                    setThread((p) => [
                      ...p,
                      {
                        id: `local-${Date.now()}`,
                        from: "me",
                        text: `📎 ${f.name}`,
                        time: t("time.now"),
                      },
                    ]);
                    toast.success(t("messages.attachmentSent"));
                    e.target.value = "";
                  }}
                />
                {(() => {
                  const themMsgs = thread.filter((m) => m.from === "them");
                  const allShown = themMsgs.length > 0 && themMsgs.every((m) => translations[m.id]);
                  const currentLang =
                    PREF_LANGS.find((l) => l.code === (convLang[activeId] || translationLanguage))
                      ?.label ?? "中文";
                  return (
                    <>
                      <button
                        onClick={() => {
                          if (themMsgs.length === 0) {
                            toast.info(t("messages.noTranslate"));
                            return;
                          }
                          if (allShown) {
                            translateAll();
                            return;
                          }
                          // First-ever use: prompt for language. Otherwise translate every message directly.
                          if (!convLang[activeId] && !hasChosenLang) {
                            setLangSearch("");
                            setShowLangPicker(true);
                          } else {
                            translateAll();
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${
                          allShown
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        }`}
                      >
                        ✦ {allShown ? t("messages.hideTranslation") : t("messages.translate")}
                      </button>
                      <button
                        onClick={() => {
                          setLangSearch("");
                          setShowLangPicker(true);
                        }}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                        title={t("messages.changeLang")}
                      >
                        🌐 {currentLang}
                      </button>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-primary/40 focus-within:bg-white/[0.07]">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={t("messages.inputPlaceholder")}
                  className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  onClick={send}
                  className="rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.25_300/0.7)] transition hover:shadow-[0_12px_32px_-8px_oklch(0.6_0.25_300/0.9)]"
                >
                  {t("common.send")}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Partner panel */}
        <AnimatePresence initial={false}>
          {!partnerCollapsed && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="hidden shrink-0 overflow-hidden border-l border-white/5 bg-card/20 backdrop-blur-xl xl:block"
            >
              <div className="w-[300px] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("messages.partnerInfo")}
                  </span>
                  <button
                    onClick={() => setPartnerCollapsed(true)}
                    className="rounded-lg p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    aria-label={t("messages.collapse")}
                  >
                    <IconX />
                  </button>
                </div>

                <button
                  onClick={() => openActiveProfile()}
                  className="mt-5 flex w-full flex-col items-center text-center transition hover:opacity-90 active:scale-[0.99]"
                >
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 via-fuchsia-500/40 to-purple-600/30 text-3xl shadow-[0_0_30px_-5px_oklch(0.65_0.22_295/0.6)]">
                      {active.emoji}
                    </div>
                    {active.online && (
                      <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-400" />
                    )}
                  </div>
                  <div className="mt-3 font-display text-lg font-bold">{active.name}</div>
                  <div className="text-xs text-muted-foreground">{active.region}</div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                    ⭐ {t("messages.reputationPro")}
                  </div>
                </button>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: t("messages.statMatches"), v: "12" },
                    { l: t("messages.statCollaborations"), v: "9" },
                    { l: t("messages.statPositive"), v: "100%" },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <div className="font-display text-base font-bold">{s.v}</div>
                      <div className="text-[10px] text-muted-foreground">{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("messages.thisMatch")}
                  </div>
                  <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <div className="font-medium text-foreground">{active.matchTag}</div>
                    <div className="mt-1 text-xs text-muted-foreground">AI 92% · 4</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("messages.identityCard")}
                  </div>
                  <div className="mt-2 space-y-2">
                    {["🎨 插画师", "📚 N1 日语", "🍜 约饭搭子"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => openActiveProfile(tag)}
                        className="block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs transition hover:border-primary/30 hover:bg-primary/10 active:scale-[0.99]"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    onClick={openPartnerFullProfile}
                    className="block w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-foreground transition hover:bg-white/10 active:scale-[0.99]"
                  >
                    {t("messages.viewProfile")}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setReportReason("harassment");
                        setReportNote("");
                        setShowReport(true);
                      }}
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 active:scale-95"
                    >
                      {t("messages.report")}
                    </button>
                    <button
                      onClick={() => setShowBlock(true)}
                      className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-center text-xs font-medium text-rose-300 transition hover:bg-rose-400/20 active:scale-95"
                    >
                      {t("messages.block")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Rating modal */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowRating(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_80px_-20px_oklch(0.55_0.25_300/0.7)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />

              <button
                onClick={() => setShowRating(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                aria-label={t("common.close")}
              >
                <IconX />
              </button>

              <div className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/50 via-fuchsia-500/40 to-purple-600/30 text-3xl shadow-[0_0_30px_-5px_oklch(0.65_0.22_295/0.6)]">
                    {active.emoji}
                  </div>
                  <h2 className="mt-4 font-display text-2xl font-bold">
                    {t("messages.completeCollabTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("messages.rateCollabPrefix")}{" "}
                    <span className="text-foreground">{active.name}</span>
                  </p>
                </div>

                {/* Stars */}
                <div className="mt-6 flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hoverRating || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        className="text-4xl transition-transform hover:scale-110"
                        aria-label={t("messages.starLabel", { n })}
                      >
                        <span
                          className={
                            filled
                              ? "bg-gradient-to-br from-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_oklch(0.85_0.18_85/0.6)]"
                              : "text-white/15"
                          }
                        >
                          ★
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {
                    [
                      "",
                      t("messages.ratingNeedsWork"),
                      t("messages.ratingOk"),
                      t("messages.ratingPrettyGood"),
                      t("messages.ratingHappy"),
                      t("messages.ratingPerfect"),
                    ][hoverRating || rating]
                  }
                </div>

                {/* Quick tags */}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {[
                    t("messages.tagSmooth"),
                    t("messages.tagProfessional"),
                    t("messages.tagFast"),
                    t("messages.tagExceeded"),
                    t("messages.tagRecommend"),
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setFeedback((f) => (f.includes(t) ? f : (f ? f + " · " : "") + t))
                      }
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
                    >
                      + {t}
                    </button>
                  ))}
                </div>

                {/* Feedback */}
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder={t("messages.feedbackPlaceholder")}
                  className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40 focus:bg-white/[0.07]"
                />

                <div className="mt-5 flex items-center gap-2">
                  <button
                    onClick={() => setShowRating(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  >
                    {t("common.later")}
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={submitting}
                    className="flex-[1.4] rounded-xl bg-gradient-to-br from-primary via-fuchsia-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.25_300/0.7)] transition hover:shadow-[0_12px_32px_-8px_oklch(0.6_0.25_300/0.9)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? t("settings.saving") : t("messages.submitReview")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation dialog for 完成合作 / 不匹配 */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_60px_-20px_oklch(0.55_0.25_300/0.7)] backdrop-blur-2xl"
            >
              <h3 className="font-display text-lg font-bold">
                {confirmAction === "complete"
                  ? t("messages.confirmComplete")
                  : t("messages.confirmMismatch")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {confirmAction === "complete"
                  ? t("messages.completeDesc")
                  : t("messages.mismatchDesc")}
              </p>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={confirmAction === "complete" ? confirmComplete : confirmMismatch}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] ${
                    confirmAction === "complete"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_8px_24px_-8px_oklch(0.65_0.18_150/0.7)]"
                      : "bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_25/0.7)]"
                  }`}
                >
                  {t("common.confirm")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfilePreviewModal open={profile} onClose={() => setProfile(null)} />

      {/* Block user modal */}
      <AnimatePresence>
        {showBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowBlock(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_60px_-20px_oklch(0.55_0.25_25/0.6)] backdrop-blur-2xl"
            >
              <h3 className="font-display text-lg font-bold">
                {t("messages.blockUserTitle", { name: active.name })}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("messages.blockUserDesc")}</p>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setShowBlock(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => void confirmBlockUser()}
                  className="flex-1 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.65_0.22_25/0.7)] transition active:scale-[0.98]"
                >
                  {t("messages.confirmBlock")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report user modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowReport(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_60px_-20px_oklch(0.7_0.18_60/0.5)] backdrop-blur-2xl"
            >
              <h3 className="font-display text-lg font-bold">
                {t("messages.reportUserTitle", { name: active.name })}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("messages.reportReasonPrompt")}
              </p>

              <div className="mt-4 space-y-2">
                {[
                  ["harassment", t("messages.reportHarassment")],
                  ["scam", t("messages.reportScam")],
                  ["inappropriate", t("messages.reportInappropriate")],
                  ["other", t("messages.reportOther")],
                ].map(([value, label]) => {
                  const checked = reportReason === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setReportReason(value)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        checked
                          ? "border-amber-400/50 bg-amber-400/10 text-foreground"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 place-items-center rounded-full border ${
                          checked ? "border-amber-400 bg-amber-400/30" : "border-white/30"
                        }`}
                      >
                        {checked && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                rows={3}
                placeholder={t("messages.reportNotePlaceholder")}
                className="mt-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-amber-400/40 focus:bg-white/[0.07]"
              />

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setShowReport(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => void submitReport()}
                  className="flex-1 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.65_0.22_25/0.7)] transition active:scale-[0.98]"
                >
                  {t("messages.submitReport")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language picker modal — for AI translation */}
      <AnimatePresence>
        {showLangPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowLangPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-[0_20px_60px_-20px_oklch(0.55_0.25_300/0.7)] backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                <div>
                  <h3 className="font-display text-lg font-bold">{t("messages.pickLangTitle")}</h3>
                  <p className="text-xs text-muted-foreground">{t("messages.pickLangDesc")}</p>
                </div>
                <button
                  onClick={() => setShowLangPicker(false)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <IconX />
                </button>
              </div>
              <div className="border-b border-white/5 px-5 py-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <IconSearch size={16} />
                  <input
                    autoFocus
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder={t("settings.searchPlaceholder")}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {(() => {
                  const q = langSearch.trim().toLowerCase();
                  const match = (l: { label: string }) => !q || l.label.toLowerCase().includes(q);
                  const pinned = PREF_LANGS.filter((l) =>
                    PINNED_LANG_CODES.includes(l.code),
                  ).filter(match);
                  const rest = PREF_LANGS.filter((l) => !PINNED_LANG_CODES.includes(l.code)).filter(
                    match,
                  );
                  const current = convLang[activeId] || translationLanguage;
                  const Row = ({ l }: { l: { code: string; label: string } }) => {
                    const active = current === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => {
                          setConvLang((p) => ({ ...p, [activeId]: l.code }));
                          // Update preferred language so the badge + settings stay in sync
                          setTranslationLanguage(l.code);
                          setHasChosenLang(true);
                          // Translate every message from the partner in the active conversation
                          translateAll(l.code);
                          setShowLangPicker(false);
                          toast.success(`${t("messages.langSet")}:${l.label}`);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          active ? "bg-primary/15 text-primary" : "text-foreground hover:bg-white/5"
                        }`}
                      >
                        <span>{l.label}</span>
                        {active && <span>✓</span>}
                      </button>
                    );
                  };
                  return (
                    <>
                      {pinned.length > 0 && (
                        <>
                          <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("settings.common")}
                          </div>
                          <div className="mb-4 grid grid-cols-2 gap-1">
                            {pinned.map((l) => (
                              <Row key={l.code} l={l} />
                            ))}
                          </div>
                        </>
                      )}
                      {rest.length > 0 && (
                        <>
                          <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("settings.allLanguages")}
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {rest.map((l) => (
                              <Row key={l.code} l={l} />
                            ))}
                          </div>
                        </>
                      )}
                      {pinned.length === 0 && rest.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {t("messages.noLanguagesFound")}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
