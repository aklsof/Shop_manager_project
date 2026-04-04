/**
 * POST /api/admin/price-rules
 * Creates a pricing rule (Deal, Rollback, Clearance, Holiday). REQ-16.
 * DB trigger trg_validate_price_rule prevents overlapping active rules.
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
    const { product_id, rule_type, promotional_price, start_date, end_date } = body;
    const validTypes = ['Deal', 'Rollback', 'Clearance', 'Holiday'];
    if (!product_id || !rule_type || !promotional_price || !start_date || !end_date) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (!validTypes.includes(rule_type)) {
      return NextResponse.json({ error: 'Invalid rule_type.' }, { status: 400 });
    }
    
    // Replaces trg_validate_price_rule
    const [overlap]: any = await pool.query(
      `SELECT COUNT(*) as conflict FROM price_rules 
       WHERE product_id = ? AND rule_type = ? AND is_active = 1 
       AND ? < end_date AND ? > start_date`,
       [product_id, rule_type, start_date, end_date]
    );
    if (overlap && overlap.length > 0 && overlap[0].conflict > 0) {
      return NextResponse.json({ error: 'An overlapping active price rule of this type already exists for this product.' }, { status: 400 });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO price_rules (product_id, rule_type, promotional_price, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [product_id, rule_type, promotional_price, start_date, end_date]
    );
    return NextResponse.json({ success: true, rule_id: result.insertId }, { status: 201 });
  } catch (err: unknown) {
    const mysqlErr = err as { sqlMessage?: string };
    return NextResponse.json({ error: mysqlErr.sqlMessage || 'Failed to create price rule.' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const [rows] = await pool.query(
    `SELECT pr.*, p.name AS product_name
     FROM price_rules pr JOIN products p ON p.product_id = pr.product_id
     ORDER BY pr.start_date DESC`
  );
  return NextResponse.json(rows);
}
