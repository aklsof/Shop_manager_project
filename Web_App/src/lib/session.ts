/**
 * Simple signed-cookie session helpers.
 * Updated to use IUser instead of the old IEmployee interface.
 */
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { IUser } from './user';

const COOKIE_NAME = 'aklsof_session';
const SECRET = process.env.SESSION_SECRET || 'changeme';

function sign(payload: string): string {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  return hmac.digest('base64url');
}

function makeToken(data: object): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string): object | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const sig = parts.pop()!;
  const payload = parts.join('.');
  if (sign(payload) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ user: IUser } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const data = verifyToken(token) as { user?: IUser } | null;
  if (!data || !data.user) return null;
  return { user: data.user };
}

export function createSessionToken(user: IUser): string {
  return makeToken({ user });
}

export const SESSION_COOKIE = COOKIE_NAME;
