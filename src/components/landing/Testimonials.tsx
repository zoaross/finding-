import { motion } from "framer-motion";

const items = [
  {
    quote: "生产界面只显示真实登录用户创建、保存或匹配出来的数据。",
    name: "Real data",
    role: "Supabase source",
    tag: "数据源",
  },
  {
    quote: "模拟资料只允许在显式测试模式中出现，默认生产模式全部过滤。",
    name: "Seed filter",
    role: "TEST_MODE=false",
    tag: "过滤",
  },
  {
    quote: "Saved、Matches、Messages 都必须从统一 Supabase 数据链路读取。",
    name: "Unified source",
    role: "No fallback UI",
    tag: "一致性",
  },
];

export function Testimonials() {
  return (
    <section className="relative px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="glass inline-block rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            Stories
          </span>
          <h2 className="mt-5 font-display text-4xl md:text-5xl">
            被匹配的<span className="text-gradient italic">真实故事</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass-card hover-lift flex h-full flex-col rounded-3xl p-7"
            >
              <span className="self-start rounded-full border border-border bg-muted/30 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.tag}
              </span>
              <blockquote className="mt-5 flex-1 text-base leading-relaxed text-foreground/90">
                <span className="font-display text-3xl text-accent">“</span>
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--gradient-primary)] font-display text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
