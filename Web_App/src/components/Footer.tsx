'use client';

import { useLang } from '@/lib/i18n';

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLang();
  return (
    <div className="navbar-fixed-bottom row-fluid">
      <div className="navbar-inner">
        <div className="container text-center">
          {t('copyright')} &copy; {year}
        </div>
      </div>
    </div>
  );
}
