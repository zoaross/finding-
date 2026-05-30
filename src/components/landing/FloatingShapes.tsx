import { motion } from "framer-motion";
import { useMouseParallax } from "@/hooks/useMouseParallax";

const shapes = [
  { size: 180, top: "10%", left: "8%", depth: 30, blur: 0, gradient: "from-primary/30 to-accent/10", shape: "circle", delay: 0 },
  { size: 120, top: "20%", right: "12%", depth: 50, blur: 0, gradient: "from-accent/40 to-primary/10", shape: "square", delay: 0.4 },
  { size: 90, bottom: "20%", left: "15%", depth: 40, blur: 0, gradient: "from-primary-glow/30 to-transparent", shape: "triangle", delay: 0.8 },
  { size: 220, bottom: "10%", right: "8%", depth: 25, blur: 60, gradient: "from-primary/40 to-accent/20", shape: "circle", delay: 0.2 },
  { size: 60, top: "55%", left: "45%", depth: 70, blur: 0, gradient: "from-accent-soft/40 to-transparent", shape: "circle", delay: 1.2 },
];

export function FloatingShapes() {
  const { x, y } = useMouseParallax();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {shapes.map((s, i) => {
        const tx = -x * s.depth;
        const ty = -y * s.depth;
        const style: React.CSSProperties = {
          width: s.size,
          height: s.size,
          top: s.top,
          left: s.left,
          right: s.right,
          bottom: s.bottom,
          filter: s.blur ? `blur(${s.blur}px)` : undefined,
        };
        return (
          <motion.div
            key={i}
            style={style}
            className="absolute"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: tx,
              y: ty,
            }}
            transition={{
              opacity: { duration: 1, delay: s.delay },
              scale: { duration: 1, delay: s.delay },
              x: { type: "spring", stiffness: 40, damping: 20 },
              y: { type: "spring", stiffness: 40, damping: 20 },
            }}
          >
            <motion.div
              animate={{ y: [0, -18, 0], rotate: s.shape === "square" ? [0, 8, 0] : 0 }}
              transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut" }}
              className={`h-full w-full bg-gradient-to-br ${s.gradient} ${
                s.shape === "circle" ? "rounded-full" : s.shape === "square" ? "rounded-3xl rotate-12" : "rounded-2xl"
              } border border-white/10 backdrop-blur-sm`}
              style={s.shape === "triangle" ? { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: 0, border: "none" } : undefined}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
