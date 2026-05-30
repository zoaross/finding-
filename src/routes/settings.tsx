import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { StarField } from "@/components/StarField";
import { supabase } from "@/lib/supabase";
import {
  FindingMark,
  IconTarget,
  IconGlobe,
  IconChat,
  IconBell,
  IconSettings,
  IconUser,
  IconLogout,
  IconShield,
  IconPencil,
} from "@/components/icons/FindingIcons";
import {
  MVP_LANGUAGE_CODES,
  MVP_LANGUAGE_LABELS,
  TRANSLATION_LANG_KEY,
  isMvpLanguageCode,
  sanitizeLanguageCode,
  useI18n,
  useTranslationLanguage,
} from "@/lib/i18n";
import { useProfile, saveProfile, uploadAvatar } from "@/hooks/useProfile";
import { loadUserSettings, saveUserSettings, unblockProfile } from "@/lib/socialActions";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Finding." },
      {
        name: "description",
        content: "Finding account, notification, privacy and security settings.",
      },
    ],
  }),
});

const navItems = [
  { key: "nav.home", icon: IconTarget, to: "/home" as const },
  { key: "nav.needs", icon: IconChat, to: "/needs" as const },
  { key: "nav.discover", icon: IconGlobe, to: "/discover" as const },
  { key: "nav.messages", icon: IconBell, to: "/messages" as const },
  { key: "nav.bookmarks", icon: IconShield, to: "/bookmarks" as const },
  { key: "nav.profile", icon: IconUser, to: "/profile" as const },
  { key: "nav.settings", icon: IconSettings, to: "/settings" as const, active: true },
];

const sections = [
  { id: "account", labelKey: "settings.account", icon: "👤", descKey: "settings.accountDesc" },
  {
    id: "membership",
    labelKey: "settings.membership",
    icon: "✨",
    descKey: "settings.membershipDesc",
  },
  {
    id: "uiLanguage",
    labelKey: "settings.section.uiLanguage",
    icon: "🌍",
    descKey: "settings.section.uiLanguage.desc",
  },
  {
    id: "language",
    labelKey: "settings.section.prefLanguage",
    icon: "🌐",
    descKey: "settings.section.prefLanguage.desc",
  },
  {
    id: "notifications",
    labelKey: "settings.notifications",
    icon: "🔔",
    descKey: "settings.notificationsDesc",
  },
  { id: "privacy", labelKey: "settings.privacy", icon: "🛡️", descKey: "settings.privacyDesc" },
  {
    id: "blocked",
    labelKey: "settings.blockedUsers",
    icon: "🚫",
    descKey: "settings.blockedUsersDesc",
  },
  { id: "security", labelKey: "settings.security", icon: "🔐", descKey: "settings.securityDesc" },
];

export const PREF_LANG_KEY = TRANSLATION_LANG_KEY;
export const PREF_LANGS: Array<{ code: string; label: string }> = [
  { code: "zh", label: MVP_LANGUAGE_LABELS.zh },
  { code: "en", label: MVP_LANGUAGE_LABELS.en },
  { code: "ko", label: MVP_LANGUAGE_LABELS.ko },
];
export const PINNED_LANG_CODES = [...MVP_LANGUAGE_CODES];

const quickActions = [
  {
    id: "invite",
    icon: "🎁",
    labelKey: "settings.inviteFriends",
    descKey: "settings.inviteFriendsDesc",
  },
  { id: "help", icon: "💡", labelKey: "settings.helpCenter", descKey: "settings.helpCenterDesc" },
  {
    id: "about",
    icon: "ℹ️",
    labelKey: "settings.aboutFinding",
    descKey: "settings.aboutFindingDesc",
  },
];

function NavRail() {
  const { t } = useI18n();
  return (
    <aside className="hidden w-[224px] shrink-0 flex-col border-r border-white/5 bg-card/30 px-3 py-6 backdrop-blur-xl lg:flex">
      <Link to="/home" className="mb-8 flex items-center gap-2 px-3">
        <FindingMark size={26} />
        <span className="font-display text-lg font-bold tracking-tight">
          Finding<span className="text-primary">.</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              it.active
                ? "bg-gradient-to-r from-primary/25 to-primary/5 text-foreground shadow-[inset_0_0_0_1px_oklch(0.65_0.22_295/0.3)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <it.icon size={18} />
            <span>{t(it.key)}</span>
            {it.active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.65_0.22_295)]" />
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked
          ? "bg-gradient-to-r from-primary to-fuchsia-500 shadow-[0_0_14px_-2px_oklch(0.65_0.22_295/0.7)]"
          : "bg-white/10"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md"
        style={{ left: checked ? "calc(100% - 22px)" : 2 }}
      />
    </button>
  );
}

function SettingRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-4 last:border-0">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-card/40 p-6 backdrop-blur-xl shadow-[0_8px_30px_-12px_oklch(0.2_0.15_295/0.4)] ${className}`}
    >
      {children}
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const { appLanguage, setAppLanguage, t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [active, setActive] = useState("account");
  const [uiLangSearch, setUiLangSearch] = useState("");

  // form state — hydrated from profiles table after auth
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [originalForm, setOriginalForm] = useState({
    username: "",
    email: "",
    bio: "",
    country: "",
    city: "",
  });

  // upload + modals
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [show2FAInfo, setShow2FAInfo] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [devices, setDevices] = useState([
    { id: "d1", name: "MacBook Pro 16″", metaKey: "settings.deviceMeta.current", current: true },
    { id: "d2", name: "iPhone 15 Pro", metaKey: "settings.deviceMeta.phone" },
    { id: "d3", name: "iPad Air", metaKey: "settings.deviceMeta.tablet" },
  ]);

  // toggles — persisted to localStorage
  const SETTINGS_KEY = "finding.settings.v1";
  const loadStored = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const stored = loadStored();

  const [notif, setNotif] = useState(
    stored?.notif ?? {
      match: true,
      message: true,
      weekly: false,
      marketing: false,
      sound: true,
    },
  );
  const [privacy, setPrivacy] = useState(
    stored?.privacy ?? {
      energyShield: true,
      invisible: false,
      showRegion: true,
      aiVisible: true,
      indexable: false,
    },
  );
  const [twoFA, setTwoFA] = useState<boolean>(stored?.twoFA ?? false);
  const [translationLanguage, setTranslationLanguage] = useTranslationLanguage("zh");
  const [langSearch, setLangSearch] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<
    Array<{ id: string; profileId: string; username: string; avatar: string }>
  >([]);
  const languageChangedByUserRef = useRef(false);

  // Local fallback for offline/table-missing sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ notif, privacy, twoFA }));
    } catch {
      /* ignore quota errors */
    }
  }, [notif, privacy, twoFA]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s?.user) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate({ to: "/auth" });
      if (session?.user?.email) setEmail(session.user.email);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadUserSettings(user.id)
      .then((row) => {
        if (cancelled) return;
        if (row?.notification_settings && Object.keys(row.notification_settings).length) {
          setNotif((current: typeof notif) => ({ ...current, ...row.notification_settings }));
        }
        if (row?.privacy_settings && Object.keys(row.privacy_settings).length) {
          setPrivacy((current: typeof privacy) => ({ ...current, ...row.privacy_settings }));
        }
        const localAppCode = sanitizeLanguageCode(localStorage.getItem("finding:ui-lang"));
        const localTranslationCode = sanitizeLanguageCode(
          localStorage.getItem(TRANSLATION_LANG_KEY),
        );
        const supabaseAppCode = isMvpLanguageCode(row?.app_language) ? row.app_language : null;
        const supabaseTranslationCode = isMvpLanguageCode(row?.translation_language)
          ? row.translation_language
          : null;
        const appCode = supabaseAppCode ?? localAppCode;
        const translationCode = row?.translation_language
          ? (supabaseTranslationCode ?? localTranslationCode)
          : localTranslationCode;

        if (languageChangedByUserRef.current) return;
        setAppLanguage(appCode);
        setTranslationLanguage(translationCode);
        if (!row || row.app_language !== appCode || row.translation_language !== translationCode) {
          void saveUserSettings(user.id, {
            app_language: appCode,
            translation_language: translationCode,
          });
        }
      })
      .catch((error) => {
        console.warn("[settings] load failed:", error.message);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setAppLanguage, setTranslationLanguage, user]);

  const loadBlockedUsers = async (uid: string) => {
    const { data, error } = await (supabase as any)
      .from("blocked_users")
      .select("id, blocked_profile_id")
      .eq("blocker_id", uid)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("[settings] blocked users load failed:", error.message);
      return;
    }
    const profileIds = ((data as any[]) ?? []).map((row) => row.blocked_profile_id as string);
    if (!profileIds.length) {
      setBlockedUsers([]);
      return;
    }
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, username, avatar_emoji")
      .in("id", profileIds);
    const profileMap = new Map<string, any>(
      ((profiles as any[]) ?? []).map((profile: any) => [profile.id as string, profile]),
    );
    setBlockedUsers(
      ((data as any[]) ?? []).map((row: any) => {
        const profile = profileMap.get(row.blocked_profile_id as string);
        return {
          id: row.id as string,
          profileId: row.blocked_profile_id as string,
          username: (profile?.username as string) ?? t("home.userFallback"),
          avatar: (profile?.avatar_emoji as string) ?? "👤",
        };
      }),
    );
  };

  const handleUnblock = async (profileId: string) => {
    if (!user) return;
    try {
      await unblockProfile(user.id, profileId);
      setBlockedUsers((rows) => rows.filter((row) => row.profileId !== profileId));
      toast.success(t("settings.unblockedUser"));
    } catch (error) {
      toast.error(t("settings.saveFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadBlockedUsers(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !settingsLoaded) return;
    const timer = window.setTimeout(() => {
      void saveUserSettings(user.id, {
        app_language: sanitizeLanguageCode(appLanguage),
        translation_language: sanitizeLanguageCode(translationLanguage),
        notification_settings: notif,
        privacy_settings: privacy,
      }).catch((error) => {
        toast.error(t("settings.saveFailed"), { description: error.message });
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [appLanguage, notif, privacy, settingsLoaded, t, translationLanguage, user]);

  // Load profile from `profiles` table and hydrate form fields.
  const { profile, refresh: refreshProfile } = useProfile(user);
  useEffect(() => {
    if (!profile) return;
    const u = profile.username ?? "";
    const b = profile.bio ?? "";
    const c = profile.country ?? "";
    const cityValue = profile.city ?? "";
    setUsername(u);
    setBio(b);
    setCountry(c);
    setCity(cityValue);
    setOriginalForm({ username: u, email, bio: b, country: c, city: cityValue });
    if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
  }, [email, profile]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success(t("settings.loggedOut"));
    navigate({ to: "/" });
  };

  const comingLater = (label: string) => {
    toast.info(t("settings.comingLaterTitle"), {
      description: t("settings.comingLaterDesc", { feature: label }),
    });
  };

  const handleAppLanguageChange = (code: string) => {
    const next = sanitizeLanguageCode(code);
    languageChangedByUserRef.current = true;
    setAppLanguage(next);
    if (user) {
      void saveUserSettings(user.id, { app_language: next }).catch((error) => {
        toast.error(t("settings.saveFailed"), { description: error.message });
      });
    }
  };

  const handleTranslationLanguageChange = (code: string) => {
    const next = sanitizeLanguageCode(code);
    setTranslationLanguage(next);
    if (user) {
      void saveUserSettings(user.id, { translation_language: next }).catch((error) => {
        toast.error(t("settings.saveFailed"), { description: error.message });
      });
    }
  };

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      toast.error(t("settings.fileTooLargeAvatar"));
      return;
    }
    setAvatarPreview(URL.createObjectURL(f));
    setPendingAvatarFile(f);
    toast.success(t("settings.avatarSelected"));
  };

  const handleCancel = () => {
    setUsername(originalForm.username);
    setEmail(originalForm.email);
    setBio(originalForm.bio);
    setCountry(originalForm.country);
    setCity(originalForm.city);
    setPendingAvatarFile(null);
    setAvatarPreview(profile?.avatar_url ?? null);
    toast(t("settings.restored"));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t("auth.signin"));
      return;
    }
    if (!username.trim()) {
      toast.error(t("settings.usernameRequired"));
      return;
    }
    setSaving(true);

    let avatarUrl = profile?.avatar_url ?? null;
    try {
      if (pendingAvatarFile) {
        avatarUrl = await uploadAvatar(user, pendingAvatarFile);
      }
    } catch (err) {
      setSaving(false);
      const msg = err instanceof Error ? err.message : t("settings.avatarUploadFailed");
      toast.error(t("settings.avatarUploadFailed"), { description: msg });
      return;
    }

    if (email.trim() && email.trim() !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
      if (emailError) {
        setSaving(false);
        toast.error(t("settings.saveFailed"), { description: emailError.message });
        return;
      }
    }

    const location = [city.trim(), country.trim()].filter(Boolean).join(", ") || null;

    // Mirror to auth metadata so other surfaces (sidebar, greeting) update immediately.
    // We await and use the returned user so refreshProfile gets the latest metadata.
    const { data: authData } = await supabase.auth
      .updateUser({
        data: {
          display_name: username,
          bio,
          avatar_url: avatarUrl ?? undefined,
          country: country.trim() || null,
          city: city.trim() || null,
        },
      })
      .catch(() => ({ data: { user: null } }));

    // Use the freshly-returned user for the profile save so metadata fallbacks work
    const freshUser = authData?.user ?? user;

    const { error } = await saveProfile(freshUser, {
      username: username.trim(),
      bio: bio.trim() || null,
      avatar_url: avatarUrl,
      country: country.trim() || null,
      city: city.trim() || null,
      location,
    });

    setSaving(false);
    if (error) {
      toast.error(t("settings.saveFailed"), { description: error.message });
      return;
    }
    setOriginalForm({ username, email, bio, country, city });
    setPendingAvatarFile(null);
    await refreshProfile();
    toast.success(t("settings.saveSuccess"));
  };

  const handlePasswordChange = async () => {
    if (pwdNew.length < 8) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error(t("settings.passwordMismatch"));
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwdNew });
    setPwdSaving(false);
    if (error) {
      toast.error(t("settings.passwordChangeFailed"), { description: error.message });
      return;
    }
    toast.success(t("settings.passwordUpdated"));
    setShowPwd(false);
    setPwdCurrent("");
    setPwdNew("");
    setPwdConfirm("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <StarField density={70} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.35_0.18_295/0.25),transparent_55%)]" />

      <div className="relative z-10 flex min-h-screen">
        <NavRail />

        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-primary/80">
                {t("settings.headerKicker")}
              </div>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {t("settings.title")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
            </header>

            <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
              {/* Section nav */}
              <nav className="lg:sticky lg:top-8 lg:self-start lg:space-y-4">
                {/* User info card */}
                <div className="hidden rounded-2xl border border-white/10 bg-card/40 p-3 backdrop-blur-xl lg:block">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/60 via-fuchsia-500/40 to-purple-600/30 text-lg shadow-[0_0_18px_-4px_oklch(0.65_0.22_295/0.7)]">
                        🎨
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">@{username}</div>
                      <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                        ✨ PRO
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setActive(s.id);
                        document
                          .getElementById(s.id)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`relative shrink-0 rounded-xl px-3 py-2 text-left text-sm transition lg:py-2.5 ${
                        active === s.id
                          ? "bg-white/5 text-foreground"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      {active === s.id && (
                        <motion.span
                          layoutId="settings-active"
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary shadow-[0_0_10px_oklch(0.65_0.22_295)]"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span className="font-medium">{t(s.labelKey)}</span>
                      </div>
                      <div className="mt-0.5 hidden pl-6 text-[10px] leading-tight text-muted-foreground/70 lg:block">
                        {t(s.descKey)}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="hidden rounded-2xl border border-white/10 bg-card/30 p-3 backdrop-blur-xl lg:block">
                  <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.quickActions")}
                  </div>
                  <div className="space-y-0.5">
                    {quickActions.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => {
                          if (q.id === "invite") {
                            const link = `${window.location.origin}/?invite=${encodeURIComponent(username || "luna")}`;
                            navigator.clipboard?.writeText(link).catch(() => {});
                            toast.success(t("settings.inviteCopied"));
                          } else if (q.id === "help") {
                            setShowFAQ(true);
                          } else if (q.id === "about") {
                            setShowAbout(true);
                          }
                        }}
                        className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
                      >
                        <span className="text-base">{q.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-foreground">
                            {t(q.labelKey)}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {t(q.descKey)}
                          </div>
                        </div>
                        <span className="text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-foreground">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              <div className="space-y-6">
                {/* Account */}
                <section id="account" className="scroll-mt-8">
                  <Card>
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="font-display text-xl font-bold">{t("settings.account")}</h2>
                      <span className="text-xs text-muted-foreground">
                        {t("settings.emailVerified")}
                      </span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div
                          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/50 via-fuchsia-500/40 to-purple-600/30 text-3xl shadow-[0_0_30px_-5px_oklch(0.65_0.22_295/0.6)]"
                          style={
                            avatarPreview
                              ? {
                                  backgroundImage: `url(${avatarPreview})`,
                                  backgroundSize: "cover",
                                }
                              : undefined
                          }
                        >
                          {!avatarPreview && "🎨"}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-2 ring-background transition hover:scale-110 active:scale-95"
                          aria-label={t("settings.avatarEdit")}
                        >
                          <IconPencil size={14} />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarPick}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          @{username || profile?.username || "user"}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {t("settings.avatarHint")}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10 active:scale-95"
                        >
                          {t("settings.uploadAvatar")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <Field
                        label={t("settings.username")}
                        value={username}
                        onChange={setUsername}
                        prefix="@"
                      />
                      <Field
                        label={t("settings.email")}
                        value={email}
                        onChange={setEmail}
                        type="email"
                      />
                      <Field label={t("settings.country")} value={country} onChange={setCountry} />
                      <Field label={t("settings.city")} value={city} onChange={setCity} />
                    </div>

                    <div className="mt-4">
                      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("settings.bio")}
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:bg-white/[0.07]"
                      />
                      <div className="mt-1 text-right text-[10px] text-muted-foreground">
                        {bio.length} / 200
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={handleCancel}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 active:scale-95"
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.25_300/0.7)] transition hover:shadow-[0_12px_32px_-8px_oklch(0.6_0.25_300/0.9)] active:scale-95 disabled:opacity-60"
                      >
                        {saving ? t("settings.saving") : t("settings.saveChanges")}
                      </button>
                    </div>
                  </Card>
                </section>

                {/* Membership */}
                <section id="membership" className="scroll-mt-8">
                  <Card className="relative overflow-hidden">
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/30 via-fuchsia-500/20 to-primary/20 blur-3xl" />
                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <h2 className="font-display text-xl font-bold">
                          {t("settings.membership")}
                        </h2>
                        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          PRO
                        </span>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-xs text-muted-foreground">
                            {t("settings.currentPlan")}
                          </div>
                          <div className="mt-1 font-display text-xl font-bold">Finding PRO</div>
                          <div className="mt-2 text-[11px] text-muted-foreground">
                            {t("settings.renewDate")}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-xs text-muted-foreground">
                            {t("settings.monthMatches")}
                          </div>
                          <div className="mt-1 font-display text-xl font-bold">
                            38{" "}
                            <span className="text-sm font-normal text-muted-foreground">
                              / {t("settings.unlimited")}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-primary to-fuchsia-500" />
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="text-xs text-muted-foreground">
                            {t("settings.aiTranslation")}
                          </div>
                          <div className="mt-1 font-display text-xl font-bold">
                            142{" "}
                            <span className="text-sm font-normal text-muted-foreground">/ 500</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full w-[28%] rounded-full bg-gradient-to-r from-sky-400 to-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <div>
                          <div className="text-sm font-semibold">{t("settings.ultraTitle")}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("settings.ultraDesc")}
                          </div>
                        </div>
                        <button
                          onClick={() => comingLater(t("settings.membership"))}
                          className="rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_oklch(0.65_0.25_50/0.6)]"
                        >
                          ✨ {t("settings.upgradeNow")}
                        </button>
                      </div>
                    </div>
                  </Card>
                </section>

                {/* UI Language */}
                <section id="uiLanguage" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-2 font-display text-xl font-bold">
                      🌍 {t("settings.section.uiLanguage")}
                    </h2>
                    <p className="mb-4 text-xs text-muted-foreground">{t("settings.uiLangNote")}</p>
                    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {t("settings.languageDebug")}
                      </div>
                      <div className="mt-1" data-no-i18n="true">
                        {t("settings.appLanguageValue", {
                          value: `${sanitizeLanguageCode(appLanguage)} (${MVP_LANGUAGE_LABELS[sanitizeLanguageCode(appLanguage)]})`,
                        })}
                      </div>
                      <div data-no-i18n="true">
                        {t("settings.translationLanguageValue", {
                          value: `${sanitizeLanguageCode(translationLanguage)} (${MVP_LANGUAGE_LABELS[sanitizeLanguageCode(translationLanguage)]})`,
                        })}
                      </div>
                    </div>
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-xs text-muted-foreground">🔍</span>
                      <input
                        value={uiLangSearch}
                        onChange={(e) => setUiLangSearch(e.target.value)}
                        placeholder={t("common.search") + "..."}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("settings.common")}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {PREF_LANGS.filter((l) => PINNED_LANG_CODES.includes(l.code))
                        .filter(
                          (l) =>
                            !uiLangSearch ||
                            l.label.toLowerCase().includes(uiLangSearch.toLowerCase()),
                        )
                        .map((l) => {
                          const isActive = appLanguage === l.code;
                          return (
                            <button
                              key={l.code}
                              data-no-i18n="true"
                              onClick={() => {
                                handleAppLanguageChange(l.code);
                                toast.success(`${t("settings.section.uiLanguage")}: ${l.label}`);
                              }}
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                isActive
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
                              }`}
                            >
                              {l.label}
                              {isActive && " ✓"}
                            </button>
                          );
                        })}
                    </div>
                  </Card>
                </section>

                {/* Language preference */}
                <section id="language" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-2 font-display text-xl font-bold">
                      🌐 {t("settings.section.prefLanguage")}
                    </h2>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {t("settings.prefLangNote")}
                    </p>
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-xs text-muted-foreground">🔍</span>
                      <input
                        value={langSearch}
                        onChange={(e) => setLangSearch(e.target.value)}
                        placeholder={t("settings.searchPlaceholder")}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("settings.common")}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {PREF_LANGS.filter((l) => PINNED_LANG_CODES.includes(l.code))
                        .filter(
                          (l) =>
                            !langSearch || l.label.toLowerCase().includes(langSearch.toLowerCase()),
                        )
                        .map((l) => {
                          const active = translationLanguage === l.code;
                          return (
                            <button
                              key={l.code}
                              data-no-i18n="true"
                              onClick={() => {
                                handleTranslationLanguageChange(l.code);
                                toast.success(`${t("settings.section.prefLanguage")}: ${l.label}`);
                              }}
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                active
                                  ? "border-primary/50 bg-primary/15 text-primary"
                                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground"
                              }`}
                            >
                              {l.label}
                              {active && " ✓"}
                            </button>
                          );
                        })}
                    </div>
                  </Card>
                </section>

                <section id="notifications" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-2 font-display text-xl font-bold">
                      {t("settings.notifications")}
                    </h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {t("settings.notificationsIntro")}
                    </p>
                    <SettingRow
                      title={t("settings.notif.match")}
                      desc={t("settings.notif.matchDesc")}
                      checked={notif.match}
                      onChange={(v) => setNotif({ ...notif, match: v })}
                    />
                    <SettingRow
                      title={t("settings.notif.message")}
                      desc={t("settings.notif.messageDesc")}
                      checked={notif.message}
                      onChange={(v) => setNotif({ ...notif, message: v })}
                    />
                    <SettingRow
                      title={t("settings.notif.weekly")}
                      desc={t("settings.notif.weeklyDesc")}
                      checked={notif.weekly}
                      onChange={(v) => setNotif({ ...notif, weekly: v })}
                    />
                    <SettingRow
                      title={t("settings.notif.marketing")}
                      desc={t("settings.notif.marketingDesc")}
                      checked={notif.marketing}
                      onChange={() => comingLater(t("settings.notif.marketing"))}
                    />
                    <SettingRow
                      title={t("settings.notif.sound")}
                      desc={t("settings.notif.soundDesc")}
                      checked={notif.sound}
                      onChange={(v) => setNotif({ ...notif, sound: v })}
                    />
                  </Card>
                </section>

                {/* Privacy */}
                <section id="privacy" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-2 font-display text-xl font-bold">{t("settings.privacy")}</h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {t("settings.privacyIntro")}
                    </p>
                    <SettingRow
                      title={`🛡️ ${t("settings.privacy.energy")}`}
                      desc={t("settings.privacy.energyDesc")}
                      checked={privacy.energyShield}
                      onChange={(v) => setPrivacy({ ...privacy, energyShield: v })}
                    />
                    <SettingRow
                      title={`🌙 ${t("settings.privacy.invisible")}`}
                      desc={t("settings.privacy.invisibleDesc")}
                      checked={privacy.invisible}
                      onChange={(v) => setPrivacy({ ...privacy, invisible: v })}
                    />
                    <SettingRow
                      title={t("settings.privacy.region")}
                      desc={t("settings.privacy.regionDesc")}
                      checked={privacy.showRegion}
                      onChange={(v) => setPrivacy({ ...privacy, showRegion: v })}
                    />
                    <SettingRow
                      title={t("settings.privacy.ai")}
                      desc={t("settings.privacy.aiDesc")}
                      checked={privacy.aiVisible}
                      onChange={(v) => setPrivacy({ ...privacy, aiVisible: v })}
                    />
                    <SettingRow
                      title={t("settings.privacy.index")}
                      desc={t("settings.privacy.indexDesc")}
                      checked={privacy.indexable}
                      onChange={() => comingLater(t("settings.privacy.index"))}
                    />
                  </Card>
                </section>

                <section id="blocked" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-2 font-display text-xl font-bold">
                      {t("settings.blockedUsers")}
                    </h2>
                    <p className="mb-3 text-xs text-muted-foreground">
                      {t("settings.blockedUsersIntro")}
                    </p>
                    {blockedUsers.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-muted-foreground">
                        {t("settings.noBlockedUsers")}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blockedUsers.map((blocked) => (
                          <div
                            key={blocked.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-base">
                                {blocked.avatar}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                  @{blocked.username}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t("settings.blockedUserMeta")}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => void handleUnblock(blocked.profileId)}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10 active:scale-95"
                            >
                              {t("settings.unblock")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </section>

                {/* Security */}
                <section id="security" className="scroll-mt-8">
                  <Card>
                    <h2 className="mb-5 font-display text-xl font-bold">
                      {t("settings.security")}
                    </h2>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div>
                          <div className="text-sm font-medium">{t("settings.password")}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {t("settings.passwordMeta")}
                          </div>
                        </div>
                        <button
                          onClick={() => comingLater(t("settings.changePassword"))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10 active:scale-95"
                        >
                          {t("settings.changePassword")}
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            {t("settings.twoFA")}
                            {twoFA && (
                              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">
                                {t("settings.enabled")}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {t("settings.twoFADesc")}
                          </div>
                        </div>
                        <Toggle checked={twoFA} onChange={() => comingLater(t("settings.twoFA"))} />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div>
                          <div className="text-sm font-medium">{t("settings.loginDevices")}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {t("settings.devicesOnline")}
                          </div>
                        </div>
                        <button
                          onClick={() => comingLater(t("settings.manageDevices"))}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-white/10 active:scale-95"
                        >
                          {t("settings.manageDevices")}
                        </button>
                      </div>
                    </div>
                  </Card>
                </section>

                {/* Logout */}
                <div className="flex justify-center pb-12 pt-2">
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <IconLogout size={16} />
                    {t("settings.logout")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Password change modal */}
      <AnimatePresence>
        {showPwd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPwd(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_80px_-20px_oklch(0.55_0.25_300/0.7)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
              <button
                onClick={() => setShowPwd(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                aria-label={t("common.close")}
              >
                ✕
              </button>
              <h3 className="font-display text-xl font-bold">{t("settings.passwordModalTitle")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("settings.passwordModalDesc")}
              </p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">
                    {t("settings.currentPassword")}
                  </label>
                  <input
                    type="password"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {t("settings.newPassword")}
                  </label>
                  <input
                    type="password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    {t("settings.confirmNewPassword")}
                  </label>
                  <input
                    type="password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-primary/40"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowPwd(false)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 active:scale-95"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={pwdSaving}
                  className="rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_oklch(0.6_0.25_300/0.7)] transition active:scale-95 disabled:opacity-60"
                >
                  {pwdSaving ? t("settings.saving") : t("settings.updatePassword")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing modal */}
      <ModalShell
        open={showPricing}
        onClose={() => setShowPricing(false)}
        title={t("settings.pricingTitle")}
        subtitle={t("settings.pricingSubtitle")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-bold">PRO</div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                {t("settings.common")}
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              ¥48
              <span className="text-xs font-normal text-muted-foreground">
                {t("settings.perMonth")}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>✓ {t("settings.planUnlimitedMatches")}</li>
              <li>✓ {t("settings.plan500Translations")}</li>
              <li>✓ {t("settings.planInvisible")}</li>
            </ul>
            <button
              onClick={() => {
                setShowPricing(false);
                toast.success(t("settings.planSelected", { plan: "PRO" }));
              }}
              className="mt-4 w-full rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
            >
              PRO
            </button>
          </div>
          <div className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/10 to-fuchsia-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-bold">ULTRA</div>
              <span className="rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] text-amber-300">
                ULTRA
              </span>
            </div>
            <div className="mt-1 text-2xl font-bold">
              ¥128
              <span className="text-xs font-normal text-muted-foreground">
                {t("settings.perMonth")}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>✓ {t("settings.planUnlimitedTranslations")}</li>
              <li>✓ {t("settings.planPriority")}</li>
              <li>✓ {t("settings.planTemplates")}</li>
              <li>✓ {t("settings.planSupport")}</li>
            </ul>
            <button
              onClick={() => {
                setShowPricing(false);
                toast.success(t("settings.planSelected", { plan: "ULTRA" }));
              }}
              className="mt-4 w-full rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-primary px-4 py-2 text-sm font-semibold text-white"
            >
              ULTRA
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Devices modal */}
      <ModalShell
        open={showDevices}
        onClose={() => setShowDevices(false)}
        title={t("settings.devicesTitle")}
        subtitle={t("settings.devicesSubtitle")}
      >
        <div className="space-y-2">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {d.name}{" "}
                  {d.current && (
                    <span className="ml-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">
                      {t("settings.currentDevice")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{t(d.metaKey)}</div>
              </div>
              <button
                disabled={d.current}
                onClick={() => {
                  setDevices((arr) => arr.filter((x) => x.id !== d.id));
                  toast.success(t("settings.removedDevice", { name: d.name }));
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-40"
              >
                {t("settings.remove")}
              </button>
            </div>
          ))}
          {devices.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t("settings.noOtherDevices")}
            </div>
          )}
        </div>
      </ModalShell>

      {/* 2FA info modal */}
      <ModalShell
        open={show2FAInfo}
        onClose={() => setShow2FAInfo(false)}
        title={t("settings.twoFATitle")}
        subtitle={t("settings.twoFASubtitle")}
      >
        <p className="text-sm text-muted-foreground">{t("settings.twoFABody")}</p>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => setShow2FAInfo(false)}
            className="rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
          >
            {t("settings.gotIt")}
          </button>
        </div>
      </ModalShell>

      {/* FAQ modal */}
      <ModalShell
        open={showFAQ}
        onClose={() => setShowFAQ(false)}
        title={t("settings.helpCenter")}
        subtitle={t("settings.faqSubtitle")}
      >
        <div className="space-y-3">
          {[
            { q: t("settings.faq.quality.q"), a: t("settings.faq.quality.a") },
            { q: t("settings.faq.saved.q"), a: t("settings.faq.saved.a") },
            { q: t("settings.faq.cancel.q"), a: t("settings.faq.cancel.a") },
            { q: t("settings.faq.lang.q"), a: t("settings.faq.lang.a") },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-white/10 bg-white/[0.04] p-3"
            >
              <summary className="cursor-pointer text-sm font-medium">{item.q}</summary>
              <p className="mt-2 text-xs text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </ModalShell>

      {/* About modal */}
      <ModalShell
        open={showAbout}
        onClose={() => setShowAbout(false)}
        title={t("settings.aboutFinding")}
        subtitle={t("settings.aboutSubtitle")}
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <FindingMark size={36} />
            <div>
              <div className="font-display text-lg font-bold">
                Finding<span className="text-primary">.</span>
              </div>
              <div className="text-xs text-muted-foreground">{t("settings.version")}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("settings.aboutBody")}</p>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted-foreground">
              © 2026 Finding
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-muted-foreground">
              Made with ✨
            </span>
          </div>
        </div>
      </ModalShell>

      {/* Logout confirm */}
      <ModalShell
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title={t("settings.logoutTitle")}
        subtitle={t("settings.logoutSubtitle")}
      >
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={async () => {
              setShowLogoutConfirm(false);
              await logout();
            }}
            className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 px-5 py-2 text-sm font-semibold text-white"
          >
            {t("settings.logoutConfirm")}
          </button>
        </div>
      </ModalShell>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition focus-within:border-primary/40 focus-within:bg-white/[0.07]">
        {prefix && <span className="mr-1 text-sm text-muted-foreground">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-card/95 p-6 shadow-[0_20px_80px_-20px_oklch(0.55_0.25_300/0.7)] backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              aria-label={t("common.close")}
            >
              ✕
            </button>
            <h3 className="font-display text-xl font-bold">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
