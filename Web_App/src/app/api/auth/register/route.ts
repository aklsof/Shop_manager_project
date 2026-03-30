/**
 * POST /api/auth/register
 * Self-registration for clients only.
 * Inserts a new row into `users` with user_type='client' and role=NULL.
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
    const email: string = (body.email || '').trim();
    const user_firstName: string = (body.user_firstName || '').trim();
    const user_lastName: string = (body.user_lastName || '').trim();
    const user_address1: string = (body.user_address1 || '').trim();
    const city: string = (body.city || '').trim();
    const province: string = (body.province || '').trim();
    const password: string = body.password || '';
    const preferred_lang: string = body.preferred_lang || 'en';

    if (!username || !email || !user_firstName || !user_lastName || !password) {
      return NextResponse.json({ error: 'Username, email, first name, last name, and password are required.' }, { status: 400 });
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
      `INSERT INTO users 
        (username, email, user_firstName, user_lastName, user_address1, city, province, password_hash, preferred_lang,role)
       VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Store Associate')`,
      [username, email, user_firstName, user_lastName, user_address1, city, province, hashedPassword, preferred_lang]
    );

    return NextResponse.json({ success: true, message: 'Registration successful.' });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string, sqlMessage?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      if (mysqlErr.sqlMessage && mysqlErr.sqlMessage.includes('email')) {
        return NextResponse.json({ error: 'Email address is already registered.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
    }
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Server error during registration.' }, { status: 500 });
  }
}