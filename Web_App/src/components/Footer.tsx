'use client';

import { useLang } from '@/lib/i18n';

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLang();
  return (
    <div className="navbar-fixed-bottom row-fluid">
      <div className="navbar-inner">
        <div className="container text-center" style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <span>{t('copyright')} &copy; {year}</span>
          <a href="/terms" style={{ color: 'var(--text-muted)' }}>{t('terms')}</a>
          <a href="/privacy" style={{ color: 'var(--text-muted)' }}>{t('privacy')}</a>
        </div>
      </div>
    </div>
  );
}
