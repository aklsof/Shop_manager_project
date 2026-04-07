'use client';

/**
 * src/lib/theme.tsx
 *
 * ThemeProvider — merges:
 *   1. App-level settings (currency + defaultTheme) fetched from /api/admin/settings
 *   2. User visual preferences stored in localStorage
 *
 * Injects CSS custom properties onto :root so every page reacts to theme changes.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AppSettings,
  Currency,
  DEFAULT_APP_SETTINGS,
  DEFAULT_USER_PREFS,
  LS_APP_SETTINGS,
  LS_USER_PREFS,
  THEME_CATALOGUE,
  ThemeDefinition,
  UserVisualPrefs,
  formatPrice,
} from './settings';

// ─── Context shape ────────────────────────────────────────────────────────────

interface ThemeContextValue {
  /** Active resolved theme definition */
  theme: ThemeDefinition;
  /** App-level settings (admin-managed) */
  appSettings: AppSettings;
  /** User's personal visual prefs */
  userPrefs: UserVisualPrefs;
  /** Set user visual prefs (persisted to localStorage) */
  setUserPrefs: (prefs: Partial<UserVisualPrefs>) => void;
  /** Format a price using the active currency */
  fmt: (amount: number) => string;
  /** The active currency object */
  currency: Currency;
  /** Reload app settings from server (called after admin saves) */
  reloadAppSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEME_CATALOGUE[0],
  appSettings: DEFAULT_APP_SETTINGS,
  userPrefs: DEFAULT_USER_PREFS,
  setUserPrefs: () => {},
  fmt: (n) => `$${n.toFixed(2)}`,
  currency: DEFAULT_APP_SETTINGS.currency,
  reloadAppSettings: async () => {},
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveTheme(key: string): ThemeDefinition {
  return THEME_CATALOGUE.find((t) => t.key === key) ?? THEME_CATALOGUE[0];
}

function applyTheme(theme: ThemeDefinition, fontSize: UserVisualPrefs['fontSize']) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
  // Font size scale
  const scales = { sm: '14px', md: '16px', lg: '18px' };
  root.style.setProperty('--base-font-size', scales[fontSize]);
  root.setAttribute('data-theme', theme.key);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_APP_SETTINGS);
      if (saved) {
        try { return JSON.parse(saved) as AppSettings; } catch { /* ignore */ }
      }
    }
    return DEFAULT_APP_SETTINGS;
  });

  const [userPrefs, setUserPrefsState] = useState<UserVisualPrefs>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LS_USER_PREFS);
      if (saved) {
        try { return { ...DEFAULT_USER_PREFS, ...JSON.parse(saved) } as UserVisualPrefs; } catch { /* ignore */ }
      }
    }
    return DEFAULT_USER_PREFS;
  });

  // Resolve active theme: user override > app default
  const activeThemeKey = userPrefs.theme || appSettings.defaultTheme || 'light';
  const theme = resolveTheme(activeThemeKey);

  // Apply CSS vars whenever theme or font size changes
  useEffect(() => {
    applyTheme(theme, userPrefs.fontSize);
  }, [theme, userPrefs.fontSize]);

  // Fetch app settings from server on mount
  const reloadAppSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/settings');
      if (r.ok) {
        const data = await r.json() as AppSettings;
        setAppSettings(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_APP_SETTINGS, JSON.stringify(data));
        }
      }
    } catch { /* network error — use cached */ }
  }, []);

  useEffect(() => {
    reloadAppSettings();
  }, [reloadAppSettings]);

  const setUserPrefs = useCallback((prefs: Partial<UserVisualPrefs>) => {
    setUserPrefsState((prev) => {
      const next = { ...prev, ...prefs };
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_USER_PREFS, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const currency = appSettings.currency ?? DEFAULT_APP_SETTINGS.currency;

  const fmt = useCallback(
    (amount: number) => formatPrice(amount, currency),
    [currency]
  );

  return (
    <ThemeContext.Provider value={{ theme, appSettings, userPrefs, setUserPrefs, fmt, currency, reloadAppSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
