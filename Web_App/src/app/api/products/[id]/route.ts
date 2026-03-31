/**
 * GET /api/products/[id]
 * Returns single product detail with stock info.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.product_id, p.name, p.description, p.img_url, p.category, p.default_selling_price,
              p.store_location, p.tax_category_id, p.min_stock_threshold,
              t.name AS tax_category_name, t.rate AS tax_rate,
              COALESCE(v.effective_price, p.default_selling_price) AS effective_price,
              v.promotional_price, v.rule_type, v.has_active_deal,
              COALESCE(SUM(il.quantity), 0) AS total_stock
       FROM products p
       JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
       LEFT JOIN vw_active_price v ON v.product_id = p.product_id
       LEFT JOIN inventory_lots il ON il.product_id = p.product_id
       WHERE p.product_id = ?
       GROUP BY p.product_id`,
      [id]
    );
    if (!rows[0]) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('Product fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch product.' }, { status: 500 });
  }
}
