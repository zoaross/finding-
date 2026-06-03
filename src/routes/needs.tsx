import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { saveNeedCloseFeedback, type NeedCloseReason } from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";
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

export const Route = createFileRoute("/needs")({
  component: NeedsPage,
  head: () => ({
    meta: [
      { title: "我的需求 — Finding." },
      { name: "description", content: "管理你发布的全部需求,追踪每一次匹配。" },
    ],
  }),
});

type LocalStatus =
  | "active"
  | "paused"
  | "closed"
  | "matched"
  | "completed"
  | "failed"
  | "archived"
  | "unfinished";

type NeedRow = {
  id: string;
  user_id: string;
  content: string;
  parsed_intent: unknown;
  status: string | null;
  is_archived: boolean;
  created_at: string;
};

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const, active: true },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const },
];

const FILTERS = [
  { key: "all", labelKey: "needs.filter.all" },
  { key: "active", labelKey: "needs.filter.active" },
  { key: "archived", labelKey: "needs.filter.archived" },
  { key: "unfinished", labelKey: "needs.filter.unfinished" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const OVERRIDE_KEY = "finding:need-overrides";
const QUEUE_KEY = "finding:pending-need-status";
const RATING_KEY = "finding:need-ratings";
const NEEDS_UPDATED_EVENT = "finding:needs-updated";

function readOverrides(): Record<string, LocalStatus> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeOverrides(o: Record<string, LocalStatus>) {
  try {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(o));
  } catch {
    /* ignore */
  }
}
function readQueue(): LocalStatus[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: LocalStatus[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}
type RatingEntry = { rating: number; note: string; created_at: string };
function readRatings(): Record<string, RatingEntry> {
  try {
    return JSON.parse(localStorage.getItem(RATING_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeRatings(r: Record<string, RatingEntry>) {
  try {
    localStorage.setItem(RATING_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function explainNeedError(message: string) {
  if (message.includes("public.needs") || message.includes("schema cache")) {
    return `${message}\nRun supabase/fix_public_needs.sql in Supabase SQL Editor, then reload this page.`;
  }
  return message;
}

function effectiveStatus(n: NeedRow, overrides: Record<string, LocalStatus>): LocalStatus {
  const ov = overrides[n.id];
  if (ov) return ov;
  if (n.status === "paused") return "paused";
  if (n.status === "closed") return "closed";
  if (n.status === "matched") return "matched";
  if (n.status === "completed" || n.status === "done") return "completed";
  if (n.status === "failed") return "failed";
  if (n.is_archived) return "closed";
  return "active";
}

function statusMeta(s: LocalStatus) {
  switch (s) {
    case "closed":
      return { label: "已关闭", tone: "muted" as const };
    case "paused":
      return { label: "已暂停", tone: "muted" as const };
    case "matched":
      return { label: "已开始对话", tone: "live" as const };
    case "completed":
    case "archived":
      return { label: "已完成", tone: "live" as const };
    case "failed":
    case "unfinished":
      return { label: "未完成", tone: "warn" as const };
    default:
      return { label: "OPEN", tone: "live" as const };
  }
}

// ---------- Content-aware tag derivation ----------
const TAG_RULES: { match: RegExp; tags: string[] }[] = [
  { match: /(猫|狗|宠物|铲屎|喂养|遛|寄养)/, tags: ["宠物", "照护", "线下"] },
  { match: /(首尔|韩国|韩|韩语)/, tags: ["首尔", "韩国"] },
  { match: /(东京|日本|日语|大阪)/, tags: ["东京", "日本"] },
  { match: /(上海|魔都)/, tags: ["上海"] },
  { match: /(北京|帝都)/, tags: ["北京"] },
  { match: /(纽约|旧金山|洛杉矶|美国|硅谷)/, tags: ["北美", "出海"] },
  { match: /(柏林|伦敦|巴黎|欧洲)/, tags: ["欧洲"] },
  { match: /(设计|视觉|UI|UX|插画|品牌)/, tags: ["设计"] },
  { match: /(开发|工程师|程序员|前端|后端|代码|技术合伙人)/, tags: ["技术"] },
  { match: /(投资|融资|VC|天使)/, tags: ["投资人"] },
  { match: /(营销|增长|推广|短视频|抖音|小红书|TikTok)/, tags: ["营销", "短视频"] },
  { match: /(翻译|口译|笔译)/, tags: ["翻译"] },
  { match: /(线下|见面|碰面|喝咖啡|约饭)/, tags: ["线下"] },
  { match: /(远程|线上|视频|zoom)/, tags: ["线上"] },
  { match: /(AI|人工智能|大模型|LLM|GPT)/i, tags: ["AI"] },
  { match: /(摄影|拍摄|约拍|形象照)/, tags: ["摄影"] },
  { match: /(音乐|乐队|demo|编曲)/i, tags: ["音乐"] },
  { match: /(学习|备考|搭子|TOPIK|JLPT)/, tags: ["学习搭子"] },
];
function deriveTags(content: string): string[] {
  const out = new Set<string>();
  for (const r of TAG_RULES) if (r.match.test(content)) r.tags.forEach((t) => out.add(t));
  if (out.size === 0) out.add("一般");
  return Array.from(out).slice(0, 5);
}

function NeedsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [needs, setNeeds] = useState<NeedRow[] | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, LocalStatus>>({});
  const [ratings, setRatings] = useState<Record<string, RatingEntry>>({});
  const [closingNeed, setClosingNeed] = useState<NeedRow | null>(null);
  const [closeReason, setCloseReason] = useState<NeedCloseReason>("found_someone");
  const [closeFeedback, setCloseFeedback] = useState("");

  const setStatus = (id: string, s: LocalStatus) => {
    setOverrides((prev) => {
      const next = { ...prev, [id]: s };
      writeOverrides(next);
      return next;
    });
  };

  const updateNeed = async (id: string, patch: Partial<NeedRow>) => {
    setBusyId(id);
    const { error: err } = await supabase.from("needs").update(patch).eq("id", id);
    if (err) {
      // Don't toast — we still apply local override below for UX
      console.warn("[needs] update failed:", err.message);
      toast.error("Save failed", { description: explainNeedError(err.message) });
    } else {
      setNeeds((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, ...patch } : n)) : prev));
    }
    setBusyId(null);
    return !err;
  };

  const handleArchive = async (id: string) => {
    const target = (needs ?? []).find((n) => n.id === id);
    if (target) {
      setClosingNeed(target);
      setCloseReason("found_someone");
      setCloseFeedback("");
    }
  };

  const confirmCloseNeed = async () => {
    if (!user || !closingNeed) return;
    setStatus(closingNeed.id, "closed");
    await updateNeed(closingNeed.id, { is_archived: true, status: "closed" });
    try {
      await saveNeedCloseFeedback(user.id, closingNeed.id, closeReason, closeFeedback);
    } catch (error) {
      console.warn("[needs] close feedback save failed:", error);
    }
    toast.success("需求已关闭", {
      description: "这不会被标记为完成。你的关闭原因会用于之后改进匹配质量。",
    });
    setClosingNeed(null);
    setCloseFeedback("");
  };

  const handleRepublish = async (id: string) => {
    setStatus(id, "active");
    await updateNeed(id, { is_archived: false, status: "open" });
    toast.success("需求已重新发布");
  };

  const handleSaveRating = (id: string, entry: RatingEntry) => {
    setRatings((prev) => {
      const next = { ...prev, [id]: entry };
      writeRatings(next);
      return next;
    });
    toast.success("感谢你的评价 ✨");
  };

  const selected = (needs ?? []).find((n) => n.id === selectedId) ?? null;

  useEffect(() => {
    setOverrides(readOverrides());
    setRatings(readRatings());
  }, []);

  useEffect(() => {
    const syncOverrides = () => setOverrides(readOverrides());
    window.addEventListener(NEEDS_UPDATED_EVENT, syncOverrides);
    window.addEventListener("storage", syncOverrides);
    return () => {
      window.removeEventListener(NEEDS_UPDATED_EVENT, syncOverrides);
      window.removeEventListener("storage", syncOverrides);
    };
  }, []);

  // Apply queued chat actions (from messages page) to oldest active needs
  useEffect(() => {
    if (!needs || needs.length === 0) return;
    const queue = readQueue();
    if (queue.length === 0) return;
    const cur = readOverrides();
    // Sort active needs by oldest first
    const actives = needs
      .filter((n) => effectiveStatus(n, cur) === "active")
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    let i = 0;
    const taken: LocalStatus[] = [];
    for (const action of queue) {
      const target = actives[i++];
      if (!target) {
        taken.push(action); // can't apply, keep in queue
        continue;
      }
      cur[target.id] = action;
      if (action === "completed") {
        supabase
          .from("needs")
          .update({ is_archived: true, status: "completed" })
          .eq("id", target.id);
      }
      if (action === "failed") {
        supabase.from("needs").update({ is_archived: true, status: "failed" }).eq("id", target.id);
      }
    }
    writeOverrides(cur);
    writeQueue(taken);
    setOverrides({ ...cur });
  }, [needs]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      const { data: rows, error: err } = await supabase
        .from("needs")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (err) setError(explainNeedError(err.message));
      setNeeds((rows as NeedRow[]) ?? []);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      else setUser(session.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const filtered = (needs ?? []).filter((n) => {
    const s = effectiveStatus(n, overrides);
    if (filter === "all") return true;
    if (filter === "archived") return ["archived", "closed", "completed", "paused"].includes(s);
    if (filter === "unfinished") return ["unfinished", "failed"].includes(s);
    return s === filter;
  });

  const counts = {
    active: 0,
    archived: 0,
    unfinished: 0,
  };
  for (const n of needs ?? []) {
    const s = effectiveStatus(n, overrides);
    if (s === "failed" || s === "unfinished") counts.unfinished++;
    else if (s === "active" || s === "matched") counts.active++;
    else counts.archived++;
  }

  const displayName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    user?.email?.split("@")[0] ||
    "朋友";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1400px] gap-5 px-4 py-5 lg:px-6">
        {/* SIDEBAR */}
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

        {/* MAIN */}
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {/* mobile bar */}
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <FindingMark size={28} />
              <span className="font-display text-lg font-extrabold">
                Finding<span className="text-accent">.</span>
              </span>
            </Link>
            <Link
              to="/home"
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-muted-foreground"
            >
              {t("nav.home")}
            </Link>
          </div>

          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <p className="text-sm text-muted-foreground">{t("needs.subtitle")}</p>
              <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                <span className="text-gradient">{t("needs.title")}</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {needs?.length ?? 0} · {counts.active} {t("needs.filter.active")} ·{" "}
                {counts.archived} {t("needs.filter.archived")} · {counts.unfinished}{" "}
                {t("needs.filter.unfinished")}
              </p>
            </div>
            <Link
              to="/home"
              className="group inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
            >
              <IconInfinity size={16} />
              {t("needs.publishNew")}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </motion.section>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="flex flex-wrap items-center gap-2"
          >
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                  filter === f.key
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter === f.key && (
                  <motion.span
                    layoutId="needs-filter-pill"
                    className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{t(f.labelKey)}</span>
              </button>
            ))}
          </motion.div>

          {/* Content */}
          {error && (
            <div className="glass-card rounded-2xl border border-destructive/30 p-4 text-sm text-destructive">
              {t("needs.loadFailed")}:{error}
            </div>
          )}

          {needs === null ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <EmptyState hasAny={(needs?.length ?? 0) > 0} filter={filter} />
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
              className="grid gap-4 md:grid-cols-2"
            >
              <AnimatePresence>
                {filtered.map((n) => (
                  <NeedCard
                    key={n.id}
                    need={n}
                    status={effectiveStatus(n, overrides)}
                    onOpen={() => setSelectedId(n.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </main>
      </div>

      <NeedDetailModal
        need={selected}
        status={selected ? effectiveStatus(selected, overrides) : "active"}
        rating={selected ? (ratings[selected.id] ?? null) : null}
        busy={busyId === selected?.id}
        onClose={() => setSelectedId(null)}
        onArchive={() => selected && handleArchive(selected.id)}
        onRepublish={() => selected && handleRepublish(selected.id)}
        onSaveRating={(entry) => selected && handleSaveRating(selected.id, entry)}
      />
      <CloseNeedModal
        need={closingNeed}
        reason={closeReason}
        feedback={closeFeedback}
        busy={busyId === closingNeed?.id}
        onReason={setCloseReason}
        onFeedback={setCloseFeedback}
        onCancel={() => setClosingNeed(null)}
        onConfirm={() => void confirmCloseNeed()}
      />
    </div>
  );
}

function NeedCard({
  need,
  status,
  onOpen,
}: {
  need: NeedRow;
  status: LocalStatus;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const meta = statusMeta(status);
  const matchCount = mockMatchCount(need.id);

  const toneClass =
    meta.tone === "live"
      ? "bg-emerald-400/15 text-emerald-300"
      : meta.tone === "warn"
        ? "bg-amber-400/15 text-amber-300"
        : "bg-white/5 text-muted-foreground";

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0 },
      }}
      exit={{ opacity: 0, y: -8 }}
      className="contents"
    >
      <button
        type="button"
        onClick={onOpen}
        className="glass-card card-premium hover-lift group relative flex flex-col overflow-hidden rounded-3xl p-5 text-left transition-transform active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20" />

        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${toneClass}`}
          >
            {meta.tone === "live" && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
            )}
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{formatDate(need.created_at)}</span>
        </div>

        <p className="mt-4 line-clamp-4 text-[15px] leading-relaxed text-foreground">
          {need.content}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconGlobe size={14} className="text-accent" />
            <span>
              <span>{t("needs.matchesCount", { n: matchCount })}</span>
            </span>
          </div>
          <span
            role="presentation"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-transform group-hover:translate-x-0.5"
          >
            {t("needs.viewDetail")}
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function SkeletonList() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card animate-pulse rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded-full bg-white/5" />
            <div className="h-3 w-12 rounded-full bg-white/5" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-white/5" />
            <div className="h-3 w-11/12 rounded bg-white/5" />
            <div className="h-3 w-2/3 rounded bg-white/5" />
          </div>
          <div className="mt-6 h-3 w-24 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasAny, filter }: { hasAny: boolean; filter: FilterKey }) {
  const { t } = useI18n();
  const isFiltered = hasAny && filter !== "all";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card relative overflow-hidden rounded-3xl p-10 text-center md:p-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-radial-purple opacity-40" />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="relative mb-6 grid h-32 w-32 place-items-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[image:var(--gradient-primary)] opacity-20 blur-2xl" />
          <svg viewBox="0 0 128 128" className="relative h-32 w-32">
            <defs>
              <linearGradient id="empty-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.18 295)" />
                <stop offset="100%" stopColor="oklch(0.55 0.22 290)" />
              </linearGradient>
            </defs>
            <circle
              cx="64"
              cy="64"
              r="46"
              fill="none"
              stroke="url(#empty-grad)"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <circle
              cx="64"
              cy="64"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.25"
            />
            <circle
              cx="64"
              cy="64"
              r="22"
              fill="none"
              stroke="url(#empty-grad)"
              strokeWidth="1.4"
            />
            <circle cx="64" cy="64" r="4" fill="url(#empty-grad)" />
          </svg>
        </div>

        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {isFiltered ? t("needs.empty.filtered") : t("needs.empty.start")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isFiltered ? t("needs.empty.filteredDesc") : t("needs.empty.startDesc")}
        </p>

        <Link
          to="/home"
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
        >
          <IconInfinity size={16} />
          {isFiltered ? t("needs.publishNew") : t("needs.publishFirst")}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </motion.div>
  );
}

// ---------- Helpers & Detail Modal ----------

function mockMatchCount(id: string) {
  return Math.abs(Array.from(id).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)) % 48;
}

function CloseNeedModal({
  need,
  reason,
  feedback,
  busy,
  onReason,
  onFeedback,
  onCancel,
  onConfirm,
}: {
  need: NeedRow | null;
  reason: NeedCloseReason;
  feedback: string;
  busy: boolean;
  onReason: (reason: NeedCloseReason) => void;
  onFeedback: (feedback: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reasons: Array<{ value: NeedCloseReason; label: string }> = [
    { value: "found_someone", label: "已经找到合适的人" },
    { value: "temporarily_not_needed", label: "暂时不需要了" },
    { value: "bad_match_quality", label: "匹配质量不好" },
    { value: "wrong_content", label: "内容写错了" },
    { value: "other", label: "其他原因" },
  ];

  return (
    <AnimatePresence>
      {need && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-card w-full max-w-lg rounded-t-3xl border border-[var(--border-strong)] p-6 md:rounded-3xl"
          >
            <h3 className="font-display text-xl font-bold">关闭这个需求？</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              关闭不代表需求已完成。只有真实合作结束后才会进入 COMPLETED。
            </p>
            <div className="mt-5 space-y-2">
              {reasons.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onReason(item.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    reason === item.value
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-[var(--border)] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(event) => onFeedback(event.target.value)}
              rows={4}
              placeholder="可选反馈：AI 匹配不准、韩国用户不够、作品卡太浅、语言问题..."
              className="mt-4 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-[var(--border-strong)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[var(--border)] px-5 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                取消
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="rounded-full border border-destructive/40 px-5 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
              >
                {busy ? "处理中..." : "确认关闭"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MATCH_NAMES = [
  {
    userId: "10000000-0000-0000-0000-000000000001",
    name: "hana_seoul",
    initial: "H",
    grad: "from-fuchsia-500 to-purple-600",
  },
  {
    userId: "10000000-0000-0000-0000-000000000002",
    name: "minjun_backend",
    initial: "M",
    grad: "from-cyan-500 to-blue-600",
  },
  {
    userId: "10000000-0000-0000-0000-000000000004",
    name: "yui_designs",
    initial: "Y",
    grad: "from-rose-500 to-orange-500",
  },
  {
    userId: "10000000-0000-0000-0000-000000000008",
    name: "mei_exchange",
    initial: "M",
    grad: "from-emerald-500 to-teal-600",
  },
  {
    userId: "10000000-0000-0000-0000-000000000040",
    name: "tae_frontend",
    initial: "T",
    grad: "from-violet-500 to-indigo-600",
  },
];

function pickFromSeed<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  let s = seed;
  const used = new Set<number>();
  while (out.length < n && used.size < arr.length) {
    s = (s * 9301 + 49297) % 233280;
    const idx = s % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

function NeedDetailModal({
  need,
  status,
  rating,
  busy,
  onClose,
  onArchive,
  onRepublish,
  onSaveRating,
}: {
  need: NeedRow | null;
  status: LocalStatus;
  rating: RatingEntry | null;
  busy: boolean;
  onClose: () => void;
  onArchive: () => void;
  onRepublish: () => void;
  onSaveRating: (entry: RatingEntry) => void;
}) {
  const navigate = useNavigate();
  const openMatchedProfile = (m: (typeof MATCH_NAMES)[number]) => {
    navigate({ to: "/user/$username", params: { username: m.name } });
  };
  const seed = useMemo(
    () => (need ? Array.from(need.id).reduce((a, c) => a + c.charCodeAt(0), 0) : 0),
    [need],
  );
  const tags = useMemo(() => (need ? deriveTags(need.content) : []), [need]);
  const matched = useMemo(
    () =>
      need
        ? pickFromSeed(MATCH_NAMES, seed + 7, 3).map((m, i) => ({
            ...m,
            score: 96 - i * 3 - (seed % 5),
          }))
        : [],
    [need, seed],
  );

  // Collaboration duration in days (deterministic per need)
  const collabDays = useMemo(() => {
    if (!need) return 0;
    if (status === "archived") {
      const created = +new Date(need.created_at);
      const days = Math.max(1, Math.round((Date.now() - created) / 86400000));
      // Cap to a friendly range; fallback to seed-based 7-30 if days is huge
      return days > 90 ? 7 + (seed % 24) : days;
    }
    return 0;
  }, [need, status, seed]);

  const [stars, setStars] = useState<number>(rating?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState<string>(rating?.note ?? "");
  useEffect(() => {
    setStars(rating?.rating ?? 0);
    setNote(rating?.note ?? "");
  }, [rating, need?.id]);

  if (!need) return null;
  const meta = statusMeta(status);
  const isArchived = status === "archived" || status === "completed";
  const isClosedLike = isArchived || status === "closed" || status === "paused";
  const isUnfinished = status === "unfinished";
  const matchCount = mockMatchCount(need.id);

  return (
    <AnimatePresence>
      {need && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[var(--border-strong)] p-6 md:rounded-3xl md:p-8"
          >
            <button
              onClick={onClose}
              aria-label="关闭"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-background/60 text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground active:scale-95"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isArchived
                    ? "bg-white/5 text-muted-foreground"
                    : isUnfinished
                      ? "bg-amber-400/15 text-amber-300"
                      : "bg-emerald-400/15 text-emerald-300"
                }`}
              >
                {meta.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                发布于 {new Date(need.created_at).toLocaleString("zh-CN")}
              </span>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {need.content}
            </p>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">AI 解析标签</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1 text-xs text-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Completed: completion summary + rating */}
            {status === "completed" || status === "archived" ? (
              <>
                <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        合作时长
                      </p>
                      <p className="mt-1 font-display text-2xl font-bold text-foreground">
                        {collabDays} 天
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        最终状态
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300">
                        需求已圆满完成 ✓
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold">合作评价</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {rating
                      ? "你已留下评价,可随时修改并重新提交。"
                      : "为这次合作打个分,留下你的感受。"}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const filled = (hover || stars) >= n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onMouseEnter={() => setHover(n)}
                          onMouseLeave={() => setHover(0)}
                          onClick={() => setStars(n)}
                          className="text-3xl transition-transform hover:scale-110 active:scale-95"
                          aria-label={`${n} 星`}
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
                    <span className="ml-2 text-xs text-muted-foreground">
                      {["", "需要改进", "一般", "还不错", "很满意", "完美合作 ✨"][
                        hover || stars
                      ] || "未评分"}
                    </span>
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="记录这次合作..."
                    className="mt-4 w-full rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!stars) {
                          toast.error("请先选择星级");
                          return;
                        }
                        onSaveRating({
                          rating: stars,
                          note: note.trim(),
                          created_at: new Date().toISOString(),
                        });
                      }}
                      className="rounded-full bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] active:scale-95"
                    >
                      提交评价
                    </button>
                  </div>
                </div>

                {/* Archived: collaboration partners summary */}
                <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">合作伙伴</p>
                    <span className="text-[11px] text-muted-foreground">本次需求</span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {matched.map((m, i) => {
                      const msgCount = 12 + ((seed + i * 7) % 48);
                      const partnerDays = Math.max(1, collabDays - (i % 3));
                      return (
                        <li
                          key={m.name}
                          className="flex items-center gap-3 rounded-xl border border-transparent bg-white/[0.02] p-3 transition-colors hover:border-[var(--border)]"
                        >
                          <div
                            className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${m.grad} text-sm font-bold text-white`}
                          >
                            {m.initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="text-accent">匹配度 {m.score}%</span>
                              <span>共聊了 {msgCount} 条消息</span>
                              <span>合作 {partnerDays} 天</span>
                            </div>
                          </div>
                          <button
                            onClick={() => openMatchedProfile(m)}
                            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground active:scale-95"
                          >
                            查看资料 →
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    匹配到 <span className="text-accent">{matchCount}</span> 个候选
                  </p>
                  <span className="text-[11px] text-muted-foreground">TOP 3</span>
                </div>

                <ul className="mt-4 space-y-3">
                  {matched.map((m) => (
                    <li
                      key={m.name}
                      className="flex items-center gap-3 rounded-xl border border-transparent bg-white/[0.02] p-3 transition-colors hover:border-[var(--border)]"
                    >
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${m.grad} text-sm font-bold text-white`}
                      >
                        {m.initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-accent">匹配度 {m.score}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            navigate({ to: "/user/$username", params: { username: m.name } })
                          }
                          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground active:scale-95"
                        >
                          查看作品卡
                        </button>
                        <button
                          onClick={() => openMatchedProfile(m)}
                          className="rounded-full bg-[image:var(--gradient-primary)] px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] active:scale-95"
                        >
                          查看匹配 →
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {isClosedLike || isUnfinished || status === "failed" ? (
                <button
                  onClick={onRepublish}
                  disabled={busy}
                  className="rounded-full bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                >
                  {busy ? "处理中…" : "重新发布"}
                </button>
              ) : (
                <button
                  onClick={onArchive}
                  disabled={busy}
                  className="rounded-full border border-destructive/40 px-5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-95 disabled:opacity-60"
                >
                  {busy ? "处理中…" : "关闭需求"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
