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

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;
    const allowed = ['Ready for Pickup', 'Completed'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    await pool.query(
      'UPDATE web_orders SET status = ?, handled_by = ? WHERE order_id = ?',
      [status, session.user.user_id, id]
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const mysqlErr = err as { sqlMessage?: string };
    return NextResponse.json({ error: mysqlErr.sqlMessage || 'Failed to update order.' }, { status: 500 });
  }
}
