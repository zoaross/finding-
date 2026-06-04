import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { openOrCreateConversation } from "@/lib/chat";
import {
  isSavedUser,
  reportProfile,
  setSavedCard,
  setSavedPortfolioItem,
  setSavedUser,
} from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";
import { getRealMatchesForUser } from "@/lib/realMatches";
import { useProfile, saveProfile } from "@/hooks/useProfile";
import {
  deleteInformationCard,
  loadInformationCards,
  saveInformationCard,
  uploadCardMedia,
} from "@/lib/informationCards";
import {
  deletePortfolioItem,
  loadPortfolioItems,
  reorderPortfolioItems,
  savePortfolioItem,
  uploadPortfolioMedia,
  type PortfolioItem,
} from "@/lib/portfolio";
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
  IconX,
  IconGithub,
  IconLinkedin,
  IconDiscord,
  IconPencil,
} from "@/components/icons/FindingIcons";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "个人主页 — Finding." },
      { name: "description", content: "你的 Finding 个人主页 — 身份卡、作品集与评价。" },
    ],
  }),
});

const buildNavItems = (isOwner: boolean) => [
  { key: "nav.home", icon: IconTarget, to: "/home" as const, active: false },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const, active: false },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const, active: false },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const, active: false },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const, active: false },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const, active: isOwner },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const, active: false },
];

type IdentityCardView = {
  id?: string;
  emoji: string;
  title: string;
  desc: string;
  tags: string[];
  glow: string;
  longDetails?: string | null;
  supplySkills?: string[];
  supplyLanguages?: string[];
  supplyCountry?: string | null;
  supplyCity?: string | null;
  offerSummary?: string | null;
  connectionPreferences?: string | null;
  education?: string | null;
  projects?: string | null;
  workExperience?: string | null;
  placesLived?: string[];
  proofLinks?: string[];
  proofNote?: string | null;
  mediaUrls?: string[];
  voiceIntroUrl?: string | null;
};

function parseOptionalList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinOptionalList(value?: string[] | null): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

const reviews = [
  {
    name: "Aiko 田中",
    region: "🇯🇵 东京",
    rating: 5,
    time: "3 天前",
    text: "沟通顺畅,作品风格非常契合我心目中的暗黑奇幻设定。交付前还主动多次校对细节,完成度超出预期 ✨",
  },
  {
    name: "Marco Silva",
    region: "🇧🇷 圣保罗",
    rating: 5,
    time: "上周",
    text: "Highly professional. Delivered ahead of schedule and the artwork captures exactly the mood we needed. Will collaborate again!",
  },
];

const skills = [
  { name: "Figma", value: 95 },
  { name: "Illustrator", value: 88 },
  { name: "Webflow", value: 72 },
];

/* Hook: count up animation */
function useCountUp(target: number, duration = 1200, decimals = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
}

/* Animated banner with floating particles */
function HeroBanner() {
  const particles = Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    s: 1 + Math.random() * 2.5,
    d: 6 + Math.random() * 8,
    delay: Math.random() * 5,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 animate-[gradient-shift_18s_ease_infinite]"
        style={{
          background:
            "linear-gradient(120deg, oklch(0.28 0.16 295) 0%, oklch(0.18 0.14 270) 35%, oklch(0.22 0.12 245) 70%, oklch(0.32 0.18 305) 100%)",
          backgroundSize: "240% 240%",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(0.65_0.22_295/0.45),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,oklch(0.55_0.2_245/0.35),transparent_55%)]" />
      {/* particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-white/70"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.s,
            height: p.s,
            filter: "blur(0.5px)",
          }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: p.d, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0/0.4) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0/0.4) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

/* Stat with count-up */
function StatBlock({
  label,
  value,
  decimals = 0,
  suffix = "",
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
}) {
  const display = useCountUp(value, 1400, decimals);
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
        {display}
        {suffix}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

/* Identity card with 3D tilt */
function IdentityCard({
  card,
  index,
  onDelete,
  onEdit,
  onSave,
  onOpen,
  saved,
}: {
  card: IdentityCardView;
  index: number;
  onDelete?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onOpen?: () => void;
  saved?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 10, y: px * 10 });
  };
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={onOpen}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: "transform 0.2s ease-out",
      }}
      className={`group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5 hover:border-[var(--border-strong)] ${
        onOpen ? "cursor-pointer" : ""
      }`}
    >
      <div
        className={`absolute -inset-12 -z-0 bg-gradient-to-br ${card.glow} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
      />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-background/60 text-2xl shadow-[var(--shadow-glow)]">
            {card.emoji}
          </div>
          {(onEdit || onDelete || onSave) && (
            <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onSave && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSave();
                  }}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] ${
                    saved
                      ? "border-primary/40 text-primary"
                      : "border-[var(--border)] text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground"
                  }`}
                  title={saved ? "Saved" : "Save"}
                >
                  {saved ? "✓" : "☆"}
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-lg border border-[var(--border)] px-1.5 py-1 text-[10px] text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground"
                  title="编辑"
                >
                  ✏
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="rounded-lg border border-[var(--border)] px-1.5 py-1 text-[10px] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                  title="删除"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
        <h4 className="font-display text-lg font-bold">{card.title}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{card.desc}</p>
        {(card.offerSummary ||
          card.supplySkills?.length ||
          card.supplyLanguages?.length ||
          card.supplyCountry ||
          card.supplyCity) && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-white/[0.025] p-3">
            {card.offerSummary && (
              <p className="text-xs leading-relaxed text-foreground">{card.offerSummary}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...(card.supplySkills ?? []), ...(card.supplyLanguages ?? [])]
                .slice(0, 5)
                .map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 text-[10px] text-accent-soft"
                  >
                    {t}
                  </span>
                ))}
              {[card.supplyCity, card.supplyCountry].filter(Boolean).join(", ") && (
                <span className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground">
                  {[card.supplyCity, card.supplyCountry].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        )}
        {(card.education ||
          card.projects ||
          card.workExperience ||
          card.placesLived?.length ||
          card.proofLinks?.length ||
          card.proofNote) && (
          <details className="mt-3 rounded-xl border border-[var(--border)] bg-white/[0.02] p-3 text-xs">
            <summary className="cursor-pointer text-muted-foreground">Experience & proof</summary>
            <div className="mt-2 space-y-2 text-muted-foreground">
              {card.education && <p>Education: {card.education}</p>}
              {card.projects && <p>Projects: {card.projects}</p>}
              {card.workExperience && <p>Work: {card.workExperience}</p>}
              {card.placesLived?.length ? <p>Places lived: {card.placesLived.join(", ")}</p> : null}
              {card.proofNote && <p>Proof: {card.proofNote}</p>}
              {card.proofLinks?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {card.proofLinks.slice(0, 3).map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-[var(--border)] px-2 py-0.5 text-accent-soft hover:text-accent"
                    >
                      Link
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        )}
        {card.mediaUrls?.[0] && (
          <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-black/20">
            {/\.(mp4|mov|webm)(\?|$)/i.test(card.mediaUrls[0]) ? (
              <video
                src={card.mediaUrls[0]}
                className="h-24 w-full object-cover"
                muted
                playsInline
              />
            ) : (
              <img src={card.mediaUrls[0]} alt={card.title} className="h-24 w-full object-cover" />
            )}
          </div>
        )}
        {card.voiceIntroUrl && (
          <audio src={card.voiceIntroUrl} controls className="mt-3 h-8 w-full" />
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2 py-0.5 text-[10px] text-accent-soft"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* Skill bar with scroll-triggered fill */
function SkillBar({ name, value }: { name: string; value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20%" });
  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground">{name}</span>
        <span className="font-mono text-accent-soft">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: inView ? `${value}%` : 0 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="h-full rounded-full bg-[image:var(--gradient-primary)] shadow-[0_0_12px_oklch(0.72_0.18_295/0.7)]"
        />
      </div>
    </div>
  );
}

// Imported type — extended with real profile fields from user.$username.tsx
import type { ViewingPartner } from "./user.$username";

function ProfilePage() {
  return <ProfilePageInner isOwner={true} />;
}

export function ProfilePageInner({
  isOwner,
  viewingOverride,
}: {
  isOwner: boolean;
  viewingOverride?: ViewingPartner;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"identity" | "portfolio" | "reviews">("identity");
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [newCardEmoji, setNewCardEmoji] = useState("✨");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardDetails, setNewCardDetails] = useState("");
  const [newCardSkills, setNewCardSkills] = useState("");
  const [newCardLanguages, setNewCardLanguages] = useState("");
  const [newCardCountry, setNewCardCountry] = useState("");
  const [newCardCity, setNewCardCity] = useState("");
  const [newCardOffer, setNewCardOffer] = useState("");
  const [newCardConnectWith, setNewCardConnectWith] = useState("");
  const [newCardEducation, setNewCardEducation] = useState("");
  const [newCardProjects, setNewCardProjects] = useState("");
  const [newCardWork, setNewCardWork] = useState("");
  const [newCardPlaces, setNewCardPlaces] = useState("");
  const [newCardProofLinks, setNewCardProofLinks] = useState("");
  const [newCardProofNote, setNewCardProofNote] = useState("");
  const [newCardMediaFiles, setNewCardMediaFiles] = useState<File[]>([]);
  const [newCardMediaPreviews, setNewCardMediaPreviews] = useState<string[]>([]);
  const [newCardVoiceFile, setNewCardVoiceFile] = useState<File | null>(null);
  const [newCardVoicePreview, setNewCardVoicePreview] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [showPortfolioEditor, setShowPortfolioEditor] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");
  const [portfolioYear, setPortfolioYear] = useState("");
  const [portfolioRole, setPortfolioRole] = useState("");
  const [portfolioBackground, setPortfolioBackground] = useState("");
  const [portfolioContribution, setPortfolioContribution] = useState("");
  const [portfolioOutcome, setPortfolioOutcome] = useState("");
  const [portfolioTools, setPortfolioTools] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [portfolioPreview, setPortfolioPreview] = useState<string | null>(null);
  const [portfolioMediaType, setPortfolioMediaType] = useState<"image" | "video">("image");
  const [portfolioSaving, setPortfolioSaving] = useState(false);
  const [viewing, setViewing] = useState<ViewingPartner>(viewingOverride ?? null);
  const [savedViewing, setSavedViewing] = useState(false);
  const [savedCards, setSavedCards] = useState<Record<string, boolean>>({});
  const [savedPortfolioItems, setSavedPortfolioItems] = useState<Record<string, boolean>>({});
  const navItems = buildNavItems(isOwner);
  const cardSupplyFallback = t("profile.cardSupplyFallback");
  const startViewingChat = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!viewing?.name) return;
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: viewing.userId,
        partnerUsername: viewing.name,
        partnerName: viewing.name,
        matchTag: viewing.role,
      });
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("messages.sendFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleViewingSave = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!viewing?.userId) return;
    const next = !savedViewing;
    setSavedViewing(next);
    try {
      await setSavedUser(user.id, viewing.userId, next);
      toast.success(next ? t("social.saved") : t("social.unsaved"));
    } catch (error) {
      setSavedViewing(!next);
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const reportViewingUser = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!viewing?.userId) return;
    try {
      await reportProfile(user.id, viewing.userId, "profile_report");
      toast.success(t("messages.reportSubmitted"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleCardSave = async (card: IdentityCardView) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!card.id) return;
    const next = !savedCards[card.id];
    setSavedCards((s) => ({ ...s, [card.id as string]: next }));
    try {
      await setSavedCard(user.id, card.id, next);
      toast.success(next ? t("social.saved") : t("social.unsaved"));
    } catch (error) {
      setSavedCards((s) => ({ ...s, [card.id as string]: !next }));
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const togglePortfolioSave = async (item: PortfolioItem) => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const next = !savedPortfolioItems[item.id];
    setSavedPortfolioItems((current) => ({ ...current, [item.id]: next }));
    try {
      await setSavedPortfolioItem(user.id, item.id, next);
      toast.success(next ? t("social.saved") : t("social.unsaved"));
    } catch (error) {
      setSavedPortfolioItems((current) => ({ ...current, [item.id]: !next }));
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Real stats from DB (owner)
  const [realMatchCount, setRealMatchCount] = useState<number | null>(null);
  const [realRepScore, setRealRepScore] = useState<number | null>(null);
  const [realIdentCards, setRealIdentCards] = useState<IdentityCardView[]>([]);
  const [realReviews, setRealReviews] = useState<typeof reviews>([]);
  const [latestNeed, setLatestNeed] = useState<{ content: string; tags: string[] } | null>(null);

  // Identity cards for viewed user (non-owner)
  const CARD_GLOWS = [
    "from-fuchsia-500/30 to-purple-500/10",
    "from-sky-500/30 to-indigo-500/10",
    "from-amber-500/30 to-rose-500/10",
    "from-emerald-500/30 to-teal-500/10",
  ] as const;
  const viewingCards: IdentityCardView[] =
    !isOwner && viewing?.skills?.length
      ? viewing.skills.map((s, i) => ({
          emoji: "⭐",
          title: s,
          desc: cardSupplyFallback,
          tags: [s],
          glow: CARD_GLOWS[i % CARD_GLOWS.length],
        }))
      : [];

  const loadStats = async (uid: string) => {
    const relT = (iso: string) => {
      const s = (Date.now() - new Date(iso).getTime()) / 1000;
      if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
      if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
      if (s < 86400 * 30) return `${Math.floor(s / 86400 / 7)} 周前`;
      return `${Math.floor(s / 86400 / 30)} 个月前`;
    };
    try {
      const realMatches = await getRealMatchesForUser(uid);
      setRealMatchCount(realMatches.realMatchCount);
    } catch (matchError) {
      console.warn("[profile] real match count failed:", matchError);
      setRealMatchCount(0);
    }

    const { data: pRow } = await (supabase as any)
      .from("profiles")
      .select("reputation_score, skills")
      .eq("id", uid)
      .maybeSingle();
    if (pRow) {
      setRealRepScore((pRow as any).reputation_score ?? 5.0);
      const skills = Array.isArray((pRow as any).skills) ? ((pRow as any).skills as string[]) : [];
      void skills;
    }

    try {
      const cards = await loadInformationCards(uid);
      if (cards.length) {
        setRealIdentCards(
          cards.map((card, i) => ({
            id: card.id,
            emoji: "⭐",
            title: card.title,
            desc: card.summary || card.details || cardSupplyFallback,
            longDetails: card.details,
            tags: card.tags.length ? card.tags : [card.category],
            glow: CARD_GLOWS[i % CARD_GLOWS.length],
            supplySkills: card.supply_skills,
            supplyLanguages: card.supply_languages,
            supplyCountry: card.supply_country,
            supplyCity: card.supply_city,
            offerSummary: card.offer_summary,
            connectionPreferences: card.connection_preferences,
            education: card.education,
            projects: card.projects,
            workExperience: card.work_experience,
            placesLived: card.places_lived,
            proofLinks: card.proof_links,
            proofNote: card.proof_note,
            mediaUrls: card.media_urls,
            voiceIntroUrl: card.voice_intro_url,
          })),
        );
      } else {
        setRealIdentCards([]);
      }
    } catch (error) {
      console.warn("[profile] information_cards unavailable:", error);
      if (pRow) {
        const skills = Array.isArray((pRow as any).skills)
          ? ((pRow as any).skills as string[])
          : [];
        const glows = [
          "from-fuchsia-500/30 to-purple-500/10",
          "from-sky-500/30 to-indigo-500/10",
          "from-amber-500/30 to-rose-500/10",
        ];
        setRealIdentCards(
          skills.slice(0, 4).map((s, i) => ({
            emoji: "⭐",
            title: s,
            desc: cardSupplyFallback,
            tags: [s],
            glow: glows[i % 3],
          })),
        );
      }
    }

    try {
      setPortfolioItems(await loadPortfolioItems(uid));
    } catch (error) {
      console.warn("[profile] portfolio_items unavailable:", error);
      setPortfolioItems([]);
    }

    try {
      const { data: needRow } = await (supabase as any)
        .from("needs")
        .select("content, parsed_intent")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (needRow?.content) {
        setLatestNeed({
          content: needRow.content as string,
          tags: Array.isArray(needRow.parsed_intent?.tags)
            ? (needRow.parsed_intent.tags as string[]).slice(0, 4)
            : [],
        });
      } else {
        setLatestNeed(null);
      }
    } catch (error) {
      console.warn("[profile] latest need unavailable:", error);
      setLatestNeed(null);
    }

    const { data: ratingRows } = await (supabase as any)
      .from("conversation_ratings")
      .select("rating, feedback, partner_name, match_tag, created_at")
      .eq("rater_id", uid)
      .order("created_at", { ascending: false })
      .limit(5);
    if (ratingRows?.length) {
      setRealReviews(
        (ratingRows as any[]).map((r: any) => ({
          name: (r.partner_name as string) ?? "合作伙伴",
          region: "🌏 全球",
          rating: r.rating as number,
          time: relT(r.created_at as string),
          text: (r.feedback as string) ?? `${r.match_tag ?? "本次合作"} · ${r.rating} 星`,
        })),
      );
    }
  };

  // Pick up "view another user" handoff from messages page (only for non-owner mode)
  useEffect(() => {
    if (isOwner) return;
    if (viewingOverride) {
      setViewing(viewingOverride);
      return;
    }
    try {
      const raw = localStorage.getItem("finding:viewing-profile");
      if (raw) setViewing(JSON.parse(raw) as ViewingPartner);
    } catch {
      // Public profile fallback is best-effort.
    }
  }, [isOwner, viewingOverride]);

  const goHome = () => {
    try {
      localStorage.removeItem("finding:viewing-profile");
    } catch {
      // Ignore storage failures; navigation still works.
    }
    navigate({ to: "/profile" });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(data.session.user);
      if (isOwner) void loadStats(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      else {
        setUser(session.user);
        if (isOwner) void loadStats(session.user.id);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, isOwner]);

  useEffect(() => {
    if (!user || isOwner || !viewing?.userId) return;
    let cancelled = false;
    void isSavedUser(user.id, viewing.userId)
      .then((saved) => {
        if (cancelled) return;
        setSavedViewing(saved);
      })
      .catch((error) => console.warn("[profile] social state failed:", error.message));
    return () => {
      cancelled = true;
    };
  }, [isOwner, user, viewing?.userId]);

  useEffect(() => {
    if (isOwner || !viewing?.userId) return;
    void loadStats(viewing.userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, viewing?.userId]);

  useEffect(() => {
    if (!user || isOwner || realIdentCards.length === 0) return;
    const ids = realIdentCards.map((card) => card.id).filter(Boolean) as string[];
    if (!ids.length) return;
    let cancelled = false;
    void (supabase as any)
      .from("saved_cards")
      .select("card_id")
      .eq("user_id", user.id)
      .in("card_id", ids)
      .then(({ data }: any) => {
        if (cancelled) return;
        setSavedCards(
          Object.fromEntries(((data as any[]) ?? []).map((row: any) => [row.card_id, true])),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, realIdentCards, user]);

  useEffect(() => {
    if (!user || isOwner || portfolioItems.length === 0) return;
    const ids = portfolioItems.map((item) => item.id);
    let cancelled = false;
    void (supabase as any)
      .from("saved_portfolio_items")
      .select("portfolio_item_id")
      .eq("user_id", user.id)
      .in("portfolio_item_id", ids)
      .then(({ data }: any) => {
        if (cancelled) return;
        setSavedPortfolioItems(
          Object.fromEntries(
            ((data as any[]) ?? []).map((row: any) => [row.portfolio_item_id, true]),
          ),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isOwner, portfolioItems, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  // ── Identity card CRUD ─────────────────────────────────────────────────
  type SaveFn = (
    u: NonNullable<typeof user>,
    p: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const saveFn = saveProfile as unknown as SaveFn;

  const openAddCard = () => {
    setEditingCardIndex(null);
    setNewCardEmoji("✨");
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardDetails("");
    setNewCardSkills("");
    setNewCardLanguages("");
    setNewCardCountry("");
    setNewCardCity("");
    setNewCardOffer("");
    setNewCardConnectWith("");
    setNewCardEducation("");
    setNewCardProjects("");
    setNewCardWork("");
    setNewCardPlaces("");
    setNewCardProofLinks("");
    setNewCardProofNote("");
    setNewCardMediaFiles([]);
    setNewCardMediaPreviews([]);
    setNewCardVoiceFile(null);
    setNewCardVoicePreview(null);
    setShowAddCard(true);
  };

  const openEditCard = (index: number) => {
    const c = realIdentCards[index];
    setEditingCardIndex(index);
    setNewCardEmoji(c.emoji);
    setNewCardTitle(c.title);
    setNewCardDesc(c.desc === cardSupplyFallback ? "" : c.desc);
    setNewCardDetails(c.longDetails ?? "");
    setNewCardSkills(joinOptionalList(c.supplySkills));
    setNewCardLanguages(joinOptionalList(c.supplyLanguages));
    setNewCardCountry(c.supplyCountry ?? "");
    setNewCardCity(c.supplyCity ?? "");
    setNewCardOffer(c.offerSummary ?? "");
    setNewCardConnectWith(c.connectionPreferences ?? "");
    setNewCardEducation(c.education ?? "");
    setNewCardProjects(c.projects ?? "");
    setNewCardWork(c.workExperience ?? "");
    setNewCardPlaces(joinOptionalList(c.placesLived));
    setNewCardProofLinks((c.proofLinks ?? []).join("\n"));
    setNewCardProofNote(c.proofNote ?? "");
    setNewCardMediaFiles([]);
    setNewCardMediaPreviews(c.mediaUrls ?? []);
    setNewCardVoiceFile(null);
    setNewCardVoicePreview(c.voiceIntroUrl ?? null);
    setShowAddCard(true);
  };

  const handleCardMediaPick = (files: FileList | null) => {
    const picked = Array.from(files ?? []).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );
    if (!picked.length) return;
    setNewCardMediaFiles((current) => [...current, ...picked].slice(0, 4));
    setNewCardMediaPreviews((current) =>
      [...current, ...picked.map((file) => URL.createObjectURL(file))].slice(0, 4),
    );
    toast.success("媒体已添加,保存后会上传");
  };

  const removeCardMediaPreview = (index: number) => {
    setNewCardMediaPreviews((current) => current.filter((_, i) => i !== index));
    setNewCardMediaFiles((current) => current.filter((_, i) => i !== index));
  };

  const handleCardVoicePick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      toast.error(t("card.voiceInvalid"));
      return;
    }
    setNewCardVoiceFile(file);
    setNewCardVoicePreview(URL.createObjectURL(file));
    toast.success(t("card.voiceAdded"));
  };

  const handleSaveCard = async () => {
    if (!newCardTitle.trim()) {
      toast.error("请填写身份名称");
      return;
    }
    if (!user) {
      toast.error("请先登录");
      return;
    }

    const editingCard = editingCardIndex !== null ? realIdentCards[editingCardIndex] : null;
    let mediaUrls = editingCard?.mediaUrls ?? [];
    let voiceIntroUrl = editingCard?.voiceIntroUrl ?? null;
    try {
      if (newCardMediaFiles.length) {
        mediaUrls = [
          ...mediaUrls,
          ...(await Promise.all(newCardMediaFiles.map((file) => uploadCardMedia(user, file)))),
        ].slice(0, 4);
      }
      if (newCardVoiceFile) {
        voiceIntroUrl = await uploadCardMedia(user, newCardVoiceFile);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      toast.error("媒体上传失败", { description: message });
      return;
    }

    let savedId = editingCard?.id;
    const supplySkills = parseOptionalList(newCardSkills || newCardTitle);
    const supplyLanguages = parseOptionalList(newCardLanguages);
    const placesLived = parseOptionalList(newCardPlaces);
    const proofLinks = parseOptionalList(newCardProofLinks);
    const tags = Array.from(new Set([newCardTitle.trim(), ...supplySkills].filter(Boolean)));
    try {
      const saved = await saveInformationCard(
        user,
        {
          title: newCardTitle.trim(),
          category: "Skill",
          summary: newCardDesc.trim() || cardSupplyFallback,
          details: newCardDetails.trim() || null,
          tags,
          supply_skills: supplySkills,
          supply_languages: supplyLanguages,
          supply_country: newCardCountry.trim() || null,
          supply_city: newCardCity.trim() || null,
          offer_summary: newCardOffer.trim() || null,
          connection_preferences: newCardConnectWith.trim() || null,
          education: newCardEducation.trim() || null,
          projects: newCardProjects.trim() || null,
          work_experience: newCardWork.trim() || null,
          places_lived: placesLived,
          proof_links: proofLinks,
          proof_note: newCardProofNote.trim() || null,
          media_urls: mediaUrls,
          voice_intro_url: voiceIntroUrl,
          visibility: "public",
        },
        savedId,
      );
      savedId = saved.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      toast.error("身份卡保存失败", { description: message });
      return;
    }

    let newCards: IdentityCardView[];
    if (editingCardIndex !== null) {
      newCards = realIdentCards.map((c, i) =>
        i === editingCardIndex
          ? {
              ...c,
              id: savedId,
              emoji: newCardEmoji,
              title: newCardTitle.trim(),
              desc: newCardDesc.trim() || cardSupplyFallback,
              longDetails: newCardDetails.trim() || null,
              tags,
              supplySkills,
              supplyLanguages,
              supplyCountry: newCardCountry.trim() || null,
              supplyCity: newCardCity.trim() || null,
              offerSummary: newCardOffer.trim() || null,
              connectionPreferences: newCardConnectWith.trim() || null,
              education: newCardEducation.trim() || null,
              projects: newCardProjects.trim() || null,
              workExperience: newCardWork.trim() || null,
              placesLived,
              proofLinks,
              proofNote: newCardProofNote.trim() || null,
              mediaUrls,
              voiceIntroUrl,
            }
          : c,
      );
    } else {
      newCards = [
        ...realIdentCards,
        {
          id: savedId,
          emoji: newCardEmoji,
          title: newCardTitle.trim(),
          desc: newCardDesc.trim() || cardSupplyFallback,
          longDetails: newCardDetails.trim() || null,
          tags,
          glow: CARD_GLOWS[realIdentCards.length % CARD_GLOWS.length],
          supplySkills,
          supplyLanguages,
          supplyCountry: newCardCountry.trim() || null,
          supplyCity: newCardCity.trim() || null,
          offerSummary: newCardOffer.trim() || null,
          connectionPreferences: newCardConnectWith.trim() || null,
          education: newCardEducation.trim() || null,
          projects: newCardProjects.trim() || null,
          workExperience: newCardWork.trim() || null,
          placesLived,
          proofLinks,
          proofNote: newCardProofNote.trim() || null,
          mediaUrls,
          voiceIntroUrl,
        },
      ];
    }

    const { error } = await saveFn(user, { skills: newCards.map((c) => c.title) });
    if (error) console.warn("[profile] skills mirror save failed:", error.message);

    setRealIdentCards(newCards);
    toast.success(
      editingCardIndex !== null
        ? "身份卡已更新"
        : `身份卡已创建 · ${newCardEmoji} ${newCardTitle.trim()}`,
    );
    setShowAddCard(false);
    setEditingCardIndex(null);
    setNewCardTitle("");
    setNewCardDesc("");
    setNewCardDetails("");
    setNewCardEmoji("✨");
    setNewCardSkills("");
    setNewCardLanguages("");
    setNewCardCountry("");
    setNewCardCity("");
    setNewCardOffer("");
    setNewCardConnectWith("");
    setNewCardEducation("");
    setNewCardProjects("");
    setNewCardWork("");
    setNewCardPlaces("");
    setNewCardProofLinks("");
    setNewCardProofNote("");
    setNewCardMediaFiles([]);
    setNewCardMediaPreviews([]);
    setNewCardVoiceFile(null);
    setNewCardVoicePreview(null);
  };

  const handleDeleteCard = async (index: number) => {
    if (!user) return;
    const target = realIdentCards[index];
    if (target?.id) {
      try {
        await deleteInformationCard(user, target.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除失败";
        toast.error("删除失败", { description: message });
        return;
      }
    }
    const newCards = realIdentCards.filter((_, i) => i !== index);
    const { error } = await saveFn(user, { skills: newCards.map((c) => c.title) });
    if (error) console.warn("[profile] skills mirror delete failed:", error.message);
    setRealIdentCards(newCards);
    toast.success("身份卡已删除");
  };

  const openPortfolioCreate = () => {
    setEditingPortfolioId(null);
    setPortfolioTitle("");
    setPortfolioDesc("");
    setPortfolioYear("");
    setPortfolioRole("");
    setPortfolioBackground("");
    setPortfolioContribution("");
    setPortfolioOutcome("");
    setPortfolioTools("");
    setPortfolioLinks("");
    setPortfolioFile(null);
    setPortfolioPreview(null);
    setPortfolioMediaType("image");
    setShowPortfolioEditor(true);
  };

  const openPortfolioEdit = (item: PortfolioItem) => {
    setEditingPortfolioId(item.id);
    setPortfolioTitle(item.title);
    setPortfolioDesc(item.description ?? "");
    setPortfolioYear(item.year ?? "");
    setPortfolioRole(item.role ?? "");
    setPortfolioBackground(item.project_background ?? "");
    setPortfolioContribution(item.contribution ?? "");
    setPortfolioOutcome(item.outcome ?? "");
    setPortfolioTools(item.tools.join(", "));
    setPortfolioLinks(item.external_links.join("\n"));
    setPortfolioFile(null);
    setPortfolioPreview(item.media_url);
    setPortfolioMediaType(item.media_type);
    setShowPortfolioEditor(true);
  };

  const handlePortfolioFilePick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error(t("portfolio.invalidMedia"));
      return;
    }
    setPortfolioFile(file);
    setPortfolioPreview(URL.createObjectURL(file));
    setPortfolioMediaType(file.type.startsWith("video/") ? "video" : "image");
  };

  const handleSavePortfolio = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!portfolioTitle.trim()) {
      toast.error(t("portfolio.titleRequired"));
      return;
    }
    const editingItem = portfolioItems.find((item) => item.id === editingPortfolioId) ?? null;
    if (!portfolioFile && !editingItem?.media_url) {
      toast.error(t("portfolio.mediaRequired"));
      return;
    }
    setPortfolioSaving(true);
    try {
      const mediaUrl = portfolioFile
        ? await uploadPortfolioMedia(user, portfolioFile)
        : (editingItem?.media_url as string);
      const saved = await savePortfolioItem(
        user,
        {
          title: portfolioTitle.trim(),
          description: portfolioDesc.trim() || null,
          year: portfolioYear.trim() || null,
          role: portfolioRole.trim() || null,
          project_background: portfolioBackground.trim() || null,
          contribution: portfolioContribution.trim() || null,
          outcome: portfolioOutcome.trim() || null,
          tools: portfolioTools
            .split(",")
            .map((tool) => tool.trim())
            .filter(Boolean),
          external_links: portfolioLinks
            .split(/\n|,/)
            .map((link) => link.trim())
            .filter(Boolean),
          media_url: mediaUrl,
          media_urls: [mediaUrl],
          media_type: portfolioMediaType,
          sort_order: editingItem?.sort_order ?? portfolioItems.length,
        },
        editingItem?.id,
      );
      setPortfolioItems((current) =>
        editingItem
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved].sort((a, b) => a.sort_order - b.sort_order),
      );
      setShowPortfolioEditor(false);
      toast.success(t("portfolio.saved"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPortfolioSaving(false);
    }
  };

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    if (!user) return;
    setPortfolioItems((current) => current.filter((entry) => entry.id !== item.id));
    try {
      await deletePortfolioItem(user, item.id);
      toast.success(t("portfolio.deleted"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
      void loadStats(user.id);
    }
  };

  const movePortfolio = async (index: number, direction: -1 | 1) => {
    if (!user) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= portfolioItems.length) return;
    const reordered = [...portfolioItems];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const withOrder = reordered.map((item, sort_order) => ({ ...item, sort_order }));
    setPortfolioItems(withOrder);
    try {
      await reorderPortfolioItems(
        user,
        withOrder.map((item) => item.id),
      );
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
      void loadStats(user.id);
    }
  };

  const { profile } = useProfile(isOwner ? user : null);
  const ownName =
    profile?.username ||
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    user?.email?.split("@")[0] ||
    "Luna";
  const isViewingOther = !isOwner;
  const displayName = isViewingOther ? viewing?.name || "用户" : ownName;
  const initial = (viewing?.emoji || displayName.charAt(0)).toUpperCase();
  const ownerAvatarUrl = isOwner ? (profile?.avatar_url ?? null) : null;
  const ownerLocation =
    [profile?.city, profile?.country].filter(Boolean).join(", ") ||
    profile?.location ||
    t("profile.defaultLocation");
  const ownerJoinedLabel = (() => {
    const iso = profile?.created_at || user?.created_at;
    if (!iso) return "Joined in Aug 2024";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Joined in Aug 2024";
    return `${new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(d)}`;
  })();
  const ownerTagline = profile?.bio || t("profile.defaultBio");
  // For viewed user: show their bio if available, else role+region
  const tagline = isViewingOther
    ? viewing?.bio ||
      `${viewing?.role || t("profile.partner")}${viewing?.region ? " · " + viewing.region : ""}`
    : ownerTagline;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-50" />

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

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
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
                {initial}
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
        <main className="flex min-w-0 flex-1 flex-col gap-5">
          {isViewingOther && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs text-primary">
              <span>
                👀 {t("profile.viewingPrefix")}{" "}
                <span className="font-semibold text-foreground">{viewing?.name || ""}</span>{" "}
                {t("profile.viewingSuffix")}
              </span>
              <button
                onClick={goHome}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-foreground transition hover:bg-white/10"
              >
                {t("profile.backToMine")}
              </button>
            </div>
          )}
          {/* HERO */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--border)] glass-card"
          >
            <div className="relative h-48 sm:h-56">
              <HeroBanner />
              {/* edit btn (own profile only) */}
              {isOwner && (
                <Link
                  to="/settings"
                  className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white backdrop-blur-md transition-colors hover:border-[var(--border-strong)] hover:bg-black/50"
                >
                  <IconPencil size={14} />
                  {t("profile.editPageBtn")}
                </Link>
              )}
            </div>

            <div className="relative px-6 pb-6 sm:px-8">
              {/* Avatar */}
              <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="relative">
                    <div className="rounded-full bg-[image:var(--gradient-primary)] p-[3px] shadow-[0_0_40px_oklch(0.72_0.18_295/0.6)]">
                      {ownerAvatarUrl && !isViewingOther ? (
                        <img
                          src={ownerAvatarUrl}
                          alt={displayName}
                          className="h-20 w-20 rounded-full bg-background object-cover"
                        />
                      ) : (
                        <div className="grid h-20 w-20 place-items-center rounded-full bg-background font-display text-3xl font-extrabold text-foreground">
                          {initial}
                        </div>
                      )}
                    </div>
                    {/* verified badge */}
                    <div className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-background bg-sky-500 text-white">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-3xl font-extrabold tracking-tight text-gradient">
                        {displayName}
                      </h1>
                      <span className="rounded-md border border-amber-300/40 bg-gradient-to-br from-amber-300/30 to-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                        ★ Pro
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        📍{" "}
                        {isViewingOther
                          ? viewing?.region || t("profile.defaultLocation")
                          : ownerLocation}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{isViewingOther ? t("profile.partner") : ownerJoinedLabel}</span>
                      <span className="opacity-40">·</span>
                      <span className="text-emerald-300">{t("profile.online")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isViewingOther ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void toggleViewingSave()}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                          savedViewing
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-[var(--border-strong)] bg-white/[0.03] text-foreground"
                        }`}
                      >
                        {savedViewing ? t("social.saved") : t("social.save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void startViewingChat()}
                        className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-0.5"
                      >
                        {t("profile.sendMessage")}
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/settings"
                      className="rounded-xl border border-[var(--border-strong)] bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/[0.06]"
                    >
                      {t("profile.editInfo")}
                    </Link>
                  )}
                </div>
              </div>

              {/* Stats — real data from DB */}
              <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5 sm:grid-cols-4">
                {[
                  {
                    label: t("profile.stats.matches"),
                    value: realMatchCount ?? 0,
                    suffix: "",
                  },
                  {
                    label: t("profile.stats.rating"),
                    value: realRepScore ?? 0,
                    suffix: "",
                    decimals: 1,
                  },
                  {
                    label: t("profile.stats.cards"),
                    value: realIdentCards.length,
                    suffix: "",
                  },
                  { label: t("profile.stats.helpRate"), value: 0, suffix: "%" },
                ].map((s) => (
                  <StatBlock key={s.label} {...s} />
                ))}
              </div>
            </div>
          </motion.section>

          {/* MIDDLE GRID */}
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            {/* TABS */}
            <section className="glass-card rounded-3xl p-6">
              <div className="mb-5 flex items-center gap-1 rounded-full border border-[var(--border)] bg-white/[0.03] p-1">
                {(
                  [
                    { id: "identity", label: t("profile.tab.identity") },
                    { id: "portfolio", label: t("profile.tab.portfolio") },
                    { id: "reviews", label: t("profile.tab.reviews") },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      tab === t.id
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === t.id && (
                      <motion.span
                        layoutId="profile-tab-pill"
                        className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="mb-5 text-xs text-muted-foreground">
                {tab === "identity" && t("profile.identityHint")}
                {tab === "portfolio" && t("profile.portfolioHint")}
                {tab === "reviews" && t("profile.reviewsHint")}
              </p>

              <AnimatePresence mode="wait">
                {tab === "identity" && (
                  <motion.div
                    key="identity"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  >
                    {realIdentCards.length === 0 && (
                      <div className="col-span-full rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5 text-sm text-muted-foreground">
                        No real identity cards yet.
                      </div>
                    )}
                    {realIdentCards.map((c, i) => (
                      <IdentityCard
                        key={`${c.title}-${i}`}
                        card={c}
                        index={i}
                        onEdit={
                          isOwner && realIdentCards.length > 0 ? () => openEditCard(i) : undefined
                        }
                        onDelete={
                          isOwner && realIdentCards.length > 0
                            ? () => handleDeleteCard(i)
                            : undefined
                        }
                        onSave={!isOwner && c.id ? () => void toggleCardSave(c) : undefined}
                        onOpen={
                          c.id
                            ? () =>
                                navigate({
                                  to: "/cards/$cardId",
                                  params: { cardId: c.id as string },
                                })
                            : undefined
                        }
                        saved={c.id ? !!savedCards[c.id] : false}
                      />
                    ))}
                    {/* Only show "add" button to owner */}
                    {isOwner && (
                      <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        onClick={openAddCard}
                        className="group flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)]/60 bg-white/[0.01] text-muted-foreground transition-all hover:border-[var(--border-strong)] hover:bg-white/[0.03] hover:text-accent"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-strong)] text-xl transition-transform group-hover:scale-110">
                          +
                        </span>
                        <span className="text-sm font-medium">{t("card.add")}</span>
                      </motion.button>
                    )}
                  </motion.div>
                )}

                {tab === "portfolio" && (
                  <motion.div
                    key="portfolio"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {isOwner && (
                      <button
                        onClick={openPortfolioCreate}
                        className="w-full rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/[0.02] px-4 py-4 text-sm font-medium text-muted-foreground transition hover:bg-white/[0.05] hover:text-accent"
                      >
                        + {t("portfolio.add")}
                      </button>
                    )}
                    {portfolioItems.length ? (
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {portfolioItems.map((item, i) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.35 }}
                            className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-white/[0.02]"
                          >
                            <button
                              onClick={() => setLightboxIndex(i)}
                              className="block w-full overflow-hidden bg-black/30 text-left"
                            >
                              {item.media_type === "video" ? (
                                <video
                                  src={item.media_url}
                                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={item.media_url}
                                  alt={item.title}
                                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                              )}
                            </button>
                            <div className="p-4">
                              <div className="font-display text-sm font-bold">{item.title}</div>
                              {item.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.description}
                                </p>
                              )}
                              {isOwner && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => openPortfolioEdit(item)}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    {t("common.edit")}
                                  </button>
                                  <button
                                    onClick={() => void handleDeletePortfolio(item)}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-muted-foreground hover:text-destructive"
                                  >
                                    {t("common.delete")}
                                  </button>
                                  <button
                                    disabled={i === 0}
                                    onClick={() => void movePortfolio(i, -1)}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    disabled={i === portfolioItems.length - 1}
                                    onClick={() => void movePortfolio(i, 1)}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                                  >
                                    ↓
                                  </button>
                                </div>
                              )}
                              {!isOwner && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => void togglePortfolioSave(item)}
                                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                                  >
                                    {savedPortfolioItems[item.id]
                                      ? t("social.saved")
                                      : t("social.save")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-8 text-center text-sm text-muted-foreground">
                        {isOwner ? t("portfolio.emptyOwner") : t("portfolio.emptyPublic")}
                      </div>
                    )}
                  </motion.div>
                )}

                {tab === "reviews" && (
                  <motion.div
                    key="reviews"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    {(realReviews.length ? realReviews : reviews).map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-5 hover:border-[var(--border-strong)]"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
                              {r.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold">{r.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.region} · {r.time}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <span
                                key={j}
                                className={
                                  j < r.rating ? "text-amber-300" : "text-muted-foreground/30"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {r.text}
                        </p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* RIGHT SIDEBAR */}
            <aside className="flex flex-col gap-5">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card rounded-3xl p-5"
              >
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("profile.skillLevel")}
                </h3>
                <div className="space-y-4">
                  {skills.map((s) => (
                    <SkillBar key={s.name} {...s} />
                  ))}
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card rounded-3xl p-5"
              >
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                  </span>
                  {t("profile.needsHeading")}
                </div>
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("profile.needsHint")}
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {latestNeed?.content ?? t("profile.noActiveNeed")}
                </p>
                {latestNeed?.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {latestNeed.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--border)] bg-white/[0.03] px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card rounded-3xl p-5"
              >
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("profile.socialLinks")}
                </h3>
                <div className="flex gap-2">
                  {[IconX, IconGithub, IconLinkedin, IconDiscord].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toast.info(t("settings.comingLaterTitle"))}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-white/[0.03] text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:text-accent"
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
              </motion.section>

              <button
                onClick={() => void reportViewingUser()}
                className="text-xs text-muted-foreground/60 transition-colors hover:text-destructive"
              >
                {t("profile.reportUser")}
              </button>
            </aside>
          </div>
        </main>
      </div>

      {/* Add identity card modal */}
      <AnimatePresence>
        {showAddCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddCard(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md rounded-3xl p-6"
            >
              <h3 className="font-display text-xl font-bold">
                {editingCardIndex !== null ? t("card.editTitle") : t("card.addTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("card.modalHint")}</p>
              <div className="mt-5 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                <div>
                  <label className="text-xs text-muted-foreground">{t("card.emoji")}</label>
                  <input
                    value={newCardEmoji}
                    onChange={(e) => setNewCardEmoji(e.target.value)}
                    maxLength={2}
                    className="mt-1 w-20 rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-center text-2xl outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("card.name")}</label>
                  <input
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder={t("card.namePlaceholder")}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t("card.summary")}</label>
                  <textarea
                    value={newCardDesc}
                    onChange={(e) => setNewCardDesc(e.target.value)}
                    rows={2}
                    placeholder={t("card.summaryPlaceholder")}
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Detailed description</label>
                  <textarea
                    value={newCardDetails}
                    onChange={(e) => setNewCardDetails(e.target.value)}
                    rows={4}
                    placeholder="Explain your supply in more detail: context, strengths, boundaries, and how people can work with you."
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <details
                  open
                  className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3"
                >
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Basic supply
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Skills</label>
                      <input
                        value={newCardSkills}
                        onChange={(e) => setNewCardSkills(e.target.value)}
                        placeholder="React, Korean tutoring, IELTS speaking..."
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Languages</label>
                      <input
                        value={newCardLanguages}
                        onChange={(e) => setNewCardLanguages(e.target.value)}
                        placeholder="English fluent, Korean native..."
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Country</label>
                        <input
                          value={newCardCountry}
                          onChange={(e) => setNewCardCountry(e.target.value)}
                          placeholder="Korea"
                          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">City</label>
                        <input
                          value={newCardCity}
                          onChange={(e) => setNewCardCity(e.target.value)}
                          placeholder="Seoul"
                          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">What I can provide</label>
                      <textarea
                        value={newCardOffer}
                        onChange={(e) => setNewCardOffer(e.target.value)}
                        rows={2}
                        placeholder="Describe the help, resource, or value this card offers."
                        className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">
                        Who I want to connect with
                      </label>
                      <textarea
                        value={newCardConnectWith}
                        onChange={(e) => setNewCardConnectWith(e.target.value)}
                        rows={2}
                        placeholder="Describe the people, needs, or situations this supply card is best for."
                        className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                      />
                    </div>
                  </div>
                </details>
                <details className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Experience
                  </summary>
                  <div className="mt-3 space-y-3">
                    <input
                      value={newCardEducation}
                      onChange={(e) => setNewCardEducation(e.target.value)}
                      placeholder="Education or training"
                      className="w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                    <textarea
                      value={newCardProjects}
                      onChange={(e) => setNewCardProjects(e.target.value)}
                      rows={2}
                      placeholder="Relevant projects"
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                    <textarea
                      value={newCardWork}
                      onChange={(e) => setNewCardWork(e.target.value)}
                      rows={2}
                      placeholder="Work or practical experience"
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                    <input
                      value={newCardPlaces}
                      onChange={(e) => setNewCardPlaces(e.target.value)}
                      placeholder="Places lived, separated by commas"
                      className="w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                </details>
                <details className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Proof
                  </summary>
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={newCardProofLinks}
                      onChange={(e) => setNewCardProofLinks(e.target.value)}
                      rows={2}
                      placeholder="Portfolio, GitHub, LinkedIn, website links"
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                    <textarea
                      value={newCardProofNote}
                      onChange={(e) => setNewCardProofNote(e.target.value)}
                      rows={2}
                      placeholder="Optional proof note, certificate, result, or credibility signal"
                      className="w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                </details>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleCardMediaPick(e.dataTransfer.files);
                  }}
                  className="block cursor-pointer rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/[0.03] p-4 text-center transition hover:bg-white/[0.06]"
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleCardMediaPick(e.target.files)}
                  />
                  <div className="text-sm font-medium text-foreground">{t("card.mediaUpload")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("card.mediaUploadHint")}
                  </div>
                </label>
                {newCardMediaPreviews.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {newCardMediaPreviews.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-black/30"
                      >
                        {/\.(mp4|mov|webm)(\?|$)/i.test(url) ||
                        newCardMediaFiles[index]?.type.startsWith("video/") ? (
                          <video src={url} className="h-24 w-full object-cover" muted playsInline />
                        ) : (
                          <img src={url} alt="" className="h-24 w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeCardMediaPreview(index)}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white opacity-90 transition hover:bg-black"
                          aria-label="移除媒体"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="block cursor-pointer rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/[0.03] p-4 text-center transition hover:bg-white/[0.06]">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleCardVoicePick(e.target.files)}
                  />
                  <div className="text-sm font-medium text-foreground">{t("card.voiceUpload")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("card.voiceUploadHint")}
                  </div>
                </label>
                {newCardVoicePreview && (
                  <div className="rounded-xl border border-[var(--border)] bg-white/[0.03] p-3">
                    <audio src={newCardVoicePreview} controls className="h-9 w-full" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewCardVoiceFile(null);
                        setNewCardVoicePreview(null);
                      }}
                      className="mt-2 rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t("card.removeVoice")}
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddCard(false);
                    setEditingCardIndex(null);
                  }}
                  className="rounded-xl border border-[var(--border)] bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/[0.08]"
                >
                  {t("card.cancel")}
                </button>
                <button
                  onClick={handleSaveCard}
                  className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
                >
                  {editingCardIndex !== null ? t("card.save") : t("card.create")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio editor */}
      <AnimatePresence>
        {showPortfolioEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPortfolioEditor(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg rounded-3xl p-6"
            >
              <h3 className="font-display text-xl font-bold">
                {editingPortfolioId ? t("portfolio.edit") : t("portfolio.add")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("portfolio.hint")}</p>
              <div className="mt-5 space-y-3">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePortfolioFilePick(e.dataTransfer.files);
                  }}
                  className="block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/[0.03] p-4 text-center transition hover:bg-white/[0.06]"
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handlePortfolioFilePick(e.target.files)}
                  />
                  {portfolioPreview ? (
                    portfolioMediaType === "video" ? (
                      <video
                        src={portfolioPreview}
                        className="mx-auto max-h-64 rounded-xl object-contain"
                        controls
                      />
                    ) : (
                      <img
                        src={portfolioPreview}
                        alt=""
                        className="mx-auto max-h-64 rounded-xl object-contain"
                      />
                    )
                  ) : (
                    <>
                      <div className="text-sm font-medium text-foreground">
                        {t("portfolio.upload")}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("portfolio.uploadHint")}
                      </div>
                    </>
                  )}
                </label>
                {portfolioPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPortfolioFile(null);
                      setPortfolioPreview(null);
                    }}
                    className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t("portfolio.removeMedia")}
                  </button>
                )}
                <div>
                  <label className="text-xs text-muted-foreground">{t("portfolio.title")}</label>
                  <input
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Year</label>
                    <input
                      value={portfolioYear}
                      onChange={(e) => setPortfolioYear(e.target.value)}
                      placeholder="2025"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Role</label>
                    <input
                      value={portfolioRole}
                      onChange={(e) => setPortfolioRole(e.target.value)}
                      placeholder="Lead designer, backend engineer..."
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {t("portfolio.description")}
                  </label>
                  <textarea
                    value={portfolioDesc}
                    onChange={(e) => setPortfolioDesc(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Project background</label>
                  <textarea
                    value={portfolioBackground}
                    onChange={(e) => setPortfolioBackground(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">What I personally did</label>
                  <textarea
                    value={portfolioContribution}
                    onChange={(e) => setPortfolioContribution(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Result / outcome</label>
                  <textarea
                    value={portfolioOutcome}
                    onChange={(e) => setPortfolioOutcome(e.target.value)}
                    rows={2}
                    className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Tools / skills</label>
                    <input
                      value={portfolioTools}
                      onChange={(e) => setPortfolioTools(e.target.value)}
                      placeholder="React, Figma, Supabase"
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">External links</label>
                    <input
                      value={portfolioLinks}
                      onChange={(e) => setPortfolioLinks(e.target.value)}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-[var(--border-strong)]"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowPortfolioEditor(false)}
                  className="rounded-xl border border-[var(--border)] bg-white/[0.04] px-4 py-2 text-sm hover:bg-white/[0.08]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => void handleSavePortfolio()}
                  disabled={portfolioSaving}
                  className="rounded-xl bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
                >
                  {portfolioSaving ? t("settings.saving") : t("common.save")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && portfolioItems[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="关闭"
            >
              <IconX />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) =>
                  i === null ? 0 : (i - 1 + portfolioItems.length) % portfolioItems.length,
                );
              }}
              className="absolute left-5 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-white transition hover:bg-white/10"
              aria-label="上一张"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i === null ? 0 : (i + 1) % portfolioItems.length));
              }}
              className="absolute right-5 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-white transition hover:bg-white/10"
              aria-label="下一张"
            >
              ›
            </button>
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_120px_-20px_oklch(0.5_0.25_300/0.7)]"
            >
              {portfolioItems[lightboxIndex].media_type === "video" ? (
                <video
                  src={portfolioItems[lightboxIndex].media_url}
                  className="max-h-[60vh] w-full bg-black object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  src={portfolioItems[lightboxIndex].media_url}
                  alt={portfolioItems[lightboxIndex].title}
                  className="max-h-[60vh] w-full bg-black object-contain"
                />
              )}
              <div className="bg-black/70 px-6 py-4 backdrop-blur-xl">
                <div className="font-display text-lg font-bold text-white">
                  {portfolioItems[lightboxIndex].title}
                </div>
                {portfolioItems[lightboxIndex].description && (
                  <div className="mt-1 text-sm text-white/70">
                    {portfolioItems[lightboxIndex].description}
                  </div>
                )}
                <div className="mt-1 text-xs text-white/60">
                  {lightboxIndex + 1} / {portfolioItems.length} · {t("portfolio.closeHint")}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
