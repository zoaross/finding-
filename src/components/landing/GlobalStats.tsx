import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useLandingLanguage } from "./landingI18n";

function AnimatedNumber({ to, suffix = "", decimals = 0, duration = 2200 }: { to: number; suffix?: string; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  const display = decimals > 0 ? n.toFixed(decimals) : Math.floor(n).toLocaleString();
  return <span ref={ref}>{display}{suffix}</span>;
}

export function GlobalStats() {
  const { copy } = useLandingLanguage();
  const stats = [
    { value: 8243751, label: copy.global.stats[0], suffix: "" },
    { value: 195, label: copy.global.stats[1], suffix: "" },
    { value: 78.6, label: copy.global.stats[2], suffix: "", decimals: 1 },
  ];

  return (
    <section className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card relative overflow-hidden rounded-[2rem] px-8 py-16 md:px-16"
        >
          {/* Subtle grid background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
            }}
          />
          <div className="absolute inset-0 bg-radial-purple opacity-50" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative text-center"
          >
            <span className="glass inline-block rounded-full px-4 py-1.5 text-xs text-muted-foreground">
              {copy.global.eyebrow}
            </span>
            <h2 className="mt-5 font-display text-4xl md:text-5xl">
              {copy.global.titleA} <span className="text-gradient italic">{copy.global.titleB}</span>
            </h2>
          </motion.div>

          <div className="relative mt-14 grid gap-10 md:grid-cols-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="text-center"
              >
                <div className="font-display text-5xl font-bold text-gradient md:text-7xl">
                  <AnimatedNumber to={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </div>
                <div className="mt-3 text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
