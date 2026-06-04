import { motion } from "framer-motion";
import { IconUser, IconChat, IconTarget } from "@/components/icons/FindingIcons";
import { useLandingLanguage } from "./landingI18n";

function Preview({ kind }: { kind: string }) {
  const { copy } = useLandingLanguage();
  const preview = copy.useCases.preview;

  if (kind === "creators") {
    return (
      <div className="glass-card relative overflow-hidden rounded-3xl p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="text-xs text-muted-foreground">{preview.need}</div>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
            {preview.matches}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {["Visible identity card", "Supply card with proof", "Public profile signal"].map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-xs font-bold">{t[0]}</div>
              <div className="flex-1">
                <div className="text-sm">{t}</div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-[image:var(--gradient-primary)]" style={{ width: `${94 - i * 6}%` }} />
                </div>
              </div>
              <div className="font-display text-sm text-accent">{94 - i * 6}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (kind === "social") {
    return (
      <div className="glass-card relative overflow-hidden rounded-3xl p-5">
        <div className="rounded-2xl bg-muted/30 p-4 text-sm">
          <div className="text-muted-foreground text-xs">{preview.said}</div>
          <div className="mt-1">{preview.socialNeed}</div>
        </div>
        <div className="mt-3 flex items-start justify-end">
          <div className="max-w-[80%] rounded-2xl bg-[image:var(--gradient-primary)] p-4 text-sm text-primary-foreground">
            {preview.socialReply}
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {["A", "K", "J", "+1"].map((c) => (
            <div key={c} className="grid h-9 w-9 place-items-center rounded-full border border-border bg-muted/40 text-xs">{c}</div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="glass-card relative overflow-hidden rounded-3xl p-5">
      <div className="text-xs text-muted-foreground">JD · Senior Product Designer</div>
      <div className="mt-2 font-display text-lg">{preview.scanning}</div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
        {["Berlin", "Lisbon", "Tokyo", "NYC", "São Paulo", "Bali"].map((c, i) => (
          <div key={c} className="rounded-xl border border-border bg-muted/30 p-2">
            <div className="text-muted-foreground">{c}</div>
            <div className="mt-1 font-display text-foreground">{preview.candidates}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
        <span className="text-muted-foreground">{preview.joining}</span>
      </div>
    </div>
  );
}

export function UseCases() {
  const { copy } = useLandingLanguage();
  const icons = [IconUser, IconChat, IconTarget];
  const previews = ["creators", "social", "hiring"];
  const cases = copy.useCases.cases.map(([tag, title, desc], index) => ({
    tag,
    title,
    desc,
    Icon: icons[index],
    preview: previews[index],
  }));

  return (
    <section id="cases" className="relative px-6 py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="glass inline-block rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            {copy.useCases.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-4xl md:text-5xl">
            {copy.useCases.titleA} <span className="text-gradient italic">Finding</span>
          </h2>
        </motion.div>

        <div className="mt-20 space-y-28">
          {cases.map((c, i) => {
            const reverse = i % 2 === 1;
            return (
              <div key={c.title} className={`grid items-center gap-10 md:grid-cols-2 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
                <motion.div
                  initial={{ opacity: 0, x: reverse ? 60 : -60 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                    <c.Icon size={14} className="text-accent" /> {c.tag}
                  </div>
                  <h3 className="mt-5 font-display text-3xl leading-tight md:text-4xl">{c.title}</h3>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{c.desc}</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: reverse ? -60 : 60, scale: 0.95 }}
                  whileInView={{ opacity: 1, x: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <Preview kind={c.preview} />
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
