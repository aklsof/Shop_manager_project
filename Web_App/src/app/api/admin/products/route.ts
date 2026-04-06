/**
 * GET  /api/admin/products — list all products (REQ-10)
 * POST /api/admin/products — create a new product (REQ-10)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader } from 'mysql2';
import { getCacheFirst } from '@/lib/jsonCache';
import { loadAdminProductsFromSql, refreshCoreCaches } from '@/lib/cacheDatasets';

async function requireAdmin(req?: NextRequest) {
  void req;
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const rows = await getCacheFirst('admin-products', loadAdminProductsFromSql);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await req.json();
    const { name, category_id, default_selling_price, store_location, tax_category_id, min_stock_threshold, description, img_url } = body;
    if (!name || !category_id || default_selling_price === undefined || !tax_category_id) {
      return NextResponse.json({ error: 'Name, category, price, and tax category are required.' }, { status: 400 });
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO products (name, description, img_url, category_id, default_selling_price, store_location, tax_category_id, min_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, img_url || null, category_id, default_selling_price, store_location || null, tax_category_id, min_stock_threshold || 0]
    );
    await refreshCoreCaches();
    return NextResponse.json({ success: true, product_id: result.insertId }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'A product with this name already exists.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
