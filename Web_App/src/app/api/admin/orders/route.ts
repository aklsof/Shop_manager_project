import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * GET /api/admin/orders - List all web orders for admin
 * PATCH /api/admin/orders - Update order status (with transaction logic for 'Completed')
 */

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT order_id, status, order_date, client_username, product_name, quantity, price_at_order, line_total
       FROM vw_web_orders_dashboard
       ORDER BY order_date DESC`
    );

    // Group by order_id
    const ordersMap: Record<number, any> = {};
    rows.forEach(row => {
      if (!ordersMap[row.order_id]) {
        ordersMap[row.order_id] = {
          order_id: row.order_id,
          status: row.status,
          order_date: row.order_date,
          client_username: row.client_username,
          items: [],
          total: 0
        };
      }
      ordersMap[row.order_id].items.push({
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price_at_order
      });
      ordersMap[row.order_id].total += Number(row.line_total);
    });

    return NextResponse.json(Object.values(ordersMap));
  } catch (err) {
    console.error('Admin orders GET error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { order_id, new_status } = await req.json();
  if (!order_id || !new_status) {
    return NextResponse.json({ error: 'Missing order_id or new_status' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get current status and check transition
    const [orderRows] = await connection.query<RowDataPacket[]>(
      'SELECT status, client_id FROM web_orders WHERE order_id = ? FOR UPDATE',
      [order_id]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const currentStatus = orderRows[0].status;
    const clientId = orderRows[0].client_id;

    // Validate transition (mirrors trg_order_status_workflow but we do it here too for safety)
    if (currentStatus === new_status) {
      await connection.rollback();
      return NextResponse.json({ success: true, message: 'Status already set' });
    }

    if (!((currentStatus === 'Pending' && new_status === 'Ready for Pickup') ||
          (currentStatus === 'Ready for Pickup' && new_status === 'Completed'))) {
       throw new Error('Invalid status transition');
    }

    // 2. If completing, create a transaction and deduct stock
    if (new_status === 'Completed') {
      // Get items with tax info
      const [items] = await connection.query<RowDataPacket[]>(
        `SELECT woi.product_id, woi.quantity, woi.price_at_order, t.rate as tax_rate
         FROM web_order_items woi
         JOIN products p ON p.product_id = woi.product_id
         JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
         WHERE woi.order_id = ?`,
        [order_id]
      );

      let totalAmount = 0;
      for (const item of items) {
        totalAmount += (Number(item.price_at_order) * item.quantity) * (1 + Number(item.tax_rate) / 100);
      }

      // Create transaction record
      const [txResult] = await connection.query<ResultSetHeader>(
        'INSERT INTO transactions (user_id, total_amount, is_refund) VALUES (?, ?, 0)',
        [session.user.user_id, totalAmount]
      );
      const transactionId = txResult.insertId;

      // For each item, find a lot using FIFO and create transaction_items
      for (const item of items) {
        let remainingToDeduct = item.quantity;

        while (remainingToDeduct > 0) {
          const [lotRows] = await connection.query<RowDataPacket[]>(
            'SELECT lot_id, remaining_quantity FROM vw_fifo_lot_queue WHERE product_id = ? LIMIT 1 FOR UPDATE',
            [item.product_id]
          );

          if (lotRows.length === 0) {
            throw new Error(`Insufficient stock for product ${item.product_id}`);
          }

          const lot = lotRows[0];
          const deduct = Math.min(remainingToDeduct, lot.remaining_quantity);
          const taxAmount = (Number(item.price_at_order) * deduct) * (Number(item.tax_rate) / 100);

          await connection.query(
            'INSERT INTO transaction_items (transaction_id, product_id, lot_id, quantity, price_applied, tax_applied) VALUES (?, ?, ?, ?, ?, ?)',
            [transactionId, item.product_id, lot.lot_id, deduct, item.price_at_order, taxAmount]
          );

          // Note: trg_sale_deduct_stock trigger will handle inventory_lots update
          remainingToDeduct -= deduct;
        }
      }
    }

    // 3. Update web order status
    await connection.query(
      'UPDATE web_orders SET status = ?, handled_by = ? WHERE order_id = ?',
      [new_status, session.user.user_id, order_id]
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    await connection.rollback();
    console.error('Admin order update error:', err);
    return NextResponse.json({ error: err.message || 'Failed to update order' }, { status: 500 });
  } finally {
    connection.release();
  }
}
