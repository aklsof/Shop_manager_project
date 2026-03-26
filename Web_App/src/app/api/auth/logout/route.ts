/**
 * POST /api/auth/logout
 * TypeScript equivalent of logout.php
 */
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
