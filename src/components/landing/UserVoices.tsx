import { motion } from "framer-motion";
import { useLandingLanguage } from "./landingI18n";

const flags = ["🇨🇳", "🇯🇵", "🇩🇪", "🇲🇽", "🇦🇪", "🇰🇷"];

export function UserVoices() {
  const { copy } = useLandingLanguage();
  const voices = copy.voices.items.map(([signal, context, note], index) => ({
    signal,
    context,
    note,
    flag: flags[index],
  }));

  return (
    <section id="stories" className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="glass inline-block rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            {copy.voices.eyebrow}
          </span>
          <h2 className="mt-5 font-display text-4xl md:text-5xl">
            {copy.voices.titleA}<span className="text-gradient italic"> {copy.voices.titleB}</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {voices.map((v, i) => (
            <motion.figure
              key={v.signal}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
              className="glass-card hover-lift flex flex-col rounded-3xl p-6"
            >
              <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                <span className="mr-1 font-display text-2xl text-accent">“</span>
                {v.note}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] font-display text-xs font-bold">
                  {v.signal[0]}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{v.signal}</div>
                  <div className="text-xs text-muted-foreground">{v.context}</div>
                </div>
                <span className="text-lg" aria-hidden>{v.flag}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
