import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { RowDataPacket } from 'mysql2';

interface ProfileRow extends RowDataPacket {
  user_id: number;
  username: string;
  email: string;
  user_firstName: string;
  user_lastName: string;
  user_address1: string;
  city: string;
  province: string;
  preferred_lang: string;
  password_hash: string;
}

export async function GET() {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.query<ProfileRow[]>(
      `SELECT user_id, username, email, user_firstName, user_lastName, user_address1, city, province, preferred_lang
       FROM users WHERE user_id = ?`,
      [session.user.user_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: rows[0] });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, user_firstName, user_lastName, user_address1, city, province, password } = body;

    let updateQuery = `
      UPDATE users SET 
      email = ?, user_firstName = ?, user_lastName = ?, 
      user_address1 = ?, city = ?, province = ?
    `;

    const queryParams: any[] = [
      email || '', 
      user_firstName || '', 
      user_lastName || '', 
      user_address1 || '', 
      city || '', 
      province || ''
    ];

    if (password && password.trim().length > 0) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery += `, password_hash = ?`;
      queryParams.push(passwordHash);
    }

    updateQuery += ` WHERE user_id = ?`;
    queryParams.push(session.user.user_id);

    await pool.query(updateQuery, queryParams);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
