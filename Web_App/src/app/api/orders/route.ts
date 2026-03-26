/**
 * GET  /api/orders  — list orders for the logged-in client
 * POST /api/orders  — submit a new pickup order (REQ-2)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const [orders] = await pool.query<RowDataPacket[]>(
    `SELECT wo.order_id, wo.status, wo.order_date, wo.updated_at,
            woi.product_id, p.name AS product_name, woi.quantity, woi.price_at_order
     FROM web_orders wo
     JOIN web_order_items woi ON woi.order_id = wo.order_id
     JOIN products p ON p.product_id = woi.product_id
     WHERE wo.client_id = ?
     ORDER BY wo.order_date DESC`,
    [session.user.user_id]
  );
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await req.json();
    const items: { product_id: number; quantity: number; price_at_order: number }[] = body.items;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO web_orders (client_id, status) VALUES (?, ?)',
        [session.user.user_id, 'Pending']
      );
      const orderId = result.insertId;

      for (const item of items) {
        await conn.query(
          'INSERT INTO web_order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price_at_order]
        );
      }
      await conn.commit();
      return NextResponse.json({ success: true, order_id: orderId });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Order creation error:', err);
    return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
  }
}
