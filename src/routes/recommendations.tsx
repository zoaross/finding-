import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { StarField } from "@/components/StarField";
import { openOrCreateConversation } from "@/lib/chat";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/recommendations")({
  component: RecommendationsPage,
  head: () => ({
    meta: [
      { title: "为你推荐 — Finding." },
      { name: "description", content: "AI 为你智能推荐的全球协作伙伴。" },
    ],
  }),
});

const all = [
  {
    id: "10000000-0000-0000-0000-000000000004",
    username: "yui_designs",
    name: "Mika Sato",
    title: "AI 翻译协作伙伴",
    region: "🇯🇵 大阪",
    match: 96,
    emoji: "🌸",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    username: "minjun_backend",
    name: "James O'Neil",
    title: "海外市场调研",
    region: "🇨🇦 多伦多",
    match: 89,
    emoji: "📊",
  },
  {
    id: "10000000-0000-0000-0000-000000000001",
    username: "hana_seoul",
    name: "Linh Nguyen",
    title: "跨境电商运营",
    region: "🇻🇳 胡志明",
    match: 84,
    emoji: "🛍️",
  },
];

function RecommendationsPage() {
  const navigate = useNavigate();
  const openChat = async (person: (typeof all)[number]) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      const conversationId = await openOrCreateConversation({
        partnerId: person.id,
        partnerUsername: person.username,
        partnerName: person.username,
        matchTag: person.title,
      });
      toast.success(`已为你打开与 ${person.name} 的对话`);
      navigate({ to: "/messages", search: { conversationId } });
    } catch (error) {
      toast.error("无法创建对话", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField />
      <div className="pointer-events-none fixed inset-0 bg-radial-purple opacity-60" />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10">
        <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">
          ← 返回首页
        </Link>
        <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight">
          <span className="text-gradient">为你推荐</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          基于你的需求与兴趣,AI 智能匹配的全球伙伴
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {all.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-xl text-primary-foreground">
                  {r.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate font-semibold">{r.name}</p>
                    <span className="rounded-full bg-[image:var(--gradient-primary)] px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {r.match}%
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{r.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground/70">{r.region}</p>
                </div>
              </div>
              <button
                onClick={() => void openChat(r)}
                className="mt-3 w-full rounded-lg border border-accent/30 bg-accent/10 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20 active:scale-[0.98]"
              >
                联系 →
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
