/**
 * PATCH /api/orders/[id]
 * Advances order status. Only store staff can do this.
 * Workflow enforced by DB trigger: Pending → Ready for Pickup → Completed
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.user.role !== 'Administrator' && session.user.user_type !== 'staff')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let conn: any = null;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    const { id } = await params;
    const body = await req.json();
    const { status } = body;
    const allowed = ['Ready for Pickup', 'Completed'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    // Replaces trg_order_status_workflow
    const [orderRows]: any = await conn.query('SELECT status FROM web_orders WHERE order_id = ? FOR UPDATE', [id]);
    if (!orderRows || orderRows.length === 0) throw new Error('Order not found.');
    
    const db_status = orderRows[0].status;
    if (!((db_status === 'Pending' && status === 'Ready for Pickup') || (db_status === 'Ready for Pickup' && status === 'Completed'))) {
        if (db_status !== status) throw new Error("Invalid order status transition. Allowed: Pending→Ready for Pickup→Completed.");
    }

    await conn.query(
      'UPDATE web_orders SET status = ?, handled_by = ? WHERE order_id = ?',
      [status, session.user.user_id, id]
    );
    
    await conn.commit();
    conn.release();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    return NextResponse.json({ error: err.message || err.sqlMessage || 'Failed to update order.' }, { status: 500 });
  }
}
