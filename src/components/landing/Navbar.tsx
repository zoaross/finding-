import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { FindingMark } from "@/components/icons/FindingIcons";
import { useLandingLanguage, type LandingLanguage } from "./landingI18n";

export function Navbar() {
  const { copy, labels, language, setLanguage } = useLandingLanguage();
  const links = [
    { label: copy.nav.how, href: "#how" },
    { label: copy.nav.features, href: "#features" },
    { label: copy.nav.stories, href: "#stories" },
    { label: copy.nav.about, href: "#about" },
  ];

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="glass flex w-full max-w-6xl items-center justify-between rounded-full px-5 py-2.5">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border-strong)] bg-background/60 text-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
            <FindingMark size={28} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Finding<span className="text-accent">.</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-border bg-muted/30 p-1 md:flex">
            {(Object.keys(labels) as LandingLanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                aria-label={`${copy.nav.language}: ${labels[code]}`}
                className={`rounded-full px-2.5 py-1 text-xs transition ${
                  language === code
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {code === "zh" ? "中文" : code === "ko" ? "한국어" : "EN"}
              </button>
            ))}
          </div>
          <Link
            to="/auth"
            className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:inline-block"
          >
            {copy.nav.signIn}
          </Link>
          <Link
            to="/auth"
            className="group relative inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)]"
          >
            {copy.nav.start}
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
