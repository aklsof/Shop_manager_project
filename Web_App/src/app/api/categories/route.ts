/**
 * GET /api/categories — public list of product categories for the storefront
 */
import { NextResponse } from 'next/server';
import { getCacheFirst } from '@/lib/jsonCache';
import { loadCategoriesFromSql } from '@/lib/cacheDatasets';

export async function GET() {
  try {
    const rows = await getCacheFirst('categories', loadCategoriesFromSql);
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch categories.' }, { status: 500 });
  }
}
