'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/i18n';

export default function CookieBanner() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem('aklsof_cookie_consent');
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('aklsof_cookie_consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'var(--bg)',
      color: 'var(--text)',
      borderTop: '1px solid var(--border)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 9999,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      <p style={{ margin: 0, fontSize: '0.9rem', flex: 1, paddingRight: '1rem' }}>
        {t('cookie_consent')}
      </p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <a href="/privacy" style={{ fontSize: '0.85rem', color: '#3498db', textDecoration: 'none', alignSelf: 'center' }}>
          {t('privacy')}
        </a>
        <button onClick={handleAccept} className="btn btn-primary btn-sm">
          {t('accept_cookies')}
        </button>
      </div>
    </div>
  );
}
