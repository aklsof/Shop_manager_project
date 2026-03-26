/**
 * GET   /api/admin/users  — list all users (REQ-37)
 * POST  /api/admin/users  — create a new user account (REQ-37)
 * PATCH /api/admin/users  — update role, status, or reset password (REQ-37)
 * REQ-14: password policy enforced on creation/reset.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT user_id, username, role, user_type, preferred_lang, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await req.json();
    const { username, password, role, user_type, preferred_lang } = body;
    if (!username || !password || !role) {
      return NextResponse.json({ error: 'username, password, and role are required.' }, { status: 400 });
    }
    const passErr = validatePassword(password);
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role, user_type, preferred_lang) VALUES (?, ?, ?, ?, ?)`,
      [username, hash, role, user_type || 'client', preferred_lang || 'en']
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Username taken.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await req.json();
    const { user_id, role, is_active, password } = body;
    if (!user_id) return NextResponse.json({ error: 'user_id required.' }, { status: 400 });

    if (password !== undefined) {
      const passErr = validatePassword(password);
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 });
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, user_id]);
    }
    if (role !== undefined) await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, user_id]);
    if (is_active !== undefined) await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [is_active ? 1 : 0, user_id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}
