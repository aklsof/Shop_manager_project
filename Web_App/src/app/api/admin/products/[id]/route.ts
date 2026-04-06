/**
 * PUT  /api/admin/products/[id] — update an existing product (admin only)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader } from 'mysql2';
import { refreshCoreCaches } from '@/lib/cacheDatasets';

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
    const { name, category_id, default_selling_price, store_location, tax_category_id, min_stock_threshold, description, img_url } = body;

    if (!name || !category_id || default_selling_price === undefined || !tax_category_id) {
      return NextResponse.json({ error: 'Name, category, price, and tax category are required.' }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE products
       SET name = ?, description = ?, img_url = ?, category_id = ?,
           default_selling_price = ?, store_location = ?,
           tax_category_id = ?, min_stock_threshold = ?
       WHERE product_id = ?`,
      [
        name,
        description || null,
        img_url || null,
        category_id,
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

    await refreshCoreCaches();
    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Another product already has this name.' }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to update product.' }, { status: 500 });
  }
}
