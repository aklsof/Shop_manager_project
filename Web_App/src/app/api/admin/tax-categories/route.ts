/**
 * GET  /api/admin/tax-categories — list all tax categories (REQ-35)
 * POST /api/admin/tax-categories — create a new tax category (REQ-35)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader } from 'mysql2';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const [rows] = await pool.query('SELECT * FROM tax_categories ORDER BY name');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, rate } = body;
    if (!name || rate === undefined) {
      return NextResponse.json({ error: 'name and rate are required.' }, { status: 400 });
    }
    if (rate < 0 || rate > 100) {
      return NextResponse.json({ error: 'rate must be between 0 and 100.' }, { status: 400 });
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO tax_categories (name, rate) VALUES (?, ?)',
      [name, rate]
    );
    return NextResponse.json({ success: true, tax_category_id: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Tax category name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create tax category.' }, { status: 500 });
  }
}
