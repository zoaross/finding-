import { motion } from "framer-motion";
import { useLandingLanguage } from "./landingI18n";

export function CtaSection() {
  const { copy } = useLandingLanguage();

  return (
    <section id="cta" className="relative px-6 py-28">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="glass-card relative overflow-hidden rounded-[2.5rem] px-8 py-20 text-center md:px-16"
        >
          <div className="absolute inset-0 bg-radial-purple" />
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-accent/30 blur-[120px]" />

          <div className="relative">
            <h2 className="font-display text-5xl leading-[1.1] md:text-7xl">
              {copy.cta.titleA}<br />
              <span className="text-gradient italic">{copy.cta.titleB}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              {copy.cta.desc}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#"
                className="group inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-8 py-4 font-medium text-primary-foreground shadow-[var(--shadow-glow-lg)] transition-all hover:scale-[1.03]"
              >
                <span className="text-accent-soft">✦</span> {copy.cta.primary}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#how"
                className="glass inline-flex items-center gap-2 rounded-full px-8 py-4 font-medium transition-all hover:border-[var(--border-strong)]"
              >
                {copy.cta.secondary}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
