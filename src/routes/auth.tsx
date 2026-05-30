import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { StarField } from "@/components/StarField";
import { FindingMark } from "@/components/icons/FindingIcons";
import { useMouseParallax } from "@/hooks/useMouseParallax";
import { supabase } from "@/lib/supabase";
import { evaluatePassword } from "@/lib/passwordStrength";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import {
  UI_LANG_CHANGED_EVENT,
  UI_LANG_KEY,
  translateUiString,
  type MvpLanguageCode,
} from "@/lib/i18n";
import {
  useStandaloneLandingLanguage,
  type LandingLanguage,
} from "@/components/landing/landingI18n";
import { saveUserSettings } from "@/lib/socialActions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in / Sign up — Finding." },
      { name: "description", content: "Sign in to Finding and continue your global matches." },
    ],
  }),
});

type Mode = "login" | "signup";

const LOGIN_ATTEMPTS_KEY = "finding.loginAttempts.v1";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type AttemptRecord = { count: number; firstAt: number };

function readAttempts(): AttemptRecord {
  if (typeof window === "undefined") return { count: 0, firstAt: 0 };
  try {
    const raw = window.localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!raw) return { count: 0, firstAt: 0 };
    const parsed = JSON.parse(raw) as AttemptRecord;
    if (Date.now() - parsed.firstAt > LOCKOUT_WINDOW_MS) return { count: 0, firstAt: 0 };
    return parsed;
  } catch {
    return { count: 0, firstAt: 0 };
  }
}

function writeAttempts(rec: AttemptRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(rec));
  } catch {
    // Auth must keep working even when embedded browsers disable localStorage.
  }
}

function clearAttempts() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage?.removeItem(LOGIN_ATTEMPTS_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function translateAuthError(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return t("auth.errInvalidLogin");
  if (m.includes("user already registered")) return t("auth.errAlreadyRegistered");
  if (m.includes("password should be at least")) return t("auth.errPasswordShort");
  if (m.includes("email not confirmed")) return t("auth.errEmailNotConfirmed");
  if (m.includes("rate limit")) return t("auth.errRateLimit");
  if (m.includes("user not found") || m.includes("no user")) return t("auth.errUserNotFound");
  return msg;
}

function AuthPage() {
  const navigate = useNavigate();
  const {
    language: publicLanguage,
    setLanguage: setPublicLanguage,
    labels: publicLanguageLabels,
  } = useStandaloneLandingLanguage();
  const t = (key: string, params?: Record<string, string | number>) =>
    translateUiString(publicLanguage, key, params);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const parallax = useMouseParallax();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "login") {
      const attempts = readAttempts();
      if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        setError(t("auth.errTooManyAttempts"));
        return;
      }
    }

    if (mode === "signup") {
      const birthday = new Date(`${birthDate}T00:00:00`);
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      if (!birthDate || Number.isNaN(birthday.getTime())) {
        setError(t("auth.errBirthDateRequired"));
        return;
      }
      if (birthday > eighteenYearsAgo || !adultConfirmed) {
        setError(t("auth.errAdultOnly"));
        return;
      }
      const { allPassed } = evaluatePassword(password);
      if (!allPassed) {
        setError(t("auth.errPasswordRules"));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        clearAttempts();
        navigate({ to: "/home" });
      } else {
        const initialAppLanguage = publicLanguage as MvpLanguageCode;
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: {
              display_name: name || email.split("@")[0],
              birth_date: birthDate,
              is_adult_verified: true,
              app_language: initialAppLanguage,
              translation_language: initialAppLanguage,
            },
          },
        });
        if (err) throw err;
        try {
          window.localStorage.setItem(UI_LANG_KEY, initialAppLanguage);
          window.dispatchEvent(new CustomEvent(UI_LANG_CHANGED_EVENT, { detail: initialAppLanguage }));
        } catch {
          // Initial app language still travels through auth metadata.
        }
        if (data.session?.user?.id) {
          await saveUserSettings(data.session.user.id, {
            app_language: initialAppLanguage,
            translation_language: initialAppLanguage,
          }).catch(() => {
            // Email-confirmation projects may not allow settings writes until the session is active.
          });
        }
        if (data.session) {
          navigate({ to: "/home" });
        } else {
          setInfo(t("auth.signupSuccess"));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.errUnknown");
      if (mode === "login") {
        const prev = readAttempts();
        const next: AttemptRecord = {
          count: prev.count + 1,
          firstAt: prev.firstAt || Date.now(),
        };
        writeAttempts(next);
        if (next.count >= MAX_LOGIN_ATTEMPTS) {
          setError(t("auth.errTooManyAttempts"));
        } else {
          setError(translateAuthError(msg, t));
        }
      } else {
        setError(translateAuthError(msg, t));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setInfo(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
    if (err) setError(translateAuthError(err.message, t));
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotEmail.trim()) {
      setForgotMsg({ type: "err", text: t("auth.errEmailRequired") });
      return;
    }
    setForgotLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setForgotMsg({ type: "ok", text: t("auth.resetSent") });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("auth.errSendFailed");
      setForgotMsg({ type: "err", text: translateAuthError(msg, t) });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StarField />

      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 20%, oklch(0.45 0.18 295 / 0.35), transparent 60%), radial-gradient(50% 40% at 80% 80%, oklch(0.5 0.18 280 / 0.25), transparent 60%)",
        }}
      />

      {/* Floating geometric shapes */}
      <FloatingAuthShapes parallax={parallax} />

      {/* Top bar */}
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
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("auth.backHome")}
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex min-h-[calc(100vh-88px)] items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="glass-card relative overflow-hidden rounded-3xl p-8 shadow-[var(--shadow-card)]">
            {/* Top gradient seam */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

            {/* Heading */}
            <div className="mb-7 text-center">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <h1 className="font-display text-3xl font-extrabold tracking-tight">
                  {mode === "login" ? (
                    <>
                      {t("auth.welcomeBack")} <span className="text-gradient">Finding.</span>
                    </>
                  ) : (
                    <>
                      {t("auth.joinFinding")} <span className="text-gradient">Finding.</span>
                    </>
                  )}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "login" ? t("auth.continueLogin") : t("auth.signupTagline")}
                </p>
              </motion.div>
            </div>

            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 rounded-full border border-[var(--border)] bg-background/40 p-1 text-sm">
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className="relative rounded-full px-4 py-2 font-medium transition-colors"
                >
                  {mode === m && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="absolute inset-0 rounded-full bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span
                    className={`relative ${
                      mode === m ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {m === "login" ? t("auth.tabLogin") : t("auth.tabSignup")}
                  </span>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "signup" && (
                  <motion.div
                    key="name"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Field
                      label={t("auth.nameLabel")}
                      type="text"
                      placeholder={t("auth.namePlaceholder")}
                      value={name}
                      onChange={setName}
                      autoComplete="name"
                    />
                    <div className="mt-4">
                      <Field
                        label={t("auth.birthDateLabel")}
                        type="date"
                        placeholder=""
                        value={birthDate}
                        onChange={setBirthDate}
                        autoComplete="bday"
                      />
                      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={adultConfirmed}
                          onChange={(event) => setAdultConfirmed(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border border-[var(--border-strong)] bg-background/50 accent-[oklch(0.62_0.2_295)]"
                        />
                        <span>{t("auth.adultConfirm")}</span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                label={t("auth.emailLabel")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
                label={t("auth.passwordLabel")}
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={setPassword}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              {mode === "signup" && password.length > 0 && (
                <PasswordStrength password={password} translate={t} />
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded border border-[var(--border-strong)] bg-background/50 accent-[oklch(0.62_0.2_295)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    />
                    <span>{t("auth.rememberMe")}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotMsg(null);
                      setForgotOpen(true);
                    }}
                    className="text-xs text-muted-foreground transition-colors hover:text-accent"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {error}
                </motion.div>
              )}

              {info && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[var(--border-strong)] bg-accent/10 px-3 py-2 text-xs text-accent-soft"
                >
                  {info}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    {t("auth.processing")}
                  </span>
                ) : (
                  <>
                    {mode === "login" ? t("auth.tabLogin") : t("auth.createAccount")}
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {/* Social */}
            <button
              type="button"
              onClick={handleGoogle}
              className="hover-lift inline-flex w-full items-center justify-center gap-3 rounded-full border border-[var(--border)] bg-background/40 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            >
              <GoogleGlyph />
              {t("auth.continueGoogle")}
            </button>

            {/* Footer line */}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {mode === "login" ? `${t("auth.noAccount")} ` : `${t("auth.haveAccount")} `}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-medium text-accent transition-colors hover:text-accent-soft"
              >
                {mode === "login" ? t("auth.goSignup") : t("auth.goLogin")}
              </button>
            </p>
          </div>

          {/* Legal */}
          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
            {t("auth.legalPrefix")}{" "}
            <Link to="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
              {t("auth.terms")}
            </Link>{" "}
            {t("auth.legalAnd")}{" "}
            <Link
              to="/privacy"
              className="underline-offset-2 hover:text-foreground hover:underline"
            >
              {t("auth.privacy")}
            </Link>
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {(Object.keys(publicLanguageLabels) as LandingLanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setPublicLanguage(code)}
                className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                  publicLanguage === code
                    ? "bg-foreground text-background"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {code === "zh" ? "中文" : code === "ko" ? "한국어" : "EN"}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {forgotOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm"
              onClick={() => setForgotOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.25 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-card relative w-full max-w-sm rounded-2xl p-6 shadow-[var(--shadow-card)]"
              >
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  aria-label={t("common.close")}
                  className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                >
                  <X size={16} />
                </button>
                <h2 className="font-display text-xl font-extrabold tracking-tight">
                  {t("auth.resetTitle")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("auth.resetDesc")}</p>
                <form onSubmit={handleForgot} className="mt-5 space-y-4">
                  <Field
                    label={t("auth.emailLabel")}
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    autoComplete="email"
                    required
                  />
                  {forgotMsg && (
                    <div
                      className={`rounded-xl border px-3 py-2 text-xs ${
                        forgotMsg.type === "ok"
                          ? "border-[var(--border-strong)] bg-accent/10 text-accent-soft"
                          : "border-destructive/40 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {forgotMsg.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-all hover:shadow-[var(--shadow-glow-lg)] disabled:opacity-60"
                  >
                    {forgotLoading ? t("auth.sending") : t("auth.sendResetLink")}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  trailing,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full rounded-xl border border-[var(--border)] bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${trailing ? "pr-10" : ""}`}
        />
        {trailing}
      </div>
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.1l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3A12 12 0 0 1 12.7 29l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.3 5.3C41.4 35.7 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function FloatingAuthShapes({ parallax }: { parallax: { x: number; y: number } }) {
  const shapes = [
    { size: 220, x: "8%", y: "18%", depth: 14, blur: 0, opacity: 0.18 },
    { size: 140, x: "85%", y: "22%", depth: 22, blur: 0, opacity: 0.22 },
    { size: 90, x: "78%", y: "70%", depth: 30, blur: 0, opacity: 0.3 },
    { size: 60, x: "12%", y: "78%", depth: 36, blur: 0, opacity: 0.4 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: s.size,
            height: s.size,
            left: s.x,
            top: s.y,
            opacity: s.opacity,
            borderColor: "var(--border-strong)",
            transform: `translate3d(${parallax.x * s.depth}px, ${parallax.y * s.depth}px, 0)`,
            background:
              "radial-gradient(circle at 30% 30%, oklch(0.72 0.18 295 / 0.18), transparent 60%)",
            transition: "transform 0.4s cubic-bezier(0.2,0.8,0.2,1)",
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
