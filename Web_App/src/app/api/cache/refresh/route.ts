import { NextResponse } from 'next/server';
import { refreshCoreCaches } from '@/lib/cacheDatasets';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.SYNC_SECRET && authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await refreshCoreCaches();
    return NextResponse.json({ success: true, refreshedAt: new Date().toISOString() });
  } catch (error: unknown) {
    const message = (error as { message?: string }).message || 'Cache refresh failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
