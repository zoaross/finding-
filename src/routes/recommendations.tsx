import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StarField } from "@/components/StarField";
import { openOrCreateConversation } from "@/lib/chat";
import { useI18n } from "@/lib/i18n";
import { getRealMatchesForUser, type RealMatch } from "@/lib/realMatches";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsPage,
  head: () => ({
    meta: [
      { title: "为你推荐 — Finding." },
      { name: "description", content: "AI 为你智能推荐的全球协作伙伴。" },
    ],
  }),
});

function RecommendationsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [matches, setMatches] = useState<RealMatch[]>([]);
  const [seedFilteredCount, setSeedFilteredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const currentUser = data.session?.user;
      if (!currentUser) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        const result = await getRealMatchesForUser(currentUser.id);
        if (!mounted) return;
        setMatches(result.matches);
        setSeedFilteredCount(result.seedFilteredCount);
      } catch (error) {
        console.warn("[recommendations] load failed:", error);
        if (mounted) {
          setMatches([]);
          setSeedFilteredCount(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const openChat = async (match: RealMatch) => {
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: match.profileId,
        partnerUsername: match.username,
        partnerName: match.displayName,
        matchId: match.id,
        sourceNeedId: match.needId,
        matchTag: match.cardTitle,
      });
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t("common.back")}
        </Link>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">
          <span className="text-gradient">{t("home.recommendations")}</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("home.matchesAfterPosting")}</p>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted-foreground/70">
          data_source: real_supabase
          <br />
          real_match_count: {matches.length}
          <br />
          seed_filtered_count: {seedFilteredCount}
        </p>

        {loading ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card h-32 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : matches.length === 0 ? (
          <div className="glass-card mt-8 rounded-3xl p-10 text-center">
            <h2 className="font-display text-2xl font-bold">{t("home.noRecommendations")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("home.matchFoundDesc")}</p>
            <Link
              to="/home"
              className="mt-6 inline-flex rounded-full bg-[image:var(--gradient-primary)] px-5 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("common.back")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {matches.map((match, i) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-xl text-primary-foreground">
                    {match.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate font-semibold">{match.displayName}</p>
                      <span className="rounded-full bg-[image:var(--gradient-primary)] px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {match.score}%
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{match.cardTitle}</p>
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {match.location}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void openChat(match)}
                  className="mt-3 w-full rounded-lg border border-accent/30 bg-accent/10 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-[0.98]"
                >
                  {t("bookmarks.startChat")} →
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
