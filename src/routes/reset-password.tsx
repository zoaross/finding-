import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { supabase } from "@/lib/supabase";
import { evaluatePassword } from "@/lib/passwordStrength";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "重置密码 — Finding." },
      { name: "description", content: "为你的 Finding 账号设置新的密码。" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Wait for Supabase to detect the recovery session from the URL.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const { allPassed } = evaluatePassword(password);
    if (!allPassed) {
      setError("密码不符合安全要求,请按下方清单完善后再试。");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setInfo("密码已重置,正在跳转...");
      setTimeout(() => navigate({ to: "/home" }), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "重置失败,请重试。";
      setError(msg.toLowerCase().includes("session") ? "重置链接已失效,请重新申请。" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StarField />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 20%, oklch(0.45 0.18 295 / 0.35), transparent 60%), radial-gradient(50% 40% at 80% 80%, oklch(0.5 0.18 280 / 0.25), transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--border-strong)] bg-background/60 text-foreground shadow-[var(--shadow-glow)] transition-transform group-hover:scale-105">
            <FindingMark size={28} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Finding<span className="text-accent">.</span>
          </span>
        </Link>
        <Link
          to="/auth"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 返回登录
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-md"
        >
          <div className="glass-card relative overflow-hidden rounded-3xl p-8 shadow-[var(--shadow-card)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

            <div className="mb-7 text-center">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                设置 <span className="text-gradient">新密码</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                请为你的 Finding 账号创建一个安全的新密码。
              </p>
            </div>

            {!ready ? (
              <div className="rounded-xl border border-[var(--border)] bg-background/40 px-4 py-3 text-center text-xs text-muted-foreground">
                正在验证重置链接...
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordField
                  label="新密码"
                  value={password}
                  onChange={setPassword}
                  show={show}
                  setShow={setShow}
                  autoComplete="new-password"
                />

                {password.length > 0 && <PasswordStrength password={password} />}

                <PasswordField
                  label="确认密码"
                  value={confirm}
                  onChange={setConfirm}
                  show={show}
                  setShow={setShow}
                  autoComplete="new-password"
                />

                {error && (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="rounded-xl border border-[var(--border-strong)] bg-accent/10 px-3 py-2 text-xs text-accent-soft">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] disabled:opacity-60"
                >
                  {loading ? "保存中..." : "重置密码"}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (fn: (v: boolean) => boolean) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-[var(--border)] bg-background/50 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          placeholder="至少 8 位"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "隐藏密码" : "显示密码"}
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
