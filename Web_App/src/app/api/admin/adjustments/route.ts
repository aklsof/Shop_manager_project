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
  let conn: any = null;
  try {
    const body = await req.json();
    const { lot_id, quantity_adjusted, reason } = body;
    if (!lot_id || quantity_adjusted === undefined || quantity_adjusted === 0) {
      return NextResponse.json({ error: 'lot_id and quantity_adjusted (≠ 0) are required.' }, { status: 400 });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [lots]: any = await conn.query('SELECT quantity FROM inventory_lots WHERE lot_id = ? FOR UPDATE', [lot_id]);
    if (!lots || lots.length === 0) throw new Error('Lot not found.');
    const current_qty = lots[0].quantity;
    if (current_qty + quantity_adjusted < 0) {
      throw new Error('Adjustment would result in negative lot quantity. Operation aborted.');
    }
      
    await conn.query('UPDATE inventory_lots SET quantity = quantity + ? WHERE lot_id = ?', [quantity_adjusted, lot_id]);

    await conn.query(
      'INSERT INTO inventory_adjustments (lot_id, user_id, quantity_adjusted, reason) VALUES (?, ?, ?, ?)',
      [lot_id, session.user.user_id, quantity_adjusted, reason || null]
    );
      
    await conn.commit();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (conn) {
      await conn.rollback();
    }
    console.error('Stock adjustment error:', err);
    return NextResponse.json({ error: err.message || err.sqlMessage || 'Failed to record adjustment.' }, { status: 500 });
  } finally {
    if (conn) {
      conn.release();
    }
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
