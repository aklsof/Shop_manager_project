/**
 * GET /api/admin/statistics
 * Returns aggregated sales, purchases (COGS), and profit for daily, monthly, yearly views.
 * Query param: ?period=daily|monthly|yearly  (default: monthly)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') ?? 'monthly';

    // ── Date grouping expression ──────────────────────────────────────────────
    let groupExpr: string;
    let labelExpr: string;
    let whereClause: string;

    if (period === 'daily') {
      // Last 30 days
      groupExpr = "DATE(t.transaction_date)";
      labelExpr = "DATE_FORMAT(DATE(t.transaction_date), '%Y-%m-%d')";
      whereClause = "WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    } else if (period === 'yearly') {
      // Last 5 years
      groupExpr = "YEAR(t.transaction_date)";
      labelExpr = "CAST(YEAR(t.transaction_date) AS CHAR)";
      whereClause = "WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 5 YEAR)";
    } else {
      // monthly – last 12 months (default)
      groupExpr = "DATE_FORMAT(t.transaction_date, '%Y-%m')";
      labelExpr = "DATE_FORMAT(t.transaction_date, '%b %Y')";
      whereClause = "WHERE t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
    }

    /*
     * Main time-series query:
     *   - total_sales   = SUM of total_amount for non-refund transactions
     *   - total_cogs    = SUM of (qty × buying_price) for items in non-refund transactions
     *   - net_profit    = total_sales – total_cogs  (bénéfice)
     *   - total_refunds = count of refund transactions
     */
    const seriesQuery = `
      SELECT
        ${labelExpr}                                                              AS period_label,
        ${groupExpr}                                                              AS period_key,
        COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN t.total_amount ELSE 0 END), 0)
                                                                                  AS total_sales,
        COALESCE(SUM(CASE WHEN t.is_refund = 0
                          THEN ti.quantity * il.buying_price ELSE 0 END), 0)      AS total_cogs,
        COALESCE(SUM(CASE WHEN t.is_refund = 0
                          THEN (ti.quantity * ti.price_applied) - (ti.quantity * il.buying_price)
                          ELSE 0 END), 0)                                         AS net_profit,
        COUNT(DISTINCT CASE WHEN t.is_refund = 0 THEN t.transaction_id END)       AS total_tx,
        COUNT(DISTINCT CASE WHEN t.is_refund = 1 THEN t.transaction_id END)       AS total_refunds
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.transaction_id
      JOIN inventory_lots    il ON il.lot_id          = ti.lot_id
      ${whereClause}
      GROUP BY period_key, period_label
      ORDER BY period_key ASC
    `;

    // ── Grand totals (all time) ───────────────────────────────────────────────
    const totalsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN t.total_amount ELSE 0 END), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN t.is_refund = 0
                          THEN ti.quantity * il.buying_price ELSE 0 END), 0)        AS total_cogs,
        COALESCE(SUM(CASE WHEN t.is_refund = 0
                          THEN (ti.quantity * ti.price_applied) - (ti.quantity * il.buying_price)
                          ELSE 0 END), 0)                                           AS net_profit,
        COUNT(DISTINCT CASE WHEN t.is_refund = 0 THEN t.transaction_id END)         AS total_tx,
        COUNT(DISTINCT CASE WHEN t.is_refund = 1 THEN t.transaction_id END)         AS total_refunds,
        COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN ti.quantity ELSE 0 END), 0)     AS total_units_sold
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.transaction_id
      JOIN inventory_lots    il ON il.lot_id          = ti.lot_id
    `;

    // ── Top products by revenue this period ──────────────────────────────────
    const topProductsQuery = `
      SELECT
        p.name                                                                      AS product_name,
        p.category,
        COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN ti.quantity ELSE 0 END), 0)   AS units_sold,
        COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN ti.quantity * ti.price_applied ELSE 0 END), 0) AS revenue
      FROM transactions t
      JOIN transaction_items ti ON ti.transaction_id = t.transaction_id
      JOIN products          p  ON p.product_id       = ti.product_id
      JOIN inventory_lots    il ON il.lot_id           = ti.lot_id
      ${whereClause}
        AND t.is_refund = 0
      GROUP BY p.product_id, p.name, p.category
      ORDER BY revenue DESC
      LIMIT 8
    `;

    const [[seriesRows], [totalsRows], [topProductsRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(seriesQuery),
      pool.query<RowDataPacket[]>(totalsQuery),
      pool.query<RowDataPacket[]>(topProductsQuery),
    ]);

    return NextResponse.json({
      series: seriesRows,
      totals: totalsRows[0] ?? {},
      topProducts: topProductsRows,
      period,
    });
  } catch (err) {
    console.error('[statistics]', err);
    return NextResponse.json({ error: 'Failed to fetch statistics.' }, { status: 500 });
  }
}
