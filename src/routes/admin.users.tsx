import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [{ title: "Users — Finding Admin" }],
  }),
});

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  location: string | null;
  is_simulated: boolean | null;
  reputation_score: number | null;
  created_at: string | null;
};

function AdminUsersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, username, display_name, location, is_simulated, reputation_score, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as ProfileRow[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AdminShell title="Users" count={rows.length}>
      {loading && <p className="text-sm text-muted-foreground">Loading users...</p>}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Link
              key={row.id}
              to="/user/$username"
              params={{ username: row.username || row.id }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-primary/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">
                    {row.display_name || row.username || "Unnamed profile"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.id}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{row.is_simulated ? "Simulated" : "Real"}</div>
                  <div>{row.location || "No location"}</div>
                  <div>Rep {row.reputation_score ?? "-"}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function AdminShell({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
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
        <section className="mt-8 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">Admin · {title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Debug visibility follows current Supabase RLS.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {count} rows
            </span>
          </div>
          {children}
        </section>
      </main>
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
