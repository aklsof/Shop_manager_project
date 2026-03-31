/**
 * GET /api/categories — public list of product categories for the storefront
 */
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY name');
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}
