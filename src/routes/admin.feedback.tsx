import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
  head: () => ({
    meta: [
      { title: "Feedback — Finding Admin" },
      {
        name: "description",
        content: "Completed Finding connections and collaboration feedback.",
      },
    ],
  }),
});

type FeedbackRow = {
  id: string;
  conversation_id: string;
  need_id: string | null;
  partner_profile_id: string | null;
  partner_name: string | null;
  match_tag: string | null;
  rating: number;
  feedback: string | null;
  success_tags: string[] | null;
  status: string;
  created_at: string;
};

function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUser(session.user);
      const { data, error } = await supabase
        .from("conversation_ratings")
        .select(
          "id, conversation_id, need_id, partner_profile_id, partner_name, match_tag, rating, feedback, success_tags, status, created_at",
        )
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRows([]);
      } else {
        setRows((data ?? []) as FeedbackRow[]);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />
      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8">
        <header className="flex items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2">
            <FindingMark size={28} />
            <span className="font-display text-xl font-bold">Finding.</span>
          </Link>
          <div className="text-right text-xs text-muted-foreground">
            <nav className="mb-1 flex gap-2">
              <Link to="/admin/users" className="hover:text-foreground">
                Users
              </Link>
              <Link to="/admin/reports" className="hover:text-foreground">
                Reports
              </Link>
              <Link to="/admin/relations" className="hover:text-foreground">
                Relations
              </Link>
              <Link to="/admin/feedback" className="hover:text-foreground">
                Feedback
              </Link>
            </nav>
            <div>{user?.email ?? "Signed-in reviewer"}</div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Completed connection feedback</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Stored ratings from completed chats. Rows follow Supabase RLS, so this view shows
                the feedback this account can read.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {rows.length} completed
            </span>
          </div>

          {loading && <p className="mt-8 text-sm text-muted-foreground">Loading feedback...</p>}
          {error && (
            <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-muted-foreground">
              No completed feedback yet.
            </div>
          )}
          {rows.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Match</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Feedback</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 align-top">
                      <td className="px-4 py-4">
                        <div className="font-medium">{row.partner_name ?? "Finding partner"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {row.partner_profile_id ?? "No profile id"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>{row.match_tag ?? "Finding match"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Need: {row.need_id ?? "not linked"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-amber-300">{"★".repeat(row.rating)}</td>
                      <td className="px-4 py-4">
                        <div>{row.feedback || "No written feedback"}</div>
                        {row.success_tags && row.success_tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {row.success_tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
