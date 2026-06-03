import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsPage,
  head: () => ({
    meta: [{ title: "Reports — Finding Admin" }],
  }),
});

type ReportRow = {
  id: string;
  reporter_id: string;
  target_profile_id: string;
  reason: string;
  note: string | null;
  status: string | null;
  created_at: string;
};

type BlockRow = {
  id: string;
  blocker_id: string;
  blocked_profile_id: string;
  reason: string | null;
  created_at: string;
};

function AdminReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const [reportRows, blockRows] = await Promise.all([
        (supabase as any)
          .from("reports")
          .select("id, reporter_id, target_profile_id, reason, note, status, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any)
          .from("blocked_users")
          .select("id, blocker_id, blocked_profile_id, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (cancelled) return;
      if (reportRows.error || blockRows.error) {
        setError(reportRows.error?.message || blockRows.error?.message || "Admin query failed");
      } else {
        setReports((reportRows.data ?? []) as ReportRow[]);
        setBlocks((blockRows.data ?? []) as BlockRow[]);
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
              <h1 className="font-display text-3xl font-bold">Admin · Reports</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Reports and block records visible to this account.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              {reports.length + blocks.length} rows
            </span>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading reports...</p>}
          {error && <ErrorBox message={error} />}
          {!loading && !error && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Reports">
                {reports.length === 0 ? (
                  <Empty />
                ) : (
                  reports.map((row) => (
                    <RecordCard key={row.id}>
                      <div className="font-medium">{row.reason}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Reporter: {row.reporter_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Target: {row.target_profile_id}
                      </div>
                      {row.note && <p className="mt-2 text-sm">{row.note}</p>}
                      <Meta>
                        {row.status || "open"} · {new Date(row.created_at).toLocaleString()}
                      </Meta>
                    </RecordCard>
                  ))
                )}
              </Panel>
              <Panel title="Blocked users">
                {blocks.length === 0 ? (
                  <Empty />
                ) : (
                  blocks.map((row) => (
                    <RecordCard key={row.id}>
                      <div className="font-medium">{row.reason || "blocked"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Blocker: {row.blocker_id}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Blocked: {row.blocked_profile_id}
                      </div>
                      <Meta>{new Date(row.created_at).toLocaleString()}</Meta>
                    </RecordCard>
                  ))
                )}
              </Panel>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RecordCard({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">{children}</div>;
}

function Meta({ children }: { children: ReactNode }) {
  return <div className="mt-3 text-xs text-muted-foreground">{children}</div>;
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
