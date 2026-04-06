import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { writeJsonCache } from '@/lib/jsonCache';

type ProductRow = RowDataPacket & {
  product_id: number;
  name: string;
  category: string;
};

type CategoryRow = RowDataPacket & {
  category_id: number;
  name: string;
};

export async function loadProductsFromSql(): Promise<ProductRow[]> {
  const [rows] = await pool.query<ProductRow[]>(
    `SELECT p.product_id, p.name, p.description, p.img_url, pc.name AS category, p.default_selling_price,
            p.store_location, p.tax_category_id, p.min_stock_threshold,
            t.name AS tax_category_name, t.rate AS tax_rate,
            COALESCE(v.effective_price, p.default_selling_price) AS effective_price,
            v.promotional_price, v.rule_type, v.has_active_deal,
            COALESCE(SUM(il.quantity), 0) AS total_stock
     FROM products p
     JOIN product_categories pc ON pc.category_id = p.category_id
     JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
     LEFT JOIN vw_active_price v ON v.product_id = p.product_id
     LEFT JOIN inventory_lots il ON il.product_id = p.product_id
     GROUP BY p.product_id, p.name, p.description, p.img_url, pc.name, p.default_selling_price, p.store_location,
              p.tax_category_id, p.min_stock_threshold, t.name, t.rate, v.effective_price, v.promotional_price,
              v.rule_type, v.has_active_deal
     ORDER BY COALESCE(v.has_active_deal, 0) DESC, pc.name, p.name`
  );
  return rows;
}

export async function loadCategoriesFromSql(): Promise<CategoryRow[]> {
  const [rows] = await pool.query<CategoryRow[]>('SELECT * FROM product_categories ORDER BY name');
  return rows;
}

export async function loadAdminProductsFromSql(): Promise<RowDataPacket[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, pc.name AS category, t.name AS tax_category_name, t.rate AS tax_rate,
            COALESCE(SUM(il.quantity),0) AS total_stock
     FROM products p
     JOIN product_categories pc ON pc.category_id = p.category_id
     JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
     LEFT JOIN inventory_lots il ON il.product_id = p.product_id
     GROUP BY p.product_id, p.name, p.description, p.img_url, p.category_id, pc.name,
              p.default_selling_price, p.store_location, p.tax_category_id,
              p.min_stock_threshold, p.created_at, t.name, t.rate
     ORDER BY pc.name, p.name`
  );
  return rows;
}

export async function refreshCoreCaches(): Promise<void> {
  // Pool is intentionally tight (connectionLimit/queueLimit ~= 1), so run sequentially.
  const products = await loadProductsFromSql();
  const categories = await loadCategoriesFromSql();
  const adminProducts = await loadAdminProductsFromSql();

  await Promise.all([
    writeJsonCache('products', products),
    writeJsonCache('categories', categories),
    writeJsonCache('admin-products', adminProducts),
    writeJsonCache('admin-categories', categories),
  ]);
}
