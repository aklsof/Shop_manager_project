/**
 * GET /api/products
 * Returns products from vw_active_price.
 * Optional query param: ?category=Cigarettes|Drinks|Snacks (default: All)
 * REQ-1: Product browsing by category.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCacheFirst } from '@/lib/jsonCache';
import { loadProductsFromSql } from '@/lib/cacheDatasets';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const products = await getCacheFirst('products', loadProductsFromSql);
    if (category && category !== 'All') {
      return NextResponse.json(products.filter((p) => p.category === category));
    }
    return NextResponse.json(products);
  } catch (err) {
    console.error('Products fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch products.' }, { status: 500 });
  }
}
