'use client';

/**
 * /admin/settings — Admin-only page to configure:
 *   - Currency (applied site-wide)
 *   - Default theme (applied to all users who haven't overridden it)
 *
 * Changes are saved to /api/admin/settings and cached via jsonCache.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import {
  CURRENCY_OPTIONS,
  THEME_CATALOGUE,
  AppSettings,
  Currency,
} from '@/lib/settings';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { appSettings, reloadAppSettings, theme } = useTheme();
  const { t } = useLang();

  const [currency, setCurrency] = useState<Currency>(appSettings.currency);
  const [defaultTheme, setDefaultTheme] = useState(appSettings.defaultTheme);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Sync local state when appSettings loads from server
  useEffect(() => {
    setCurrency(appSettings.currency);
    setDefaultTheme(appSettings.defaultTheme);
  }, [appSettings]);

  // Guard: admin only
  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(data => {
      if (!data.user || data.user.role !== 'Administrator') router.push('/login');
    });
  }, [router]);

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    try {
      const body: Partial<AppSettings> = { currency, defaultTheme };
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || t('settings_err_save'));
      } else {
        await reloadAppSettings();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError(t('settings_err_network'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <h1 className="admin-title">{t('settings_page_title')}</h1>

        {error && <div className="alert alert-danger">{error}</div>}
        {saved && <div className="alert alert-success">{t('settings_saved')}</div>}

        {/* ── Currency ── */}
        <div className="settings-section">
          <h2>{t('settings_currency_h')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {t('settings_currency_desc')}
          </p>
          <div className="currency-grid">
            {CURRENCY_OPTIONS.map((c) => (
              <button
                key={c.code}
                className={`currency-card${currency.code === c.code ? ' active' : ''}`}
                onClick={() => setCurrency(c)}
              >
                <span className="currency-symbol">{c.symbol}</span>
                <span>{c.code}</span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {t('settings_currency_prev')} <strong>{currency.position === 'before' ? `${currency.symbol}12.99` : `12.99 ${currency.symbol}`}</strong>
          </p>
        </div>

        {/* ── Default Theme ── */}
        <div className="settings-section">
          <h2>{t('settings_theme_h')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {t('settings_theme_desc')}
          </p>
          <div className="theme-grid">
            {THEME_CATALOGUE.map((t) => {
              // Show a small color swatch using the theme vars
              const accentColor = t.vars['--accent'];
              const bgColor = t.vars['--bg'];
              return (
                <button
                  key={t.key}
                  className={`theme-card${defaultTheme === t.key ? ' active' : ''}`}
                  onClick={() => setDefaultTheme(t.key)}
                  style={{
                    background: bgColor,
                    borderColor: defaultTheme === t.key ? accentColor : undefined,
                    color: t.vars['--text'],
                  }}
                >
                  <span style={{
                    display: 'inline-block', width: 14, height: 14,
                    borderRadius: '50%', background: accentColor,
                    marginRight: 6, verticalAlign: 'middle',
                  }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Save bar ── */}
        <div className="settings-save-bar">
          <button
            className="btn-action"
            onClick={() => router.push('/admin')}
            style={{ padding: '0.6rem 1.5rem' }}
          >
            {t('settings_back')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 120 }}
          >
            {saving ? t('settings_saving') : t('settings_save')}
          </button>
        </div>
      </div>
      <Footer />
    </>
  );
}
