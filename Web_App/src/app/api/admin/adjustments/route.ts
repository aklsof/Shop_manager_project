/**
 * POST /api/admin/adjustments
 * Records a stock adjustment (shrinkage, damage, etc). REQ-33.
 * The DB trigger trg_adjustment_apply auto-updates lot quantity.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { lot_id, quantity_adjusted, reason } = body;
    if (!lot_id || quantity_adjusted === undefined || quantity_adjusted === 0) {
      return NextResponse.json({ error: 'lot_id and quantity_adjusted (≠ 0) are required.' }, { status: 400 });
    }
    await pool.query(
      'INSERT INTO inventory_adjustments (lot_id, user_id, quantity_adjusted, reason) VALUES (?, ?, ?, ?)',
      [lot_id, session.user.user_id, quantity_adjusted, reason || null]
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const mysqlErr = err as { sqlMessage?: string };
    return NextResponse.json({ error: mysqlErr.sqlMessage || 'Failed to record adjustment.' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const [rows] = await pool.query(`SELECT * FROM vw_inventory_adjustment_log ORDER BY adjustment_date DESC`);
  return NextResponse.json(rows);
}
