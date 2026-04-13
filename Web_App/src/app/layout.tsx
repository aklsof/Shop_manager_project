import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import LangHtmlSync from '@/components/LangHtmlSync';
import { ThemeProvider } from '@/lib/theme';
import CookieBanner from '@/components/CookieBanner';

export const metadata: Metadata = {
  title: 'AKLSOF Network',
  description: 'Welcome to AKLSOF Network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            {/* Syncs html[lang] and html[dir] to the active language */}
            <LangHtmlSync />
            {children}
            <CookieBanner />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
