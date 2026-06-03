import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/relations")({
  component: AdminRelationsPage,
  head: () => ({
    meta: [{ title: "Relations — Finding Admin" }],
  }),
});

type RelationRow = {
  id: string;
  kind: string;
  user_id: string;
  target_id: string;
  status?: string | null;
  created_at: string;
};

function AdminRelationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RelationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const [savedUsers, savedCards, savedNeeds, savedPortfolio, follows] = await Promise.all([
        (supabase as any)
          .from("saved_users")
          .select("id, user_id, target_profile_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("saved_cards")
          .select("id, user_id, card_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("saved_needs")
          .select("id, user_id, need_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("saved_portfolio_items")
          .select("id, user_id, portfolio_item_id, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("follows")
          .select("id, follower_id, target_profile_id, status, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (cancelled) return;
      const firstError =
        savedUsers.error ||
        savedCards.error ||
        savedNeeds.error ||
        savedPortfolio.error ||
        follows.error;
      if (firstError) {
        setError(firstError.message);
      } else {
        setRows(
          [
            ...((savedUsers.data ?? []) as any[]).map((row) => ({
              id: row.id,
              kind: "saved_user",
              user_id: row.user_id,
              target_id: row.target_profile_id,
              created_at: row.created_at,
            })),
            ...((savedCards.data ?? []) as any[]).map((row) => ({
              id: row.id,
              kind: "saved_card",
              user_id: row.user_id,
              target_id: row.card_id,
              created_at: row.created_at,
            })),
            ...((savedNeeds.data ?? []) as any[]).map((row) => ({
              id: row.id,
              kind: "saved_need",
              user_id: row.user_id,
              target_id: row.need_id,
              created_at: row.created_at,
            })),
            ...((savedPortfolio.data ?? []) as any[]).map((row) => ({
              id: row.id,
              kind: "saved_portfolio",
              user_id: row.user_id,
              target_id: row.portfolio_item_id,
              created_at: row.created_at,
            })),
            ...((follows.data ?? []) as any[]).map((row) => ({
              id: row.id,
              kind: "follow",
              user_id: row.follower_id,
              target_id: row.target_profile_id,
              status: row.status,
              created_at: row.created_at,
            })),
          ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
        );
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
        <Header />
        <section className="mt-8 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Admin · Relations</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved records, follows and connection-like relationships visible to this account.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {rows.length} rows
            </span>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading relations...</p>}
          {error && <ErrorBox message={error} />}
          {!loading && !error && rows.length === 0 && <Empty />}
          {!loading && !error && rows.length > 0 && (
            <div className="grid gap-3">
              {rows.map((row) => (
                <RecordCard key={`${row.kind}-${row.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{row.kind}</div>
                      <div className="mt-1 text-xs text-muted-foreground">User: {row.user_id}</div>
                      <div className="text-xs text-muted-foreground">Target: {row.target_id}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{row.status || "active"}</div>
                      <div>{new Date(row.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </RecordCard>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/home" className="flex items-center gap-2">
        <FindingMark size={28} />
        <span className="font-display text-xl font-bold">Finding.</span>
      </Link>
      <nav className="flex gap-2 text-xs text-muted-foreground">
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
    </header>
  );
}

function RecordCard({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">{children}</div>;
}

function Empty() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
      No records.
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
