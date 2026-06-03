import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Palette,
  Camera,
  Sparkles,
  Globe,
  Briefcase,
  Code2,
  PenTool,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { ProfilePreviewModal, type ProfilePreviewData } from "@/components/ProfilePreviewModal";
import { openOrCreateConversation } from "@/lib/chat";
import { setSavedUser } from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/matches")({
  component: MatchesPage,
  head: () => ({
    meta: [
      { title: "匹配结果 — Finding." },
      { name: "description", content: "AI 为你智能匹配的全球候选人。" },
    ],
  }),
});

type Match = {
  id: string;
  profileId: string;
  username: string;
  name: string;
  title: string;
  percent: number;
  rating: number;
  score: number;
  initial: string;
  gradient: string;
  tags: string[];
  bio: string;
  portfolio: { title: string; desc: string; full: string; img: string }[];
};

const MATCHES: Match[] = [
  {
    id: "kim",
    profileId: "10000000-0000-0000-0000-000000000004",
    username: "yui_designs",
    name: "金智恩",
    title: "资深产品设计师 · Toss",
    percent: 98,
    rating: 5,
    score: 4.9,
    initial: "金",
    gradient: "linear-gradient(135deg, oklch(0.72 0.2 295), oklch(0.55 0.22 290))",
    tags: ["🇰🇷 首尔", "✦ 跨文化品牌", "✦ 8 年经验"],
    bio: "深耕韩国金融科技产品设计 8 年,主导过 Toss 多个核心模块。擅长跨文化品牌系统搭建,熟悉中韩日三地用户习惯,曾与中国创业团队完成多个出海项目。",
    portfolio: [
      {
        title: "品牌设计项目 · 2024",
        desc: "为首尔初创公司设计完整视觉体系",
        full: "为一家首尔金融科技初创公司从 0 到 1 搭建品牌识别系统,包含 logo、配色、字体、图标、产品 UI 规范,上线后用户留存提升 32%。",
        img: "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=600",
      },
      {
        title: "Toss 储蓄模块重设计 · 2023",
        desc: "将复杂理财流程精简为 3 步",
        full: "重新设计 Toss 储蓄产品的开户与配置流程,用户完成率从 41% 提升到 78%,获韩国 UX 设计奖。",
        img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
      },
      {
        title: "中韩跨境支付 UI · 2022",
        desc: "服务出海中国商户的支付界面",
        full: "为中韩跨境支付服务设计双语界面,适配两国用户阅读习惯与合规要求。",
        img: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600",
      },
    ],
  },
  {
    id: "park",
    profileId: "10000000-0000-0000-0000-000000000002",
    username: "minjun_backend",
    name: "朴敏浩",
    title: "全栈工程师 · Naver",
    percent: 95,
    rating: 5,
    score: 4.8,
    initial: "朴",
    gradient: "linear-gradient(135deg, oklch(0.7 0.18 200), oklch(0.55 0.2 260))",
    tags: ["🇰🇷 釜山", "✦ React / Node", "✦ 远程协作"],
    bio: "Naver 资深全栈工程师,React + Node.js 技术栈 7 年。习惯远程协作,曾在 4 个跨国团队中担任技术负责人,英语流利,可作为中韩团队的桥梁。",
    portfolio: [
      {
        title: "Naver Cloud 控制台 · 2024",
        desc: "百万级用户的云服务前端",
        full: "主导 Naver Cloud 控制台前端架构升级,采用 React + TypeScript,首屏加载从 4.2s 降到 1.1s。",
        img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
      },
      {
        title: "实时协作白板 · 2023",
        desc: "WebRTC + CRDT 多人协作",
        full: "从零构建支持 50 人同时编辑的协作白板,自研 CRDT 算法保证一致性。",
        img: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600",
      },
      {
        title: "韩国电商 SDK · 2022",
        desc: "为中国卖家提供的 Node SDK",
        full: "封装韩国主流电商平台 API,提供统一的 Node.js SDK,被 200+ 中国出海商户使用。",
        img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600",
      },
    ],
  },
  {
    id: "lee",
    profileId: "10000000-0000-0000-0000-000000000001",
    username: "hana_seoul",
    name: "李秀妍",
    title: "品牌策略顾问 · Freelance",
    percent: 92,
    rating: 4,
    score: 4.6,
    initial: "李",
    gradient: "linear-gradient(135deg, oklch(0.75 0.18 340), oklch(0.55 0.22 320))",
    tags: ["🇰🇷 首尔", "✦ Z 世代调研", "✦ 双语沟通"],
    bio: "独立品牌策略顾问,聚焦 Z 世代消费洞察。曾服务 Olive Young、Musinsa 等本土品牌,熟悉中韩两地年轻用户偏好,提供从调研到策略的完整方案。",
    portfolio: [
      {
        title: "Z 世代美妆调研 · 2024",
        desc: "覆盖中韩 2000+ 用户的洞察报告",
        full: "完成中韩 Z 世代美妆消费习惯对比研究,2000+ 受访者,产出 80 页策略报告。",
        img: "https://images.unsplash.com/photo-1522335789203-aaa008cf5fb6?w=600",
      },
      {
        title: "Musinsa 品牌升级 · 2023",
        desc: "韩国头部时尚平台的策略咨询",
        full: "为 Musinsa 制定面向 25-30 岁用户的品牌升级策略,带动该年龄段 GMV 增长 45%。",
        img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600",
      },
      {
        title: "出海品牌名称研究 · 2022",
        desc: "帮助中国品牌取韩文名",
        full: "为 5 个中国新消费品牌做韩文名命名研究,综合发音、含义、文化忌讳。",
        img: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600",
      },
    ],
  },
];

const EXTRA: Match[] = [
  {
    id: "choi",
    profileId: "10000000-0000-0000-0000-000000000004",
    username: "yui_designs",
    name: "崔佑振",
    title: "动效设计师 · Kakao",
    percent: 88,
    rating: 4,
    score: 4.5,
    initial: "崔",
    gradient: "linear-gradient(135deg, oklch(0.72 0.18 80), oklch(0.55 0.2 30))",
    tags: ["🇰🇷 城南", "✦ Lottie / AE", "✦ 6 年经验"],
    bio: "Kakao 动效设计师,擅长品牌动画与产品微交互。",
    portfolio: [
      {
        title: "Kakao Pay 动效系统 · 2024",
        desc: "支付全流程动效规范",
        full: "搭建 Kakao Pay 支付流程的统一动效系统。",
        img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600",
      },
    ],
  },
  {
    id: "yoon",
    profileId: "10000000-0000-0000-0000-000000000001",
    username: "hana_seoul",
    name: "尹智雅",
    title: "内容运营 · 独立创作者",
    percent: 86,
    rating: 4,
    score: 4.4,
    initial: "尹",
    gradient: "linear-gradient(135deg, oklch(0.72 0.18 160), oklch(0.55 0.2 200))",
    tags: ["🇰🇷 首尔", "✦ 小红书 / 抖音", "✦ 中韩双语"],
    bio: "中韩双语内容创作者,小红书 12 万粉丝,擅长帮品牌做本地化内容策略。",
    portfolio: [
      {
        title: "中国品牌韩国种草 · 2024",
        desc: "完整的 KOL 投放策略",
        full: "为多个中国美妆品牌制定韩国市场种草投放方案。",
        img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600",
      },
    ],
  },
  {
    id: "han",
    profileId: "10000000-0000-0000-0000-000000000002",
    username: "minjun_backend",
    name: "韩志勋",
    title: "增长黑客 · Coupang",
    percent: 84,
    rating: 4,
    score: 4.3,
    initial: "韩",
    gradient: "linear-gradient(135deg, oklch(0.7 0.2 20), oklch(0.55 0.22 350))",
    tags: ["🇰🇷 首尔", "✦ 数据驱动", "✦ A/B 测试"],
    bio: "Coupang 增长团队负责人,擅长用数据驱动产品增长。",
    portfolio: [
      {
        title: "新用户激活提升 · 2024",
        desc: "首周留存 +18%",
        full: "通过 30+ 次 A/B 测试将新用户首周留存提升 18%。",
        img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
      },
    ],
  },
];

function MatchesPage() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const startChat = async (match: Match) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation(currentUser.id, {
        userId: match.profileId,
        username: match.username,
        displayName: match.username,
        matchTag: match.title,
      });
      toast.success(`已为你打开与 ${match.name} 的对话`);
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error("无法创建对话", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const toggleSaveMatch = async (match: Match) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    const next = !saved[match.id];
    setSaved((s) => ({ ...s, [match.id]: next }));
    try {
      await setSavedUser(currentUser.id, match.profileId, next);
      toast.success(next ? "已保存" : "已取消保存");
    } catch (error) {
      setSaved((s) => ({ ...s, [match.id]: !next }));
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const list = showExtra ? [...MATCHES, ...EXTRA] : MATCHES;
  const opened = list.find((m) => m.id === openId) || null;

  const PORTFOLIO_ICONS: LucideIcon[] = [
    Palette,
    Camera,
    Sparkles,
    Globe,
    Briefcase,
    Code2,
    PenTool,
    LineChart,
  ];

  const openedPreview: ProfilePreviewData | null = useMemo(() => {
    if (!opened) return null;
    return {
      userId: opened.profileId,
      name: opened.name,
      initial: opened.initial,
      gradient: opened.gradient,
      role: opened.title,
      bio: opened.bio,
      tags: opened.tags,
      portfolio: opened.portfolio.map((p, i) => ({
        title: p.title,
        desc: p.desc,
        full: p.full,
        date: p.title.split("·")[1]?.trim() ?? "近期",
        tags: opened.tags.slice(0, 3),
        icon: PORTFOLIO_ICONS[i % PORTFOLIO_ICONS.length],
        img: p.img,
      })),
    };
  }, [opened]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8 md:py-12">
        {/* Header */}
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
            为你找到最适合的 <span className="text-gradient">3</span> 项匹配结果
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">根据你的需求智能匹配</p>
        </motion.div>

        <ul className="grid gap-5">
          {list.map((m, i) => {
            const isBest = i === 0;
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`glass-card card-premium group relative overflow-hidden rounded-3xl p-5 md:p-6 ${
                  isBest
                    ? "border-amber-300/40 shadow-[0_0_60px_-10px_oklch(0.72_0.2_295/0.55)]"
                    : ""
                }`}
              >
                {isBest && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300/0 via-amber-300 to-amber-300/0" />
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-black shadow-[0_0_24px_-4px_oklch(0.85_0.15_85/0.7)]">
                      最佳匹配 ✦
                    </span>
                  </>
                )}
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[image:var(--gradient-primary)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25" />

                <div className="flex items-start gap-4">
                  <div
                    className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white shadow-[var(--shadow-glow)]"
                    style={{ backgroundImage: m.gradient }}
                  >
                    {m.initial}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-xl font-bold tracking-tight">{m.name}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-0.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                        {m.percent}% 匹配
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{m.title}</p>

                    <div className="mt-1.5 flex items-center gap-2 text-amber-400">
                      <span className="flex">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx} className={idx < m.rating ? "" : "opacity-25"}>
                            ★
                          </span>
                        ))}
                      </span>
                      <span className="text-xs font-semibold text-amber-300/90">
                        {m.score.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.tags.map((t) => (
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

                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenId(m.id)}
                    className="rounded-full border border-[var(--border-strong)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06] active:scale-[0.98]"
                  >
                    查看作品卡
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleSaveMatch(m)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
                      saved[m.id]
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-[var(--border-strong)] bg-white/[0.03] text-foreground hover:bg-white/[0.06]"
                    }`}
                  >
                    {saved[m.id] ? "已保存" : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void startChat(m)}
                    className="group/btn flex items-center justify-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] active:scale-[0.98]"
                  >
                    发起聊天
                    <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card mt-10 rounded-3xl p-6 text-center"
        >
          <h3 className="font-display text-lg font-bold">对结果不满意?</h3>
          <p className="mt-1 text-sm text-muted-foreground">AI 正在持续搜索,也可以手动扩大范围</p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              onClick={() => {
                if (showExtra) {
                  toast.info("已加载全部候选人");
                } else {
                  setShowExtra(true);
                  toast.success("已加载更多候选人");
                }
              }}
              className="rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] active:scale-[0.98]"
            >
              查看更多人选 →
            </button>
            <button
              onClick={() => navigate({ to: "/home" })}
              className="rounded-full border border-[var(--border-strong)] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/[0.06] active:scale-[0.98]"
            >
              重新描述需求
            </button>
          </div>
        </motion.div>
      </div>

      {/* Profile preview modal (shared) */}
      <ProfilePreviewModal open={openedPreview} onClose={() => setOpenId(null)} />
    </div>
  );
}
