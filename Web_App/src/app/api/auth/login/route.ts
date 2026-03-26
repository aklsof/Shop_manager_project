/**
 * POST /api/auth/login
 * Authenticates a user against the `users` table in hybrid_store.
 * Supports both staff (role-based) and clients (user_type='client').
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { IUser } from '@/lib/user';
import { createSessionToken, SESSION_COOKIE } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
  user_id: number;
  username: string;
  password_hash: string;
  role: 'Store Associate' | 'Administrator';
  user_type: string;
  preferred_lang: string;
  is_active: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username: string = (body.username || '').trim();
    const password: string = body.password || '';

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const [rows] = await pool.query<UserRow[]>(
      'SELECT user_id, username, password_hash, role, user_type, preferred_lang, is_active FROM users WHERE username = ?',
      [username]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const sessionUser: IUser = {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      user_type: user.user_type,
      preferred_lang: user.preferred_lang,
      is_active: Boolean(user.is_active),
    };

    const token = createSessionToken(sessionUser);

    const response = NextResponse.json({ success: true, role: user.role, user_type: user.user_type });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error during login.' }, { status: 500 });
  }
}
