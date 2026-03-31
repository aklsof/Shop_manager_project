/**
 * PUT  /api/admin/products/[id] — update an existing product (admin only)
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Next.js 15+ requires awaiting params
  const { id } = await context.params;
  const productId = Number(id);
  if (!productId || isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, category, default_selling_price, store_location, tax_category_id, min_stock_threshold, description, img_url } = body;

    if (!name || !category || !default_selling_price || !tax_category_id) {
      return NextResponse.json({ error: 'Name, category, price, and tax category are required.' }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products
       SET name = ?, description = ?, img_url = ?, category = ?,
           default_selling_price = ?, store_location = ?,
           tax_category_id = ?, min_stock_threshold = ?
       WHERE product_id = ?`,
      [
        name,
        description || null,
        img_url || null,
        category,
        default_selling_price,
        store_location || null,
        tax_category_id,
        min_stock_threshold ?? 0,
        productId,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}
