import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AppTheme = "dark" | "light";

export const THEME_STORAGE_KEY = "finding:theme";

function sanitizeTheme(value: unknown): AppTheme {
  return value === "light" ? "light" : "dark";
}

function readStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "dark";
  try {
    return sanitizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => readStoredTheme());

  const setTheme = (next: AppTheme) => {
    const normalized = sanitizeTheme(next);
    setThemeState(normalized);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch {
      /* localStorage may be unavailable in embedded browsers */
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "dark" || value === "light";
}
