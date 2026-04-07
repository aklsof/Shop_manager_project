/**
 * GET  /api/admin/settings  — returns current AppSettings (public read for ThemeProvider)
 * PUT  /api/admin/settings  — updates AppSettings (requires admin session)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { readJsonCache, writeJsonCache } from '@/lib/jsonCache';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/settings';

const CACHE_KEY = 'app-settings';

async function getSettings(): Promise<AppSettings> {
  const cached = await readJsonCache<AppSettings>(CACHE_KEY);
  return cached ?? DEFAULT_APP_SETTINGS;
}

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  // Admin-only
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json() as Partial<AppSettings>;
    const current = await getSettings();

    const updated: AppSettings = {
      currency: body.currency ?? current.currency,
      defaultTheme: body.defaultTheme ?? current.defaultTheme,
    };

    await writeJsonCache(CACHE_KEY, updated);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
