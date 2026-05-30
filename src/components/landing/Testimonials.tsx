import { motion } from "framer-motion";

const items = [
  {
    quote: "我只是写了句『想找个会日语的设计师合作小说封面』，48 小时后真的接到了三个人的私信。",
    name: "林子衿",
    role: "独立作者 · 上海",
    tag: "创作合作",
  },
  {
    quote: "找供应商不再翻遍展会名片。AI 直接把我的需求翻成英文匹配到德国工厂，省了一个月。",
    name: "Marcus Chen",
    role: "外贸创业者 · 深圳",
    tag: "B2B 采购",
  },
  {
    quote: "想学冲浪、想找搭子、想交换技能 —— 一句话扔进去就行，比社群高效太多。",
    name: "Aiko Tanaka",
    role: "数字游民 · 巴厘岛",
    tag: "生活兴趣",
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
