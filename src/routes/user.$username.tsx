import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ProfilePageInner } from "./profile";

export const Route = createFileRoute("/user/$username")({
  component: UserProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} 的主页 — Finding.` },
      { name: "description", content: `查看 ${params.username} 在 Finding 上的身份卡、作品集与评价。` },
    ],
  }),
});

export type ViewingPartner = {
  name: string;
  emoji?: string;
  region?: string;
  role?: string;
  bio?: string;
  skills?: string[];
  userId?: string;
  reputationScore?: number;
} | null;

function UserProfilePage() {
  const { username } = Route.useParams();
  const [viewing, setViewing] = useState<ViewingPartner>({ name: username });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      // 1. Fetch real profile from DB by username
      const { data } = await (supabase as any)
        .from("profiles")
        .select(
          "id, username, bio, location, country, city, region, show_region, avatar_emoji, skills, reputation_score",
        )
        .eq("username", username)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        const skills = Array.isArray(data.skills) ? (data.skills as string[]) : [];
        setViewing({
          name: (data.username as string) || username,
          emoji: (data.avatar_emoji as string) ?? undefined,
          region:
            data.show_region === false
              ? undefined
              : ([data.city, data.country].filter(Boolean).join(", ") ||
                (data.region as string) ||
                (data.location as string) ||
                undefined),
          role: skills.length > 0 ? skills[0] : "Finding 用户",
          bio: (data.bio as string) ?? undefined,
          skills,
          userId: data.id as string,
          reputationScore: (data.reputation_score as number) ?? undefined,
        });
        return;
      }

      // 2. No DB result — fall back to localStorage handoff
      try {
        const raw = localStorage.getItem("finding:viewing-profile");
        if (raw) {
          const parsed = JSON.parse(raw) as ViewingPartner;
          if (parsed?.name) {
            setViewing({ ...parsed, name: parsed.name || username });
            return;
          }
        }
      } catch {}

      setViewing({ name: username });
    }

    void loadProfile();
    return () => { cancelled = true; };
  }, [username]);

  return <ProfilePageInner isOwner={false} viewingOverride={viewing} />;
}
