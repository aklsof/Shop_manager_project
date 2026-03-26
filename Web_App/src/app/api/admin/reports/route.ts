/**
 * GET /api/admin/reports
 * Returns financial data from vw_financial_report. REQ-27.
 * Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = 'SELECT * FROM vw_financial_report';
    const params: string[] = [];
    if (from && to) {
      query += ' WHERE sale_date BETWEEN ? AND ?';
      params.push(from, to);
    } else if (from) {
      query += ' WHERE sale_date >= ?';
      params.push(from);
    }
    query += ' ORDER BY sale_date DESC, category, product_name';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    // Calculate summary totals
    const totals = rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + Number(r.revenue),
        cogs: acc.cogs + Number(r.cogs),
        tax_collected: acc.tax_collected + Number(r.tax_collected),
        net_profit: acc.net_profit + Number(r.net_profit),
      }),
      { revenue: 0, cogs: 0, tax_collected: 0, net_profit: 0 }
    );

    return NextResponse.json({ rows, totals });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch reports.' }, { status: 500 });
  }
}
