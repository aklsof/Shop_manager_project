/**
 * POST /api/admin/stock
 * Adds stock for a product, creating a new inventory lot (REQ-11, REQ-12).
 * The lot_id is auto-generated and stamped with current timestamp by the DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader } from 'mysql2';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { product_id, buying_price, quantity } = body;
    if (!product_id || !buying_price || !quantity) {
      return NextResponse.json({ error: 'product_id, buying_price, and quantity are required.' }, { status: 400 });
    }
    if (quantity <= 0 || buying_price <= 0) {
      return NextResponse.json({ error: 'quantity and buying_price must be positive.' }, { status: 400 });
    }
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO inventory_lots (product_id, quantity, buying_price) VALUES (?, ?, ?)',
      [product_id, quantity, buying_price]
    );
    return NextResponse.json({ success: true, lot_id: result.insertId }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add stock.' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const [rows] = await pool.query(
    `SELECT il.lot_id, il.product_id, p.name AS product_name, p.category,
            il.quantity, il.buying_price, il.date_received
     FROM inventory_lots il
     JOIN products p ON p.product_id = il.product_id
     ORDER BY il.date_received DESC`
  );
  return NextResponse.json(rows);
}
