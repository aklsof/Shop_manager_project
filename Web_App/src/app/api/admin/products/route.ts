/**
 * GET  /api/admin/products — list all products (REQ-10)
 * POST /api/admin/products — create a new product (REQ-10)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function requireAdmin(req?: NextRequest) {
  void req;
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, t.name AS tax_category_name, t.rate AS tax_rate,
            COALESCE(SUM(il.quantity),0) AS total_stock
     FROM products p
     JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
     LEFT JOIN inventory_lots il ON il.product_id = p.product_id
     GROUP BY p.product_id, p.name, p.description, p.img_url, p.category,
              p.default_selling_price, p.store_location, p.tax_category_id,
              p.min_stock_threshold, p.created_at, t.name, t.rate
     ORDER BY p.category, p.name`
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await req.json();
    const { name, category, default_selling_price, store_location, tax_category_id, min_stock_threshold, description, img_url } = body;
    if (!name || !category || !default_selling_price || !tax_category_id) {
      return NextResponse.json({ error: 'Name, category, price, and tax category are required.' }, { status: 400 });
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO products (name, description, img_url, category, default_selling_price, store_location, tax_category_id, min_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description || null, img_url || null, category, default_selling_price, store_location || null, tax_category_id, min_stock_threshold || 0]
    );
    return NextResponse.json({ success: true, product_id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create product.' }, { status: 500 });
  }
}
