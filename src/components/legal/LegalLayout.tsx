import { Link, useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";

export function LegalLayout({
  title,
  subtitle,
  updatedAt,
  children,
}: {
  title: string;
  subtitle?: string;
  updatedAt?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StarField />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 10%, oklch(0.45 0.18 295 / 0.28), transparent 60%), radial-gradient(50% 40% at 80% 80%, oklch(0.5 0.18 280 / 0.2), transparent 60%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border-strong)] bg-background/60 text-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
            <FindingMark size={28} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Finding<span className="text-accent">.</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-background/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <ArrowLeft size={14} />
          返回
        </button>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              {title.split(" ").map((w, i) =>
                i === title.split(" ").length - 1 ? (
                  <span key={i} className="text-gradient">
                    {w}
                  </span>
                ) : (
                  <span key={i}>{w} </span>
                ),
              )}
            </h1>
            {subtitle && (
              <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>
            )}
            {updatedAt && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                最后更新:{updatedAt}
              </p>
            )}
          </div>

          <article className="glass-card rounded-3xl p-8 shadow-[var(--shadow-card)] md:p-10">
            <div className="legal-prose space-y-7 text-sm leading-relaxed text-foreground/90">
              {children}
            </div>
          </article>

          <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">
              服务条款
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              隐私政策
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold tracking-tight text-foreground">
        <span className="mr-2 text-accent">{number}.</span>
        {title}
      </h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}
