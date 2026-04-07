/**
 * src/lib/settings.ts
 *
 * App-wide settings management.
 *
 * TWO layers:
 *   1. APP settings (currency, defaultTheme) — admin-managed, persisted
 *      server-side via jsonCache so they survive server restarts.
 *      Exposed via GET/PUT /api/admin/settings.
 *
 *   2. USER visual preferences (theme override, fontSize) — stored only in
 *      the browser's localStorage so they are purely personal.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Currency {
  code: string;    // e.g. 'USD'
  symbol: string;  // e.g. '$'
  position: 'before' | 'after'; // '$12.50' vs '12.50 DA'
}

export interface AppSettings {
  currency: Currency;
  defaultTheme: string; // theme key, e.g. 'light'
}

export interface UserVisualPrefs {
  theme: string;   // overrides defaultTheme for this user
  fontSize: 'sm' | 'md' | 'lg';
}

// ─── Built-in currency catalogue ─────────────────────────────────────────────

export const CURRENCY_OPTIONS: Currency[] = [
  { code: 'USD', symbol: '$',  position: 'before' },
  { code: 'EUR', symbol: '€',  position: 'after'  },
  { code: 'GBP', symbol: '£',  position: 'before' },
  { code: 'DZD', symbol: 'DA', position: 'after'  },
  { code: 'MAD', symbol: 'MAD', position: 'after' },
  { code: 'TND', symbol: 'DT', position: 'after'  },
  { code: 'SAR', symbol: '﷼',  position: 'after'  },
  { code: 'CAD', symbol: 'CA$', position: 'before' },
];

// ─── Built-in themes catalogue ────────────────────────────────────────────────

export interface ThemeDefinition {
  key: string;
  label: string;
  /** CSS custom properties to inject on :root */
  vars: Record<string, string>;
}

export const THEME_CATALOGUE: ThemeDefinition[] = [
  {
    key: 'light',
    label: '☀️ Light (Default)',
    vars: {
      '--bg':         '#f8fafc',
      '--surface':    '#ffffff',
      '--text':       '#0f172a',
      '--text-muted': '#64748b',
      '--border':     '#cbd5e1',
      '--accent':     '#c0392b',
      '--accent-dark':'#922b21',
      '--accent-light':'#fdecea',
    },
  },
  {
    key: 'dark',
    label: '🌙 Dark',
    vars: {
      '--bg':         '#0f172a',
      '--surface':    '#1e293b',
      '--text':       '#f1f5f9',
      '--text-muted': '#94a3b8',
      '--border':     '#334155',
      '--accent':     '#e74c3c',
      '--accent-dark':'#c0392b',
      '--accent-light':'#3d1210',
    },
  },
  {
    key: 'ocean',
    label: '🌊 Ocean Blue',
    vars: {
      '--bg':         '#f0f9ff',
      '--surface':    '#ffffff',
      '--text':       '#0c2340',
      '--text-muted': '#4a7fa5',
      '--border':     '#bae6fd',
      '--accent':     '#0369a1',
      '--accent-dark':'#024b7a',
      '--accent-light':'#e0f2fe',
    },
  },
  {
    key: 'forest',
    label: '🌿 Forest Green',
    vars: {
      '--bg':         '#f0fdf4',
      '--surface':    '#ffffff',
      '--text':       '#052e16',
      '--text-muted': '#3d7a4e',
      '--border':     '#bbf7d0',
      '--accent':     '#16a34a',
      '--accent-dark':'#0d6b33',
      '--accent-light':'#dcfce7',
    },
  },
  {
    key: 'sunset',
    label: '🌅 Sunset',
    vars: {
      '--bg':         '#fff7ed',
      '--surface':    '#ffffff',
      '--text':       '#431407',
      '--text-muted': '#9a4f26',
      '--border':     '#fed7aa',
      '--accent':     '#ea580c',
      '--accent-dark':'#c2410c',
      '--accent-light':'#ffedd5',
    },
  },
  {
    key: 'midnight',
    label: '🔮 Midnight Purple',
    vars: {
      '--bg':         '#0d0b1e',
      '--surface':    '#1a1535',
      '--text':       '#e2d9f3',
      '--text-muted': '#9d84c3',
      '--border':     '#3b2f6e',
      '--accent':     '#7c3aed',
      '--accent-dark':'#5b21b6',
      '--accent-light':'#1e1050',
    },
  },
];

// ─── Default values ───────────────────────────────────────────────────────────

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currency: CURRENCY_OPTIONS[0], // USD
  defaultTheme: 'light',
};

// ─── Currency formatting helper ───────────────────────────────────────────────

export function formatPrice(amount: number, currency: Currency): string {
  const formatted = amount.toFixed(2);
  return currency.position === 'before'
    ? `${currency.symbol}${formatted}`
    : `${formatted} ${currency.symbol}`;
}

// ─── localStorage keys ────────────────────────────────────────────────────────

export const LS_USER_PREFS = 'aklsof_user_prefs';
export const LS_APP_SETTINGS = 'aklsof_app_settings'; // client-side cache of server settings

export const DEFAULT_USER_PREFS: UserVisualPrefs = {
  theme: '', // empty = use defaultTheme from AppSettings
  fontSize: 'md',
};
