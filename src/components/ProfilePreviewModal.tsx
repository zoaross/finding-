import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { openOrCreateConversation } from "@/lib/chat";
import { isSavedUser, setSavedUser } from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import {
  Palette,
  Camera,
  Sparkles,
  Globe,
  Briefcase,
  Code2,
  PenTool,
  LineChart,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";

export type PortfolioItem = {
  title: string;
  desc: string;
  full: string;
  date: string;
  tags: string[];
  icon: LucideIcon;
  img: string;
};

export type ProfilePreviewData = {
  userId?: string | null;
  name: string;
  initial: string;
  gradient?: string;
  role: string;
  region?: string;
  bio: string;
  tags: string[];
  portfolio?: PortfolioItem[];
};

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    title: "品牌视觉设计 · 2024",
    desc: "为初创公司设计完整视觉体系",
    full: "为一家位于首尔的金融科技初创公司从 0 到 1 搭建品牌识别系统,涵盖 logo、配色、字体与产品 UI 规范。上线 3 个月后用户留存提升 32%,获 2024 韩国设计协会优秀奖。",
    date: "2024 · 3 个月",
    tags: ["品牌设计", "VI 系统", "金融科技"],
    icon: Palette,
    img: "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=900",
  },
  {
    title: "跨境内容拍摄 · 2024",
    desc: "中韩双语短视频内容企划",
    full: "为出海中国美妆品牌策划并执行韩国市场短视频内容,15 支视频累计播放 800 万,带动品牌韩国旗舰店首月 GMV 增长 2.3 倍。",
    date: "2024 · 2 个月",
    tags: ["内容企划", "短视频", "跨境营销"],
    icon: Camera,
    img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900",
  },
  {
    title: "产品体验升级 · 2023",
    desc: "将复杂理财流程精简为 3 步",
    full: "重新设计核心产品的开户与配置流程,通过用户旅程梳理与原型测试,把转化率从 41% 提升到 78%,该项目获 UX 设计奖。",
    date: "2023 · 4 个月",
    tags: ["UX 设计", "用户研究", "A/B 测试"],
    icon: Sparkles,
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900",
  },
  {
    title: "全球远程协作 · 2023",
    desc: "服务 4 个跨国团队的技术顾问",
    full: "作为技术顾问参与 4 个跨国团队的产品搭建,擅长用英语 / 中文 / 韩语在不同时区团队间搭桥,推动从 0 到 MVP 的快速落地。",
    date: "2023 · 全年",
    tags: ["远程协作", "跨文化", "技术顾问"],
    icon: Globe,
    img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=900",
  },
];

const FALLBACK_ICONS: LucideIcon[] = [
  Palette,
  Camera,
  Sparkles,
  Globe,
  Briefcase,
  Code2,
  PenTool,
  LineChart,
];

export function buildPortfolio(seedItems?: Partial<PortfolioItem>[]): PortfolioItem[] {
  if (!seedItems || seedItems.length === 0) return DEFAULT_PORTFOLIO;
  return seedItems.map((s, i) => ({
    ...DEFAULT_PORTFOLIO[i % DEFAULT_PORTFOLIO.length],
    ...s,
    icon: s.icon ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length],
  }));
}

type Props = {
  open: ProfilePreviewData | null;
  onClose: () => void;
};

export function ProfilePreviewModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadState() {
      if (!open?.userId) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      try {
        const savedUser = await isSavedUser(user.id, open.userId);
        if (!cancelled) {
          setSaved(savedUser);
        }
      } catch (error) {
        console.warn("[profile-preview] social state failed:", error);
      }
    }
    void loadState();
    return () => {
      cancelled = true;
    };
  }, [open?.userId]);

  const startChat = async (data: ProfilePreviewData) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    if (!currentUser) {
      onClose();
      navigate({ to: "/auth" });
      return;
    }
    try {
      await openOrCreateConversation(currentUser.id, {
        userId: data.userId,
        username: data.name,
        displayName: data.name,
        matchTag: data.role,
      });
      toast.success(`已为你打开与 ${data.name} 的对话`);
      onClose();
      navigate({ to: "/messages" });
    } catch (error) {
      toast.error("无法创建对话", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleSave = async (data: ProfilePreviewData) => {
    if (!data.userId) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    if (!currentUser) {
      onClose();
      navigate({ to: "/auth" });
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      await setSavedUser(currentUser.id, data.userId, next);
      toast.success(next ? t("social.saved") : t("social.unsaved"));
    } catch (error) {
      setSaved(!next);
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const viewFullProfile = (data: ProfilePreviewData) => {
    try {
      localStorage.setItem(
        "finding:viewing-profile",
        JSON.stringify({
          name: data.name,
          region: data.region,
          role: data.role,
        }),
      );
    } catch {
      // Profile handoff is best-effort; route params still carry the username.
    }
    onClose();
    navigate({ to: "/user/$username", params: { username: data.name } });
  };

  const portfolio =
    open?.portfolio && open.portfolio.length > 0 ? open.portfolio : DEFAULT_PORTFOLIO;
  const expanded = expandedIdx != null ? portfolio[expandedIdx] : null;

  return (
    <AnimatePresence onExitComplete={() => setExpandedIdx(null)}>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="glass-card relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-3xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-background/60 text-muted-foreground transition hover:text-foreground active:scale-90"
              aria-label={t("common.close")}
            >
              ✕
            </button>

            <div className="relative max-h-[92vh] overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {expanded ? (
                  <motion.div
                    key="detail"
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 40, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="max-h-[92vh] overflow-y-auto"
                  >
                    <div
                      className="relative h-44 w-full bg-cover bg-center sm:h-56"
                      style={{ backgroundImage: `url(${expanded.img})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                      <button
                        onClick={() => setExpandedIdx(null)}
                        className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur transition hover:bg-background active:scale-95"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        返回
                      </button>
                    </div>

                    <div className="px-6 pb-6 pt-4 md:px-8">
                      <p className="text-xs text-muted-foreground">{expanded.date}</p>
                      <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
                        {expanded.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{expanded.desc}</p>
                      <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                        {expanded.full}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {expanded.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="main"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="max-h-[92vh] overflow-y-auto p-6 md:p-8"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div
                        className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-[var(--shadow-glow)]"
                        style={{
                          backgroundImage:
                            open.gradient ??
                            "linear-gradient(135deg, oklch(0.72 0.2 295), oklch(0.55 0.22 290))",
                        }}
                      >
                        {open.initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-display text-2xl font-extrabold tracking-tight">
                          {open.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {open.role}
                          {open.region ? ` · ${open.region}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {open.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("profile.about")}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{open.bio}</p>
                    </div>

                    {/* Portfolio */}
                    <div className="mt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("profile.portfolio")}
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {portfolio.map((p, i) => {
                          const Icon = p.icon;
                          return (
                            <button
                              key={p.title}
                              type="button"
                              onClick={() => setExpandedIdx(i)}
                              className="group/p flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3.5 text-left transition-all hover:scale-[1.02] hover:border-accent/40 hover:bg-white/[0.05] hover:shadow-[0_0_28px_-8px_oklch(0.72_0.2_295/0.55)] active:scale-[0.99]"
                            >
                              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">{p.title}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                  {p.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom buttons */}
                    <div className="mt-7 grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => startChat(open)}
                        className="group/btn flex items-center justify-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-4 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] active:scale-[0.98]"
                      >
                        {t("common.message")}
                        <span className="transition-transform group-hover/btn:translate-x-0.5">
                          →
                        </span>
                      </button>
                      <button
                        onClick={() => toggleSave(open)}
                        className={`rounded-full border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                          saved
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-[var(--border-strong)] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                        }`}
                      >
                        {saved ? t("social.saved") : t("social.save")}
                      </button>
                    </div>
                    <button
                      onClick={() => viewFullProfile(open)}
                      className="mt-2.5 w-full rounded-full border border-[var(--border)] bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-muted-foreground transition-all hover:border-[var(--border-strong)] hover:bg-white/[0.05] hover:text-foreground active:scale-[0.99]"
                    >
                      {t("common.viewProfile")} →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
