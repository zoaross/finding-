import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { openOrCreateConversation } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { loadUserSettings, setSavedNeed } from "@/lib/socialActions";
import { useI18n } from "@/lib/i18n";
import {
  FindingMark,
  IconTarget,
  IconGlobe,
  IconChat,
  IconBell,
  IconSettings,
  IconShield,
  IconUser,
} from "@/components/icons/FindingIcons";
import type { GlobeHandle, GlobeCity, GlobeRegion } from "@/components/discover/Globe3D";
import { ProfilePreviewModal, type ProfilePreviewData } from "@/components/ProfilePreviewModal";
import { SearchDropdown } from "@/components/SearchDropdown";

const Globe3D = lazy(() =>
  import("@/components/discover/Globe3D").then((m) => ({ default: m.Globe3D })),
);

export const Route = createFileRoute("/discover")({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: "需求大厅 — Finding." },
      { name: "description", content: "在全球需求广场中,发现与你共振的人。" },
    ],
  }),
});

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const, active: true },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const },
];

type Region = "all" | "韩国" | "日本" | "美国" | "欧洲" | "东南亚" | "其他";
const filters: { key: Region; label: string }[] = [
  { key: "all", label: "🌐 全球" },
  { key: "韩国", label: "🇰🇷 韩国" },
  { key: "日本", label: "🇯🇵 日本" },
  { key: "美国", label: "🇺🇸 美国" },
  { key: "欧洲", label: "🇪🇺 欧洲" },
  { key: "东南亚", label: "🌏 东南亚" },
  { key: "其他", label: "✦ 其他" },
];

const tagColors = ["accent", "blue", "green"] as const;
const tagClass = {
  accent: "border-accent/30 bg-accent/10 text-accent-soft",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
} as const;

export type NeedItem = {
  id: string;
  userId?: string | null;
  emoji: string;
  name: string;
  flag: string;
  ago: string;
  views: number;
  content: string;
  tags: string[];
  heat: number;
  region: Exclude<Region, "all">;
  city: string;
  country?: string | null;
};

type NearbyLocation = {
  country: string | null;
  city: string | null;
  region: string | null;
};

// Empty export — real data loaded from DB; kept for SearchDropdown import
export const mockNeeds: NeedItem[] = [];

const _legacyMock: NeedItem[] = [
  {
    id: "1",
    userId: null,
    emoji: "🎨",
    name: "luna_bjd",
    flag: "🇰🇷",
    ago: "3 分钟前",
    views: 248,
    content: "寻找 BJD 娃娃定制画师,暗黑奇幻风格,长期合作,可面议预算。",
    tags: ["BJD", "插画", "创意"],
    heat: 5,
    region: "韩国",
    city: "首尔",
  },
  {
    id: "2",
    userId: null,
    emoji: "💻",
    name: "startup_ceo",
    flag: "🇺🇸",
    ago: "12 分钟前",
    views: 512,
    content: "招聘 React 前端工程师,远程优先,长期合作,熟悉 TanStack 与 Tailwind。",
    tags: ["技术", "远程", "招聘"],
    heat: 5,
    region: "美国",
    city: "纽约",
  },
  {
    id: "3",
    userId: null,
    emoji: "🍜",
    name: "foodie_서울",
    flag: "🇰🇷",
    ago: "26 分钟前",
    views: 134,
    content: "找周末约饭搭子,江南区附近探店,口味不挑,只求一起开心吃。",
    tags: ["社交", "约饭", "首尔"],
    heat: 3,
    region: "韩国",
    city: "首尔",
  },
  {
    id: "4",
    userId: null,
    emoji: "🎵",
    name: "indie_music",
    flag: "🇯🇵",
    ago: "44 分钟前",
    views: 198,
    content: "寻找词曲合作伙伴,一起做 EP,city pop / lo-fi 方向,中日双语都可。",
    tags: ["音乐", "创意", "合作"],
    heat: 4,
    region: "日本",
    city: "东京",
  },
  {
    id: "5",
    emoji: "💬",
    name: "anon_user",
    flag: "🌏",
    ago: "1 小时前",
    views: 87,
    content: "最近压力很大,想找人聊聊天。不需要建议,只想被听见。",
    tags: ["倾诉", "陪伴"],
    heat: 3,
    region: "其他",
    city: "全球",
  },
  {
    id: "6",
    emoji: "📸",
    name: "photo_kim",
    flag: "🇰🇷",
    ago: "1 小时前",
    views: 312,
    content: "需要摄影师拍形象照,弘大附近,自然光风格,周末出片。",
    tags: ["摄影", "首尔", "技能"],
    heat: 4,
    region: "韩国",
    city: "首尔",
  },
  {
    id: "7",
    emoji: "🎮",
    name: "game_dev",
    flag: "🇩🇪",
    ago: "2 小时前",
    views: 421,
    content: "寻找独立游戏美术师,像素风格,Roguelike 题材,可分成可现金。",
    tags: ["游戏", "设计", "合作"],
    heat: 4,
    region: "欧洲",
    city: "柏林",
  },
  {
    id: "8",
    emoji: "📚",
    name: "study_buddy",
    flag: "🇸🇬",
    ago: "3 小时前",
    views: 165,
    content: "备考 TOPIK 6 级,找学习搭子互相监督,每天打卡 + 周末复盘。",
    tags: ["学习", "韩语", "社交"],
    heat: 3,
    region: "东南亚",
    city: "新加坡",
  },
];

// City positions for globe (lat/lng only — counts loaded from DB)
const CITY_POSITIONS: GlobeCity[] = [
  {
    name: "首尔",
    flag: "🇰🇷",
    lat: 37.57,
    lng: 126.98,
    count: 0,
    tags: ["#约饭", "#摄影", "#技能"],
  },
  {
    name: "东京",
    flag: "🇯🇵",
    lat: 35.68,
    lng: 139.69,
    count: 0,
    tags: ["#音乐", "#设计", "#创业"],
  },
  { name: "纽约", flag: "🇺🇸", lat: 40.71, lng: -74.0, count: 0, tags: ["#招聘", "#远程", "#Web3"] },
  {
    name: "上海",
    flag: "🇨🇳",
    lat: 31.23,
    lng: 121.47,
    count: 0,
    tags: ["#纪录片", "#调色", "#学习"],
  },
  {
    name: "新加坡",
    flag: "🇸🇬",
    lat: 1.35,
    lng: 103.82,
    count: 0,
    tags: ["#Web3", "#内容", "#英文"],
  },
  { name: "伦敦", flag: "🇬🇧", lat: 51.51, lng: -0.13, count: 0, tags: ["#艺术", "#时尚", "#音乐"] },
  { name: "巴黎", flag: "🇫🇷", lat: 48.86, lng: 2.35, count: 0, tags: ["#摄影", "#设计", "#数学"] },
  { name: "柏林", flag: "🇩🇪", lat: 52.52, lng: 13.4, count: 0, tags: ["#游戏", "#技术", "#像素"] },
  {
    name: "悉尼",
    flag: "🇦🇺",
    lat: -33.87,
    lng: 151.21,
    count: 0,
    tags: ["#冲浪", "#约饭", "#留学"],
  },
  {
    name: "迪拜",
    flag: "🇦🇪",
    lat: 25.2,
    lng: 55.27,
    count: 0,
    tags: ["#音乐", "#跨语言", "#创业"],
  },
  {
    name: "多伦多",
    flag: "🇨🇦",
    lat: 43.65,
    lng: -79.38,
    count: 0,
    tags: ["#留学", "#招聘", "#移民"],
  },
  {
    name: "圣保罗",
    flag: "🇧🇷",
    lat: -23.55,
    lng: -46.63,
    count: 0,
    tags: ["#妈妈", "#社群", "#华人"],
  },
];

function formatTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
function idHash(id: string, mod: number, offset = 0) {
  return (
    (Math.abs(id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % mod) + offset
  );
}
function inferRegion(intent: Record<string, unknown> | null): Exclude<Region, "all"> {
  const txt = JSON.stringify(intent ?? "");
  if (/韩国|首尔|korea|seoul/i.test(txt)) return "韩国";
  if (/日本|东京|japan|tokyo/i.test(txt)) return "日本";
  if (/美国|纽约|旧金山|usa|america/i.test(txt)) return "美国";
  if (/欧洲|柏林|伦敦|europe|berlin|london/i.test(txt)) return "欧洲";
  if (/东南亚|新加坡|singapore/i.test(txt)) return "东南亚";
  return "其他";
}

function inferRegionFromLocation(...parts: Array<string | null | undefined>): Exclude<Region, "all"> {
  const txt = parts.filter(Boolean).join(" ");
  if (/韩国|首尔|korea|seoul/i.test(txt)) return "韩国";
  if (/日本|东京|japan|tokyo/i.test(txt)) return "日本";
  if (/美国|纽约|旧金山|usa|america|united states/i.test(txt)) return "美国";
  if (/欧洲|柏林|伦敦|巴黎|europe|berlin|london|paris|germany|france|uk/i.test(txt)) {
    return "欧洲";
  }
  if (/东南亚|新加坡|singapore|thailand|vietnam|indonesia|malaysia/i.test(txt)) {
    return "东南亚";
  }
  return "其他";
}

function nearbyRank(need: NeedItem, nearby: NearbyLocation | null) {
  if (!nearby) return 0;
  const city = nearby.city?.toLowerCase();
  const country = nearby.country?.toLowerCase();
  const region = nearby.region?.toLowerCase();
  let score = 0;
  if (city && need.city.toLowerCase() === city) score += 6;
  if (country && need.country?.toLowerCase() === country) score += 4;
  if (region && need.region.toLowerCase().includes(region)) score += 2;
  if (nearby.country && need.region === inferRegionFromLocation(nearby.country)) score += 1;
  return score;
}

function useCounter(target: number, duration = 1500) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(Math.floor(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function DiscoverPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<"list" | "globe">("list");
  const [filter, setFilter] = useState<Region>("all");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePreviewData | null>(null);
  const [query, setQuery] = useState("");

  const [activeCity, setActiveCity] = useState<GlobeCity | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [region, setRegion] = useState<GlobeRegion>("asia");
  const globeRef = useRef<GlobeHandle>(null);
  const [dbNeeds, setDbNeeds] = useState<NeedItem[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [displayCities, setDisplayCities] = useState<GlobeCity[]>(CITY_POSITIONS);
  const [nearbyLocation, setNearbyLocation] = useState<NearbyLocation | null>(null);

  const loadBookmarkedIds = async (uid: string) => {
    const { data } = await (supabase as any)
      .from("saved_needs")
      .select("need_id")
      .eq("user_id", uid);
    if (data) setBookmarkedIds(new Set((data as any[]).map((r: any) => r.need_id as string)));
  };

  const loadNearbyPreference = async (uid: string) => {
    try {
      const settings = await loadUserSettings(uid);
      const privacy = (settings?.privacy_settings ?? {}) as { useLocationForMatching?: boolean };
      if (!privacy.useLocationForMatching) {
        setNearbyLocation(null);
        return;
      }
      const { data } = await (supabase as any)
        .from("profiles")
        .select("country, city, region")
        .eq("id", uid)
        .limit(1);
      const row = Array.isArray(data) ? data[0] : null;
      if (!row?.city && !row?.country && !row?.region) {
        setNearbyLocation(null);
        return;
      }
      setNearbyLocation({
        country: (row.country as string) ?? null,
        city: (row.city as string) ?? null,
        region: (row.region as string) ?? null,
      });
    } catch (error) {
      console.warn("[discover] nearby preference unavailable:", error);
      setNearbyLocation(null);
    }
  };

  const toggleBookmark = async (needId: string) => {
    if (!user) {
      toast.error(t("messages.signInRequired"));
      return;
    }
    const already = bookmarkedIds.has(needId);
    setBookmarkedIds((s) => {
      const n = new Set(s);
      if (already) n.delete(needId);
      else n.add(needId);
      return n;
    });
    const { error } = await setSavedNeed(user.id, needId, !already)
      .then(() => ({ error: null }))
      .catch((err) => ({ error: err as Error }));
    if (error) {
      setBookmarkedIds((s) => {
        const n = new Set(s);
        if (already) n.add(needId);
        else n.delete(needId);
        return n;
      });
      toast.error(t("discover.saveFailed"));
      return;
    }
    if (already) {
      toast.success(t("discover.unsavedToast"));
    } else {
      toast.success(t("discover.savedToast"));
    }
  };

  const loadDbNeeds = async () => {
    const { data: rows } = await (supabase as any)
      .from("needs")
      .select("id, content, created_at, user_id, parsed_intent")
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(60);
    if (!rows?.length) return;
    const userIds = [...new Set((rows as any[]).map((r: any) => r.user_id as string))];
    const { data: profs } = await (supabase as any)
      .from("profiles")
      .select("id, username, avatar_emoji, country, city, region")
      .in("id", userIds);
    const profileMap = new Map<
      string,
      { username: string; emoji: string; country: string | null; city: string | null; region: string | null }
    >(
      ((profs as any[]) ?? []).map((p: any) => [
        p.id as string,
        {
          username: (p.username as string) ?? t("home.userFallback"),
          emoji: (p.avatar_emoji as string) ?? "📝",
          country: (p.country as string) ?? null,
          city: (p.city as string) ?? null,
          region: (p.region as string) ?? null,
        },
      ]),
    );
    const items: NeedItem[] = (rows as any[]).map((r: any) => {
      const intent = r.parsed_intent as Record<string, unknown> | null;
      const tags = Array.isArray(intent?.tags) ? (intent!.tags as string[]) : [];
      const owner = profileMap.get(r.user_id as string);
      return {
        id: r.id as string,
        userId: r.user_id as string,
        emoji: owner?.emoji ?? "📝",
        name: owner?.username ?? t("home.userFallback"),
        flag: "🌏",
        ago: formatTime(r.created_at as string),
        views: idHash(r.id as string, 400, 80),
        content: r.content as string,
        tags: tags.slice(0, 3),
        heat: idHash(r.id as string, 4, 1),
        region: inferRegion(intent) || inferRegionFromLocation(owner?.country, owner?.region),
        city: (intent?.region as string) ?? owner?.city ?? t("home.global"),
        country: owner?.country ?? null,
      };
    });
    setDbNeeds(items);

    // Update city counts from real needs (map region → city)
    const regionCount: Record<string, number> = {};
    for (const n of items) regionCount[n.region] = (regionCount[n.region] ?? 0) + 1;

    const regionToCity: Record<string, string[]> = {
      韩国: ["首尔"],
      日本: ["东京"],
      美国: ["纽约"],
      欧洲: ["柏林", "伦敦", "巴黎"],
      东南亚: ["新加坡"],
      其他: ["上海", "迪拜", "多伦多", "悉尼", "圣保罗"],
    };
    const cityCount: Record<string, number> = {};
    for (const [region, cityNames] of Object.entries(regionToCity)) {
      const share = Math.floor((regionCount[region] ?? 0) / cityNames.length);
      for (const c of cityNames) cityCount[c] = share;
    }
    setDisplayCities(CITY_POSITIONS.map((c) => ({ ...c, count: cityCount[c.name] ?? 0 })));
  };

  // Live counter — seeded with real profiles count
  const [liveBase, setLiveBase] = useState(0);
  useEffect(() => {
    (supabase as any)
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .then(({ count }: { count: number | null }) => setLiveBase(count ?? 0));
    const id = setInterval(() => setLiveBase((v) => v + Math.floor(Math.random() * 3)), 3000);
    return () => clearInterval(id);
  }, []);
  const liveCount = useCounter(liveBase, 600);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      void loadNearbyPreference(data.session.user.id);
      void loadDbNeeds();
      void loadBookmarkedIds(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) navigate({ to: "/auth" });
      else {
        setUser(s.user);
        void loadNearbyPreference(s.user.id);
        void loadDbNeeds();
        void loadBookmarkedIds(s.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const filtered = useMemo(() => {
    return dbNeeds
      .filter((n) => {
        if (cityFilter && n.city !== cityFilter) return false;
        if (filter !== "all" && n.region !== filter) return false;
        if (query && !n.content.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => nearbyRank(b, nearbyLocation) - nearbyRank(a, nearbyLocation));
  }, [filter, query, cityFilter, nearbyLocation]);

  const displayName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    user?.email?.split("@")[0] ||
    t("home.friend");

  const toggleAuto = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    globeRef.current?.setAutoRotate(next);
  };

  const openPosterProfile = (n: NeedItem) => {
    setProfile({
      userId: n.userId,
      name: n.name,
      initial: n.name[0]?.toUpperCase() ?? "?",
      role: `${n.region} · ${n.city}`,
      region: n.city,
      bio: `来自 ${n.city} 的创作者,正在寻找:${n.content}`,
      tags: n.tags,
    });
  };

  const helpWithNeed = async (n: NeedItem) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation(user.id, {
        userId: n.userId,
        username: n.name,
        displayName: n.name,
        needId: n.id,
        matchTag: n.tags[0] || t("messages.matchingTag"),
      });
      toast.success(t("home.chatOpened", { name: n.name }));
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("messages.sendFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />
      <RegionSilhouette region={region} />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] gap-5 px-4 py-5 lg:px-6">
        {/* LEFT SIDEBAR */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card sticky top-5 hidden h-[calc(100vh-2.5rem)] w-60 flex-shrink-0 flex-col rounded-3xl p-5 lg:flex"
        >
          <Link to="/home" className="flex items-center gap-2.5 px-1">
            <FindingMark size={32} />
            <span className="font-display text-xl font-bold tracking-tight">Finding.</span>
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                    item.active
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-2xl border border-border bg-white/[0.02] p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] font-display text-xs font-bold">
                {displayName[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{displayName}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {t("discover.onlineGlobal")}
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* MAIN CONTENT */}
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          {/* TOP BAR with view toggle */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="glass flex items-center rounded-full p-1">
                <button
                  onClick={() => setView("list")}
                  className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                    view === "list"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view === "list" && (
                    <motion.span
                      layoutId="view-pill"
                      className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)]"
                    />
                  )}
                  <span className="relative">{t("discover.viewList")}</span>
                </button>
                <button
                  onClick={() => setView("globe")}
                  className={`relative rounded-full px-4 py-1.5 text-sm transition-colors ${
                    view === "globe"
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {view === "globe" && (
                    <motion.span
                      layoutId="view-pill"
                      className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)]"
                    />
                  )}
                  <span className="relative">{t("discover.viewGlobe")}</span>
                </button>
              </div>
              <span className="hidden text-xs text-muted-foreground md:inline">
                {t("discover.matchesFound", { n: filtered.length })}
              </span>
              {nearbyLocation && (
                <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] text-emerald-200 md:inline">
                  Nearby boosted: {[nearbyLocation.city, nearbyLocation.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </div>

            <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              {t("discover.matchingNow")}{" "}
              <span className="font-display tabular-nums text-foreground">
                {liveCount.toLocaleString()}
              </span>
            </div>
          </motion.div>

          {view === "list" ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
              {/* CENTER LIST */}
              <div className="flex min-w-0 flex-col gap-4">
                {/* Global search — sticky */}
                <div className="sticky top-2 z-20">
                  <SearchDropdown
                    placeholder={t("home.searchPlaceholder")}
                    initialValue={query}
                    onQueryChange={setQuery}
                  />
                </div>

                {/* Filter chips */}
                <div className="flex flex-wrap gap-2">
                  {filters.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`relative rounded-full border px-4 py-1.5 text-xs transition-all ${
                        filter === f.key
                          ? "border-transparent text-primary-foreground"
                          : "border-border bg-white/[0.03] text-muted-foreground hover:border-border-strong hover:text-foreground"
                      }`}
                    >
                      {filter === f.key && (
                        <motion.span
                          layoutId="filter-pill"
                          className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)]"
                        />
                      )}
                      <span className="relative">{f.label}</span>
                    </button>
                  ))}
                </div>

                {cityFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-accent-soft self-start"
                  >
                    <span>{t("discover.cityNeeds", { city: cityFilter })}</span>
                    <button
                      type="button"
                      onClick={() => setCityFilter(null)}
                      className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-foreground hover:bg-white/20"
                    >
                      {t("discover.clearFilter")}
                    </button>
                  </motion.div>
                )}
                <div className="flex flex-col gap-3">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((n, i) => (
                      <motion.article
                        key={n.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35, delay: i * 0.03 }}
                        className="glass-card card-premium hover-lift group rounded-3xl p-5"
                      >
                        <header className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => openPosterProfile(n)}
                            className="relative grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] font-display text-base transition-transform hover:scale-105"
                            aria-label={t("discover.viewProfileOf", { name: n.name })}
                          >
                            {n.emoji}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                              <button
                                type="button"
                                onClick={() => openPosterProfile(n)}
                                className="font-medium hover:text-accent hover:underline underline-offset-2"
                              >
                                {n.name}
                              </button>
                              <span aria-hidden>{n.flag}</span>
                              <span className="text-xs text-muted-foreground">· {n.ago}</span>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground/90">
                              {n.content}
                            </p>
                          </div>
                        </header>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {n.tags.map((t, j) => (
                            <span
                              key={t}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] ${tagClass[tagColors[j % tagColors.length]]}`}
                            >
                              <span className="mr-0.5 opacity-70">#</span>
                              {t}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>👁 {n.views}</span>
                            <span className="flex items-center gap-1">
                              {t("discover.heat")}
                              {Array.from({ length: 5 }).map((_, j) => (
                                <span
                                  key={j}
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    j < n.heat
                                      ? "bg-accent shadow-[0_0_6px_var(--color-accent)]"
                                      : "bg-white/10"
                                  }`}
                                />
                              ))}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleBookmark(n.id)}
                              title={
                                bookmarkedIds.has(n.id) ? t("discover.unsave") : t("discover.save")
                              }
                              className={`rounded-full border px-2.5 py-1.5 text-xs transition-all ${
                                bookmarkedIds.has(n.id)
                                  ? "border-accent/50 bg-accent/15 text-accent"
                                  : "border-border text-muted-foreground hover:border-accent/40 hover:text-accent"
                              }`}
                            >
                              {bookmarkedIds.has(n.id) ? "🔖" : t("discover.saveIcon")}
                            </button>
                            <button
                              onClick={() => void helpWithNeed(n)}
                              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/25 hover:shadow-[var(--shadow-glow)]"
                            >
                              {t("bookmarks.canHelp")} <span aria-hidden>→</span>
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </AnimatePresence>
                  {filtered.length === 0 && (
                    <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
                      {t("discover.noMatchingNeeds")}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL */}
              <aside className="hidden flex-col gap-4 xl:flex">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card overflow-hidden rounded-3xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm">{t("discover.globalHeat")}</h3>
                    <button
                      onClick={() => setView("globe")}
                      className="text-[11px] text-accent hover:underline"
                    >
                      {t("discover.expand")}
                    </button>
                  </div>
                  <div className="mt-2 h-[260px] w-full">
                    {mounted && (
                      <Suspense
                        fallback={
                          <div className="h-full w-full animate-pulse rounded-2xl bg-white/5" />
                        }
                      >
                        <Globe3D cities={displayCities} size={260} interactive />
                      </Suspense>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card rounded-3xl p-4"
                >
                  <h3 className="font-display text-sm">{t("discover.hotRegions")}</h3>
                  <ul className="mt-3 flex flex-col gap-2">
                    {[...displayCities]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 4)
                      .map((c, i) => (
                        <li
                          key={c.name}
                          className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5"
                        >
                          <span
                            className={`grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold ${
                              i < 3
                                ? "bg-[image:var(--gradient-primary)] text-primary-foreground"
                                : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="flex-1 text-sm">{c.name}</span>
                          <span className="font-display tabular-nums text-xs text-muted-foreground">
                            {c.count.toLocaleString()}
                          </span>
                        </li>
                      ))}
                  </ul>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card rounded-3xl p-4 text-center"
                >
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {t("discover.matchingNow")}
                  </div>
                  <div className="mt-1 font-display text-3xl text-gradient tabular-nums">
                    {liveCount.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t("discover.realtimeCountries")}
                  </div>
                </motion.div>
              </aside>
            </div>
          ) : (
            <motion.div
              key="globe-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="glass-card relative h-[calc(100vh-9rem)] overflow-hidden rounded-3xl"
            >
              {/* Globe canvas */}
              <div className="absolute inset-0">
                {mounted && (
                  <Suspense fallback={<div className="h-full w-full animate-pulse bg-white/5" />}>
                    <Globe3D
                      ref={globeRef}
                      cities={displayCities}
                      interactive
                      showArcs
                      size="fill"
                      onCityClick={(c) => setActiveCity(c)}
                      onRegionChange={setRegion}
                    />
                  </Suspense>
                )}
              </div>

              {/* Left overlay stats */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute left-5 top-5 w-64 rounded-2xl border border-border bg-background/60 p-4 backdrop-blur-xl"
              >
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t("discover.globalOnline")}
                </div>
                <div className="mt-1 font-display text-3xl tabular-nums text-gradient">
                  {liveCount.toLocaleString()}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("discover.successRate")}</div>
                    <div className="mt-0.5 flex items-baseline gap-1 font-display text-lg">
                      78.6% <span className="text-[10px] text-emerald-300">↑</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("discover.coveredCountries")}</div>
                    <div className="mt-0.5 font-display text-lg">195</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("discover.activeNeeds")}</div>
                    <div className="mt-0.5 font-display text-lg tabular-nums">142,847</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("discover.languages")}</div>
                    <div className="mt-0.5 font-display text-lg">37</div>
                  </div>
                </div>
                <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  {t("discover.globeHint")}
                </div>
              </motion.div>

              {/* Right overlay top cities */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute right-5 top-5 w-56 rounded-2xl border border-border bg-background/60 p-4 backdrop-blur-xl"
              >
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  🔥 {t("discover.hotCities")}
                </div>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                  {[...displayCities]
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6)
                    .map((c, i) => (
                      <li key={c.name}>
                        <button
                          onClick={() => globeRef.current?.flyToCity(c.name)}
                          className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/5"
                        >
                          <span className="text-accent">{i + 1}.</span>
                          <span aria-hidden>{c.flag}</span>
                          <span className="flex-1 text-left">{c.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {c.count.toLocaleString()}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </motion.div>

              {/* Bottom toolbar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background/70 p-1.5 text-xs backdrop-blur-xl"
              >
                <button
                  onClick={() => setView("list")}
                  className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  {t("discover.viewList")}
                </button>
                <span className="h-5 w-px bg-border" />
                <button
                  onClick={toggleAuto}
                  className={`rounded-full px-3 py-1.5 transition-colors ${
                    autoRotate
                      ? "bg-white/5 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {autoRotate ? t("discover.pauseRotation") : t("discover.autoRotate")}
                </button>
                <button
                  onClick={() => globeRef.current?.reset()}
                  className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  🏠 {t("discover.resetView")}
                </button>
                <button
                  onClick={() => globeRef.current?.flyRandom()}
                  className="rounded-full px-3 py-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  🎲 {t("discover.randomCity")}
                </button>
              </motion.div>

              {/* City popup */}
              <AnimatePresence>
                {activeCity && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", damping: 22, stiffness: 240 }}
                    className="absolute right-5 top-44 w-72 rounded-2xl border border-border-strong bg-background/85 p-5 shadow-[var(--shadow-glow-lg)] backdrop-blur-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-accent">
                          ACTIVE CITY
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 font-display text-2xl">
                          <span aria-hidden>{activeCity.flag}</span>
                          {activeCity.name}
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveCity(null)}
                        className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-4 rounded-xl border border-border bg-white/[0.03] p-3">
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        {t("discover.activeNeeds")}
                      </div>
                      <div className="font-display text-2xl tabular-nums text-gradient">
                        {activeCity.count.toLocaleString()}
                      </div>
                    </div>
                    {activeCity.tags && (
                      <div className="mt-3">
                        <div className="text-[11px] text-muted-foreground">
                          {t("discover.hotTags")}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {activeCity.tags.map((t, j) => (
                            <span
                              key={t}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${tagClass[tagColors[j % tagColors.length]]}`}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setCityFilter(activeCity.name);
                        setFilter("all");
                        setView("list");
                        setActiveCity(null);
                        toast.success(t("discover.cityFiltered", { city: activeCity.name }));
                      }}
                      className="mt-4 w-full rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02]"
                    >
                      {t("discover.viewCityNeeds")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </main>
      </div>
      <ProfilePreviewModal open={profile} onClose={() => setProfile(null)} />
    </div>
  );
}

const REGION_SILHOUETTES: Record<GlobeRegion, string> = {
  // Stylized cityscape skyline silhouettes (per region). Pure paths, currentColor fill.
  asia: "M0 200 L0 150 L20 150 L25 130 L30 150 L55 150 L60 110 L65 95 L70 110 L75 150 L100 150 L105 90 L110 70 L115 90 L120 150 L150 150 L155 120 L160 100 L170 100 L172 80 L175 100 L185 100 L190 130 L195 150 L230 150 L235 105 L245 95 L250 105 L255 150 L290 150 L295 125 L305 115 L315 125 L320 150 L360 150 L365 100 L375 80 L385 100 L390 150 L430 150 L435 120 L445 110 L455 120 L460 150 L500 150 L505 90 L515 70 L525 90 L530 150 L580 150 L585 130 L595 120 L605 130 L610 150 L660 150 L665 110 L675 95 L685 110 L690 150 L760 150 L765 140 L775 130 L785 140 L790 150 L900 150 L900 200 Z",
  europe:
    "M0 200 L0 150 L30 150 L35 130 L45 110 L55 130 L60 150 L100 150 L110 100 L115 80 L120 100 L130 150 L180 150 L185 120 L195 105 L205 120 L210 150 L260 150 L265 95 L275 75 L285 95 L290 150 L340 150 L345 110 L355 95 L365 110 L370 150 L420 150 L425 130 L435 115 L445 130 L450 150 L500 150 L505 90 L515 70 L525 90 L530 150 L580 150 L585 125 L595 110 L605 125 L610 150 L680 150 L685 105 L695 90 L705 105 L710 150 L800 150 L805 135 L815 125 L825 135 L830 150 L900 150 L900 200 Z",
  americas:
    "M0 200 L0 150 L25 150 L30 105 L40 80 L50 105 L55 150 L100 150 L105 70 L115 50 L125 70 L130 150 L170 150 L175 120 L185 110 L195 120 L200 150 L240 150 L245 90 L255 70 L265 90 L270 150 L320 150 L325 60 L335 40 L345 60 L350 150 L390 150 L395 110 L405 95 L415 110 L420 150 L470 150 L475 80 L485 60 L495 80 L500 150 L550 150 L555 100 L565 85 L575 100 L580 150 L640 150 L645 130 L655 120 L665 130 L670 150 L740 150 L745 95 L755 80 L765 95 L770 150 L900 150 L900 200 Z",
  oceania:
    "M0 200 L0 160 L40 160 L50 145 L60 130 L70 145 L80 160 L140 160 L150 130 L160 115 L170 130 L180 160 L260 160 L270 140 L280 125 L290 140 L300 160 L380 160 L390 110 L400 90 L410 110 L420 160 L500 160 L510 135 L520 120 L530 135 L540 160 L640 160 L650 145 L660 130 L670 145 L680 160 L900 160 L900 200 Z",
};

function RegionSilhouette({ region }: { region: GlobeRegion }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[40vh]">
      <AnimatePresence mode="sync">
        <motion.svg
          key={region}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          viewBox="0 0 900 200"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full text-accent"
        >
          <defs>
            <linearGradient id={`silh-${region}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <path d={REGION_SILHOUETTES[region]} fill={`url(#silh-${region})`} />
        </motion.svg>
      </AnimatePresence>
    </div>
  );
}
