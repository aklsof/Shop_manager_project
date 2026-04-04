import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { items } = await req.json();
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items provided' }, { status: 400 });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let totalAmount = 0;
    // Pre-calculate total amount
    for (const item of items) {
      // Need price and tax info for each product
      const [pRows] = await connection.query<RowDataPacket[]>(
        `SELECT ap.effective_price, t.rate 
         FROM vw_active_price ap
         JOIN products p ON p.product_id = ap.product_id
         JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
         WHERE ap.product_id = ?`,
        [item.product_id]
      );
      if (pRows.length === 0) throw new Error(`Product ${item.product_id} not found`);

      const price = Number(pRows[0].effective_price);
      const taxRate = Number(pRows[0].rate);
      totalAmount += (price * item.quantity) * (1 + taxRate / 100);
      
      // Store these for the next loop to avoid second query for same products
      item.price = price;
      item.taxRate = taxRate;
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
        // Fetch a lot from the FIFO view
        const [lotRows] = await connection.query<RowDataPacket[]>(
          'SELECT lot_id, remaining_quantity FROM vw_fifo_lot_queue WHERE product_id = ? LIMIT 1 FOR UPDATE',
          [item.product_id]
        );

        if (lotRows.length === 0) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }

        const lot = lotRows[0];
        const deduct = Math.min(remainingToDeduct, lot.remaining_quantity);
        const taxAppliedAtDeduct = (item.price * deduct) * (item.taxRate / 100);

        await connection.query(
          'INSERT INTO transaction_items (transaction_id, product_id, lot_id, quantity, price_applied, tax_applied) VALUES (?, ?, ?, ?, ?, ?)',
          [transactionId, item.product_id, lot.lot_id, deduct, item.price, taxAppliedAtDeduct]
        );

        // Note: trg_sale_deduct_stock trigger will handle inventory_lots update
        remainingToDeduct -= deduct;
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, transaction_id: transactionId });
  } catch (err: any) {
    await connection.rollback();
    console.error('POS Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete sale' }, { status: 500 });
  } finally {
    connection.release();
  }
}
