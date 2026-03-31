/**
 * GET  /api/admin/categories — list all product categories (admin only)
 * POST /api/admin/categories — create a new product category (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader } from 'mysql2';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY name');
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO product_categories (name) VALUES (?)',
      [name.trim()]
    );
    return NextResponse.json({ success: true, category_id: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A category with that name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create category.' }, { status: 500 });
  }
}
