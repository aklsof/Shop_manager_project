/**
 * POST /api/auth/register
 * Self-registration for clients only.
 * Inserts a new row into `users` with user_type='client' and role='Store Associate'
 * (lowest privilege — clients don't have admin access).
 * REQ-14: Password policy enforced (min 8 chars, 1 upper, 1 lower, 1 digit).
 * REQ-15: Password hashed with bcrypt.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username: string = (body.username || '').trim();
    const password: string = body.password || '';
    const preferred_lang: string = body.preferred_lang || 'en';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, role, user_type, preferred_lang)
       VALUES (?, ?, 'Store Associate', 'client', ?)`,
      [username, hashedPassword, preferred_lang]
    );

    return NextResponse.json({ success: true, message: 'Registration successful.' });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
    }
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Server error during registration.' }, { status: 500 });
  }
}
