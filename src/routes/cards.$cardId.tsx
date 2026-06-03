import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { StarField } from "@/components/StarField";
import { openOrCreateConversation } from "@/lib/chat";
import { isSavedCard, setSavedCard } from "@/lib/socialActions";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { FindingMark } from "@/components/icons/FindingIcons";

export const Route = createFileRoute("/cards/$cardId")({
  component: CardDetailPage,
  head: () => ({
    meta: [
      { title: "Identity Card — Finding." },
      { name: "description", content: "View an identity card on Finding." },
    ],
  }),
});

type CardDetail = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  summary: string | null;
  details: string | null;
  tags: string[];
  supply_skills: string[];
  supply_languages: string[];
  supply_country: string | null;
  supply_city: string | null;
  offer_summary: string | null;
  connection_preferences: string | null;
  education: string | null;
  projects: string | null;
  work_experience: string | null;
  places_lived: string[];
  proof_links: string[];
  proof_note: string | null;
  media_urls: string[];
  voice_intro_url: string | null;
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_emoji: string | null;
    bio: string | null;
    location: string | null;
  } | null;
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [card, setCard] = useState<CardDetail | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      if (!cancelled) setUser(currentUser);

      const { data, error: cardError } = await (supabase as any)
        .from("information_cards")
        .select(
          "id, user_id, title, category, summary, details, tags, supply_skills, supply_languages, supply_country, supply_city, offer_summary, connection_preferences, education, projects, work_experience, places_lived, proof_links, proof_note, media_urls, voice_intro_url, visibility",
        )
        .eq("id", cardId)
        .eq("visibility", "public")
        .limit(1);

      if (cancelled) return;
      if (cardError) {
        setError(cardError.message);
        setLoading(false);
        return;
      }

      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setError("Card not found.");
        setLoading(false);
        return;
      }

      const { data: profileRows } = await (supabase as any)
        .from("profiles")
        .select("id, username, display_name, avatar_emoji, bio, location")
        .eq("id", row.user_id)
        .limit(1);
      const owner = Array.isArray(profileRows) ? profileRows[0] : null;

      const nextCard: CardDetail = {
        id: String(row.id),
        user_id: String(row.user_id),
        title: String(row.title ?? ""),
        category: String(row.category ?? "Skill"),
        summary: row.summary ?? null,
        details: row.details ?? null,
        tags: asStringArray(row.tags),
        supply_skills: asStringArray(row.supply_skills),
        supply_languages: asStringArray(row.supply_languages),
        supply_country: row.supply_country ?? null,
        supply_city: row.supply_city ?? null,
        offer_summary: row.offer_summary ?? null,
        connection_preferences: row.connection_preferences ?? null,
        education: row.education ?? null,
        projects: row.projects ?? null,
        work_experience: row.work_experience ?? null,
        places_lived: asStringArray(row.places_lived),
        proof_links: asStringArray(row.proof_links),
        proof_note: row.proof_note ?? null,
        media_urls: asStringArray(row.media_urls),
        voice_intro_url: row.voice_intro_url ?? null,
        owner: owner
          ? {
              id: String(owner.id),
              username: String(owner.username ?? ""),
              display_name: owner.display_name ?? null,
              avatar_emoji: owner.avatar_emoji ?? null,
              bio: owner.bio ?? null,
              location: owner.location ?? null,
            }
          : null,
      };
      setCard(nextCard);

      if (currentUser) {
        try {
          setSaved(await isSavedCard(currentUser.id, nextCard.id));
        } catch (saveError) {
          console.warn("[card-detail] saved state failed:", saveError);
        }
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const location = useMemo(() => {
    if (!card) return "";
    return [card.supply_city, card.supply_country].filter(Boolean).join(", ");
  }, [card]);

  const toggleSave = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!card) return;
    const next = !saved;
    setSaved(next);
    try {
      await setSavedCard(user.id, card.id, next);
      toast.success(next ? t("social.saved") : t("social.unsaved"));
    } catch (saveError) {
      setSaved(!next);
      toast.error(t("settings.saveFailed"), {
        description: saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
  };

  const messageOwner = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!card?.owner) return;
    if (card.owner.id === user.id) {
      navigate({ to: "/profile" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: card.owner.id,
        partnerUsername: card.owner.username,
        partnerName: card.owner.display_name ?? card.owner.username,
        matchTag: card.title,
      });
      navigate({ to: "/messages", search: { conversationId } });
    } catch (chatError) {
      toast.error(t("messages.sendFailed"), {
        description: chatError instanceof Error ? chatError.message : String(chatError),
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <StarField />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-3">
            <FindingMark className="h-9 w-9" />
            <span className="font-display text-xl font-bold">Finding.</span>
          </Link>
          <Link
            to="/bookmarks"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Saved
          </Link>
        </header>

        {loading ? (
          <div className="glass-card rounded-3xl p-10 text-center text-muted-foreground">
            Loading card...
          </div>
        ) : error || !card ? (
          <div className="glass-card rounded-3xl p-10 text-center">
            <p className="font-display text-xl font-bold">Card unavailable</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <main className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="glass-card overflow-hidden rounded-3xl">
              {card.media_urls.length > 0 && (
                <div className="grid gap-2 border-b border-[var(--border)] bg-black/20 p-3 sm:grid-cols-2">
                  {card.media_urls.map((url) => (
                    <div key={url} className="overflow-hidden rounded-2xl bg-black/30">
                      {/\.(mp4|mov|webm)(\?|$)/i.test(url) ? (
                        <video src={url} controls className="max-h-72 w-full object-cover" />
                      ) : (
                        <img src={url} alt={card.title} className="max-h-72 w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent-soft">
                    {card.category}
                  </span>
                  {location && <span>{location}</span>}
                </div>
                <h1 className="mt-4 font-display text-3xl font-black sm:text-4xl">
                  {card.title}
                </h1>
                {card.summary && (
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {card.summary}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {[...card.tags, ...card.supply_skills].slice(0, 12).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1 text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-8 grid gap-4">
                  <DetailBlock title="Detailed description" body={card.details} />
                  <DetailBlock title="What I can offer" body={card.offer_summary} />
                  <DetailBlock
                    title="Who I want to connect with"
                    body={card.connection_preferences}
                  />
                  <DetailBlock title="Experience / education" body={card.education} />
                  <DetailBlock title="Projects" body={card.projects} />
                  <DetailBlock title="Work experience" body={card.work_experience} />
                  <ListBlock title="Languages" items={card.supply_languages} />
                  <ListBlock title="Places lived" items={card.places_lived} />
                  <ListBlock title="Portfolio links" items={card.proof_links} link />
                  <DetailBlock title="Proof note" body={card.proof_note} />
                </div>

                {card.voice_intro_url && (
                  <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.03] p-4">
                    <p className="mb-2 text-sm font-medium">Voice intro</p>
                    <audio src={card.voice_intro_url} controls className="w-full" />
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="glass-card rounded-3xl p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Owner profile
                </p>
                <div className="mt-4 flex items-start gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-2xl">
                    {card.owner?.avatar_emoji ?? "👤"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold">
                      {card.owner?.display_name ?? card.owner?.username ?? "Finding user"}
                    </p>
                    {card.owner?.username && (
                      <p className="text-xs text-muted-foreground">@{card.owner.username}</p>
                    )}
                    {card.owner?.location && (
                      <p className="mt-1 text-xs text-muted-foreground">{card.owner.location}</p>
                    )}
                  </div>
                </div>
                {card.owner?.bio && (
                  <p className="mt-4 line-clamp-4 text-sm text-muted-foreground">
                    {card.owner.bio}
                  </p>
                )}
              </div>

              <div className="glass-card rounded-3xl p-4">
                <div className="grid gap-2">
                  <button
                    onClick={toggleSave}
                    className="rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
                  >
                    {saved ? "Unsave card" : "Save card"}
                  </button>
                  <button
                    onClick={messageOwner}
                    className="rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium hover:bg-white/[0.05]"
                  >
                    Message owner
                  </button>
                  {card.owner?.username && (
                    <Link
                      to="/user/$username"
                      params={{ username: card.owner.username }}
                      className="rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      View owner profile
                    </Link>
                  )}
                </div>
              </div>
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </section>
  );
}

function ListBlock({
  title,
  items,
  link,
}: {
  title: string;
  items: string[];
  link?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) =>
          link ? (
            <a
              key={item}
              href={item}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent-soft hover:bg-accent/20"
            >
              {item}
            </a>
          ) : (
            <span
              key={item}
              className="rounded-full border border-[var(--border)] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ),
        )}
      </div>
    </section>
  );
}
