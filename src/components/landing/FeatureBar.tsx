import { motion } from "framer-motion";
import { IconTarget, IconGlobe, IconInfinity, IconShield } from "@/components/icons/FindingIcons";
import { useLandingLanguage } from "./landingI18n";

export function FeatureBar() {
  const { copy } = useLandingLanguage();
  const icons = [IconTarget, IconGlobe, IconInfinity, IconShield];
  const features = copy.features.map(([title, desc], index) => ({
    Icon: icons[index],
    title,
    desc,
  }));

  return (
    <section id="features" className="relative border-t border-border px-6 py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 md:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group flex items-start gap-3"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border bg-muted/40 text-foreground/90 transition-all group-hover:border-[var(--border-strong)] group-hover:text-accent group-hover:shadow-[var(--shadow-glow)]">
              <f.Icon size={20} />
            </span>
            <div>
              <div className="font-display text-sm font-bold">{f.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{f.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
