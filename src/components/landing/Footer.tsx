import { FindingMark, IconX, IconGithub, IconLinkedin, IconDiscord } from "@/components/icons/FindingIcons";
import { useLandingLanguage } from "./landingI18n";

export function Footer() {
  const { copy } = useLandingLanguage();
  const cols = copy.footer.cols.map(([title, links]) => ({ title, links }));

  return (
    <footer className="relative border-t border-border bg-background/60 px-6 pt-20 pb-10 backdrop-blur">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-2.5">
            <FindingMark size={36} className="text-foreground" />
            <span className="font-display text-2xl font-extrabold tracking-tight">
              Finding<span className="text-accent">.</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {copy.footer.desc}
          </p>
          <div className="mt-6 flex items-center gap-2">
            {[IconX, IconGithub, IconLinkedin, IconDiscord].map((Ic, i) => (
              <a
                key={i}
                href="#"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-muted/30 text-muted-foreground transition-all hover:border-[var(--border-strong)] hover:text-foreground"
              >
                <Ic size={15} />
              </a>
            ))}
          </div>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <div className="font-display text-sm font-bold">{col.title}</div>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
        <div>© 2026 Finding. All rights reserved.</div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-foreground">{copy.footer.privacy}</a>
          <a href="#" className="hover:text-foreground">{copy.footer.terms}</a>
          <a href="#" className="hover:text-foreground">Cookies</a>
        </div>
      </div>
    </footer>
  );
}
