/**
 * GET /api/products
 * Returns products from vw_active_price.
 * Optional query param: ?category=Cigarettes|Drinks|Snacks (default: All)
 * REQ-1: Product browsing by category.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let query = `
      SELECT p.product_id, p.name, p.description, p.img_url, p.category, p.default_selling_price,
             p.store_location, p.tax_category_id, p.min_stock_threshold,
             t.name AS tax_category_name, t.rate AS tax_rate,
             COALESCE(v.effective_price, p.default_selling_price) AS effective_price,
             v.promotional_price, v.rule_type, v.has_active_deal,
             COALESCE(SUM(il.quantity), 0) AS total_stock
      FROM products p
      JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
      LEFT JOIN vw_active_price v ON v.product_id = p.product_id
      LEFT JOIN inventory_lots il ON il.product_id = p.product_id
    `;
    const params: string[] = [];

    if (category && category !== 'All') {
      query += ' WHERE p.category = ?';
      params.push(category);
    }

    query += ' GROUP BY p.product_id, p.name, p.description, p.img_url, p.category, p.default_selling_price, p.store_location, p.tax_category_id, p.min_stock_threshold, t.name, t.rate, v.effective_price, v.promotional_price, v.rule_type, v.has_active_deal';
    query += ' ORDER BY COALESCE(v.has_active_deal, 0) DESC, p.category, p.name';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Products fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
