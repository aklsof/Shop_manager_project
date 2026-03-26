/**
 * GET /api/session
 * Returns current logged-in user from session cookie (for client-side auth state).
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: session.user });
}
