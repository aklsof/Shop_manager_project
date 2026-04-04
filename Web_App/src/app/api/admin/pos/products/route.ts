import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ap.product_id, ap.product_name, ap.category, ap.default_selling_price, 
              ap.promotional_price, ap.effective_price, ap.has_active_deal,
              t.rate AS tax_rate,
              COALESCE(SUM(il.quantity), 0) AS total_stock
       FROM vw_active_price ap
       JOIN products p ON p.product_id = ap.product_id
       JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
       LEFT JOIN inventory_lots il ON il.product_id = p.product_id
       GROUP BY ap.product_id, ap.product_name, ap.category, ap.default_selling_price,
                ap.promotional_price, ap.effective_price, ap.has_active_deal, t.rate
       ORDER BY ap.category, ap.product_name`
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error('POS products GET error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
