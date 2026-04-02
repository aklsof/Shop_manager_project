'use client';

/**
 * LangHtmlSync — tiny client component that keeps <html lang="…" dir="…">
 * in sync with the active language from LanguageContext.
 * Rendered once inside the root layout inside <LanguageProvider>.
 */
import { useEffect } from 'react';
import { useLang } from '@/lib/i18n';

export default function LangHtmlSync() {
  const { lang, dir } = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
