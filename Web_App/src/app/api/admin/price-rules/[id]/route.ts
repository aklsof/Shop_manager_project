import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const body = await req.json();
    const { product_id, rule_type, promotional_price, start_date, end_date, is_active } = body;

    // Only check overlap if we are making it active
    if (is_active !== 0) {
        const [overlap]: any = await pool.query(
          `SELECT COUNT(*) as conflict FROM price_rules 
           WHERE product_id = ? AND rule_type = ? AND is_active = 1 
           AND ? < end_date AND ? > start_date AND rule_id != ?`,
           [product_id, rule_type, start_date, end_date, id]
        );

        if (overlap && overlap.length > 0 && overlap[0].conflict > 0) {
          return NextResponse.json({ error: 'An overlapping active price rule of this type already exists for this product.' }, { status: 400 });
        }
    }

    await pool.query(
      `UPDATE price_rules 
       SET product_id = ?, rule_type = ?, promotional_price = ?, start_date = ?, end_date = ?, is_active = ? 
       WHERE rule_id = ?`,
      [product_id, rule_type, promotional_price, start_date, end_date, is_active, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.sqlMessage || 'Failed to update rule.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await pool.query('DELETE FROM price_rules WHERE rule_id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.sqlMessage || 'Failed to delete rule.' }, { status: 500 });
  }
}
