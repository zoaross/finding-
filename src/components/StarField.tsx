import { useEffect, useRef } from "react";

/**
 * Animated star particle background.
 * Canvas-based for smooth perf. Auto-resizes.
 */
export function StarField({ density = 1, showNebula = true }: { density?: number; showNebula?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stars: { x: number; y: number; z: number; r: number; tw: number }[] = [];
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const init = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);

      const count = Math.floor((window.innerWidth * window.innerHeight) / 6000) * density;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: Math.random() * 0.8 + 0.2,
        r: Math.random() * 1.4 + 0.2,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        s.tw += 0.02 * s.z;
        s.y -= 0.05 * s.z;
        if (s.y < 0) s.y = h;
        const alpha = 0.3 + Math.abs(Math.sin(s.tw)) * 0.7 * s.z;
        ctx.fillStyle = `rgba(${200 + Math.floor(s.z * 55)}, ${190 + Math.floor(s.z * 50)}, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }

      // occasional shooting star
      if (!shooting && Math.random() < 0.002) {
        shooting = {
          x: Math.random() * w * 0.6,
          y: Math.random() * h * 0.4,
          vx: 6 + Math.random() * 4,
          vy: 2 + Math.random() * 2,
          life: 1,
        };
      }
      if (shooting) {
        ctx.strokeStyle = `rgba(196, 181, 253, ${shooting.life})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(shooting.x, shooting.y);
        ctx.lineTo(shooting.x - shooting.vx * 8, shooting.y - shooting.vy * 8);
        ctx.stroke();
        shooting.x += shooting.vx;
        shooting.y += shooting.vy;
        shooting.life -= 0.015;
        if (shooting.life <= 0 || shooting.x > w) shooting = null;
      }

      raf = requestAnimationFrame(draw);
    };

    init();
    raf = requestAnimationFrame(draw);
    const onResize = () => init();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [density]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {showNebula && (
        <>
          <div
            className="absolute -top-1/4 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.45 0.2 295 / 0.5), transparent 60%)",
            }}
          />
          <div
            className="absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.5 0.2 250 / 0.45), transparent 60%)",
            }}
          />
          <div
            className="absolute bottom-0 -right-40 h-[600px] w-[600px] rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, oklch(0.5 0.2 320 / 0.4), transparent 60%)",
            }}
          />
        </>
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
