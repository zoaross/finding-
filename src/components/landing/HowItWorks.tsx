import { motion } from "framer-motion";
import { IconPencil, IconTarget, IconChat } from "@/components/icons/FindingIcons";
import { useLandingLanguage } from "./landingI18n";

export function HowItWorks() {
  const { copy } = useLandingLanguage();
  const icons = [IconPencil, IconTarget, IconChat];
  const steps = copy.how.steps.map(([title, desc], index) => ({
    n: `0${index + 1}`,
    Icon: icons[index],
    title,
    desc,
  }));

  return (
    <section id="how" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="glass inline-block rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            {copy.how.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-4xl md:text-5xl">
            {copy.how.titleA} <span className="text-gradient italic">{copy.how.titleB}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            {copy.how.desc}
          </p>
        </motion.div>

        <div className="relative mt-20">
          {/* Animated connecting line (desktop) */}
          <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-12 hidden md:block">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ transformOrigin: "left" }}
              className="h-px w-full bg-[linear-gradient(90deg,transparent,oklch(0.72_0.18_295/0.6),transparent)]"
            />
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="glass-card hover-lift relative overflow-hidden rounded-3xl p-7"
              >
                <div className="absolute -right-6 -top-6 font-display text-8xl font-bold text-white/[0.04]">
                  {s.n}
                </div>
                <div className="relative">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[image:var(--gradient-primary)]/10 text-accent shadow-[var(--shadow-glow)]">
                    <s.Icon size={26} />
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-display text-accent">{s.n}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <h3 className="mt-2 font-display text-xl">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
