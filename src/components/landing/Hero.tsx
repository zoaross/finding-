import { motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { FloatingShapes } from "./FloatingShapes";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { FindingMark } from "@/components/icons/FindingIcons";
import { useLandingLanguage } from "./landingI18n";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] as const },
  }),
};

function CountUp({ to, suffix = "", duration = 1800 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n.toLocaleString()}{suffix}</>;
}

export function Hero() {
  const { x, y } = useMouseParallax();
  const { copy } = useLandingLanguage();
  const stats = [
    { label: copy.hero.stats[0], value: <><CountUp to={10} />K+</> },
    { label: copy.hero.stats[1], value: <><CountUp to={98} />%</> },
    { label: copy.hero.stats[2], value: <><CountUp to={50} />+</> },
    { label: copy.hero.stats[3], value: "∞" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-20 text-center">
      <FloatingShapes />

      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="glass relative z-10 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-muted-foreground">
          {copy.hero.livePrefix}{" "}
          <span className="font-semibold text-foreground">8,243,751</span>{" "}
          {copy.hero.liveSuffix}
        </span>
      </motion.div>

      {/* Wordmark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ transform: `translate3d(${x * -10}px, ${y * -10}px, 0)` }}
        className="relative z-10 mt-10"
      >
        <h1 className="font-display text-[20vw] leading-[0.9] font-extrabold tracking-[-0.05em] md:text-[12rem]">
          <span className="text-gradient animate-gradient-shift drop-shadow-[0_0_80px_oklch(0.72_0.18_295/0.6)]">
            Finding
          </span>
          <span className="text-accent">.</span>
        </h1>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 mx-auto h-full max-w-[80%] bg-[image:var(--gradient-primary)] opacity-30 blur-[100px]"
        />
      </motion.div>

      <motion.h2
        custom={2}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative z-10 mt-6 max-w-4xl font-display text-3xl leading-[1.15] tracking-tight md:text-5xl"
      >
        {copy.hero.titleA} <span className="text-gradient italic">{copy.hero.titleB}</span>
      </motion.h2>

      <motion.p
        custom={3}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative z-10 mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
      >
        {copy.hero.bodyA}
        <span className="block text-foreground/70">{copy.hero.bodyB}</span>
      </motion.p>

      <motion.div
        custom={4}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative z-10 mt-10 flex flex-col items-center gap-3 sm:flex-row"
      >
        <a
          href="#cta"
          className="group inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-7 py-3.5 font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:scale-[1.02] hover:shadow-[var(--shadow-glow-lg)]"
        >
          <FindingMark size={18} className="text-primary-foreground" /> {copy.hero.primary}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </a>
        <a
          href="#how"
          className="glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium transition-all hover:border-[var(--border-strong)] hover:bg-white/5"
        >
          {copy.hero.secondary}
        </a>
      </motion.div>

      <motion.div
        custom={5}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        className="relative z-10 mt-20 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border md:grid-cols-4"
      >
        {stats.map((s) => (
          <div key={s.label} className="bg-background/60 px-6 py-7 backdrop-blur">
            <div className="font-display text-3xl font-bold text-gradient md:text-4xl">
              {s.value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
