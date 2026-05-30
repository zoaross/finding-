export type PasswordRule = {
  key: string;
  labelKey: string;
  test: (pw: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "len", labelKey: "password.rule.len", test: (p) => p.length >= 8 },
  { key: "upper", labelKey: "password.rule.upper", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", labelKey: "password.rule.lower", test: (p) => /[a-z]/.test(p) },
  { key: "digit", labelKey: "password.rule.digit", test: (p) => /\d/.test(p) },
  {
    key: "symbol",
    labelKey: "password.rule.symbol",
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
];

export type StrengthLevel = "empty" | "weak" | "medium" | "strong";

export function evaluatePassword(pw: string) {
  const passed = PASSWORD_RULES.filter((r) => r.test(pw));
  const score = passed.length;
  let level: StrengthLevel = "empty";
  if (pw.length === 0) level = "empty";
  else if (score <= 2) level = "weak";
  else if (score <= 4) level = "medium";
  else level = "strong";
  return {
    score,
    level,
    passed: passed.map((r) => r.key),
    allPassed: score === PASSWORD_RULES.length,
  };
}

export const STRENGTH_META: Record<
  StrengthLevel,
  { label: string; color: string; bg: string; widthPct: number }
> = {
  empty: { label: "—", color: "text-muted-foreground", bg: "bg-muted", widthPct: 0 },
  weak: {
    label: "password.level.weak",
    color: "text-destructive",
    bg: "bg-destructive",
    widthPct: 33,
  },
  medium: {
    label: "password.level.medium",
    color: "text-amber-400",
    bg: "bg-amber-400",
    widthPct: 66,
  },
  strong: {
    label: "password.level.strong",
    color: "text-emerald-400",
    bg: "bg-emerald-400",
    widthPct: 100,
  },
};
