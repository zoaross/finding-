import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { IconSearch } from "@/components/icons/FindingIcons";
import { openOrCreateConversation } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { mockNeeds, type NeedItem } from "@/routes/discover";

export type SearchUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  tags: string[];
};

export type SearchNeed = {
  id: string;
  content: string;
  tags: string[];
  posterId?: string | null;
  posterName: string;
  posterInitial: string;
  posterAvatar?: string | null;
};

type Props = {
  placeholder?: string;
  /** Optional callback so the host page can react to query changes (e.g. filter list). */
  onQueryChange?: (q: string) => void;
  /** Initial value for controlled scenarios. */
  initialValue?: string;
  className?: string;
};

const DEFAULT_PLACEHOLDER = "搜索用户、需求或标签...";

// Derive identity-card style tags from a profile's free-text fields.
function deriveProfileTags(p: { bio: string | null; location: string | null }): string[] {
  const out = new Set<string>();
  const text = `${p.bio ?? ""} ${p.location ?? ""}`;
  const rules: { re: RegExp; tag: string }[] = [
    { re: /(设计|design|ui|ux)/i, tag: "设计" },
    { re: /(开发|工程师|developer|engineer|前端|后端|frontend|backend)/i, tag: "技术" },
    { re: /(摄影|photo)/i, tag: "摄影" },
    { re: /(音乐|music|乐队)/i, tag: "音乐" },
    { re: /(投资|vc|融资)/i, tag: "投资人" },
    { re: /(营销|增长|marketing|growth)/i, tag: "营销" },
    { re: /(翻译|translator)/i, tag: "翻译" },
    { re: /(ai|人工智能|llm|gpt)/i, tag: "AI" },
    { re: /(远程|remote)/i, tag: "远程" },
  ];
  for (const r of rules) if (r.re.test(text)) out.add(r.tag);
  if (p.location) out.add(p.location.split(/[, ，]/)[0]);
  return Array.from(out).slice(0, 3);
}

function matches(q: string, fields: (string | null | undefined)[], tags: string[] = []) {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  for (const f of fields) if (f && f.toLowerCase().includes(needle)) return true;
  for (const t of tags) if (t.toLowerCase().includes(needle)) return true;
  return false;
}

export function SearchDropdown({
  placeholder = DEFAULT_PLACEHOLDER,
  onQueryChange,
  initialValue = "",
  className = "",
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<SearchUser[]>([]);
  const [dbNeeds, setDbNeeds] = useState<SearchNeed[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Notify parent on query change
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  // Load all profiles + recent needs once on mount (small dataset, client-side filter)
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: pData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, location")
        .limit(200);
      if (alive && pData) {
        setProfiles(
          (
            pData as Array<{
              id: string;
              username: string | null;
              avatar_url: string | null;
              bio: string | null;
              location: string | null;
            }>
          )
            .filter((p) => p.username)
            .map((p) => ({
              id: p.id,
              username: p.username!,
              avatar_url: p.avatar_url,
              bio: p.bio,
              location: p.location,
              tags: deriveProfileTags(p),
            })),
        );
      }

      const { data: nData } = await supabase
        .from("needs")
        .select("id, content, user_id, parsed_intent")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(100);
      if (alive && nData) {
        const rows = nData as Array<{
          id: string;
          content: string;
          user_id: string;
          parsed_intent: { tags?: string[] } | null;
        }>;
        // Build a lookup of user_id -> username from already-loaded profiles
        const byId = new Map<string, { username: string; avatar_url: string | null }>();
        for (const p of pData ?? []) {
          const row = p as { id: string; username: string | null; avatar_url: string | null };
          if (row.username)
            byId.set(row.id, { username: row.username, avatar_url: row.avatar_url });
        }
        setDbNeeds(
          rows.map((n) => {
            const owner = byId.get(n.user_id);
            const name = owner?.username || "匿名";
            return {
              id: n.id,
              content: n.content,
              tags: Array.isArray(n.parsed_intent?.tags) ? n.parsed_intent!.tags! : [],
              posterId: n.user_id,
              posterName: name,
              posterInitial: name.charAt(0).toUpperCase(),
              posterAvatar: owner?.avatar_url ?? null,
            };
          }),
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { userResults, needResults } = useMemo(() => {
    const q = query.trim();
    if (!q) return { userResults: [] as SearchUser[], needResults: [] as SearchNeed[] };

    const userResults = profiles
      .filter((p) => matches(q, [p.username, p.bio, p.location], p.tags))
      .slice(0, 6);

    const fromDb = dbNeeds.filter((n) => matches(q, [n.content, n.posterName], n.tags));
    const fromMock: SearchNeed[] = (mockNeeds as NeedItem[])
      .filter((n) => matches(q, [n.content, n.name, n.city], n.tags))
      .map((n) => ({
        id: `mock:${n.id}`,
        content: n.content,
        tags: n.tags,
        posterId: undefined,
        posterName: n.name,
        posterInitial: n.emoji,
      }));
    const needResults = [...fromDb, ...fromMock].slice(0, 6);

    return { userResults, needResults };
  }, [query, profiles, dbNeeds]);

  const empty = open && query.trim() && userResults.length === 0 && needResults.length === 0;

  const goUser = (u: SearchUser) => {
    setOpen(false);
    navigate({ to: "/user/$username", params: { username: u.username } });
  };

  const startContact = async (u: SearchUser) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      await openOrCreateConversation(currentUser.id, {
        userId: u.id,
        username: u.username,
        displayName: u.username,
        matchTag: u.tags[0] || "Profile match",
      });
      toast.success(`已为你打开与 ${u.username} 的对话`);
      setOpen(false);
      navigate({ to: "/messages" });
    } catch (error) {
      toast.error("无法创建对话", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const helpWith = async (n: SearchNeed) => {
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      return;
    }
    try {
      await openOrCreateConversation(currentUser.id, {
        userId: n.posterId,
        username: n.posterName,
        displayName: n.posterName,
        needId: n.id.startsWith("mock:") ? null : n.id,
        matchTag: n.tags[0] || "Need match",
      });
      toast.success(`已联系 ${n.posterName},告诉 TA 你能帮忙`);
      setOpen(false);
      navigate({ to: "/messages" });
    } catch (error) {
      toast.error("无法创建对话", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="glass-card flex items-center gap-2 rounded-3xl p-4">
        <IconSearch size={18} className="text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!query.trim()) {
              toast.info("输入关键词,搜索用户与需求");
              return;
            }
            setOpen(true);
          }}
          className="group inline-flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-xs font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.03]"
        >
          <span className="text-accent-soft">✦</span> 搜索
        </button>
      </div>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="glass-card absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[70vh] overflow-y-auto rounded-2xl p-2 shadow-2xl"
          >
            {empty && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                没有找到相关结果
              </div>
            )}

            {userResults.length > 0 && (
              <div className="mb-1">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  用户 · {userResults.length}
                </div>
                <ul className="flex flex-col gap-1">
                  {userResults.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-[var(--border)] hover:bg-white/[0.03]"
                    >
                      <button
                        type="button"
                        onClick={() => goUser(u)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.username}
                            className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-[var(--border-strong)]"
                          />
                        ) : (
                          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{u.username}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            {u.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-accent-soft"
                              >
                                #{t}
                              </span>
                            ))}
                            {u.location && <span className="truncate">📍 {u.location}</span>}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => goUser(u)}
                          className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
                        >
                          查看主页
                        </button>
                        <button
                          type="button"
                          onClick={() => startContact(u)}
                          className="rounded-full bg-[image:var(--gradient-primary)] px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-[var(--shadow-glow)]"
                        >
                          发起联系
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {needResults.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  需求 · {needResults.length}
                </div>
                <ul className="flex flex-col gap-1">
                  {needResults.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-[var(--border)] hover:bg-white/[0.03]"
                    >
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-base text-primary-foreground">
                        {n.posterInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm leading-snug">{n.content}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground/80">{n.posterName}</span>
                          {n.tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-border bg-white/[0.03] px-1.5 py-0.5"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => helpWith(n)}
                        className="flex-shrink-0 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/25"
                      >
                        我能帮忙 →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
