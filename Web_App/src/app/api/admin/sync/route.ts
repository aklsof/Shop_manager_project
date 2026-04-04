import { NextResponse } from 'next/server';
import { primaryPool, secondaryPool } from '@/lib/db';

export async function GET(req: Request) {
  // Check for admin/sync authorization secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (process.env.SYNC_SECRET && authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SYNC] Starting synchronization check...');
    
    // Core tables to sync (ordered by dependency)
    const tables = ['tax_categories', 'product_categories', 'products', 'inventory_lots', 'users', 'web_orders', 'web_order_items', 'transactions'];

    // 1. Check if Primary is empty (Initial Migration detection)
    const [stats]: any = await primaryPool.query('SELECT COUNT(*) as count FROM products');
    const isPrimaryEmpty = stats[0].count === 0;
    
    if (isPrimaryEmpty) {
        console.log('[SYNC] Primary DB is empty. performing INITIAL PULL from Secondary (filess.io)...');
    }

    for (const table of tables) {
      // Source = Secondary if pulling, Primary if pushing
      const sourcePool = isPrimaryEmpty ? secondaryPool : primaryPool;
      const targetPool = isPrimaryEmpty ? primaryPool : secondaryPool;

      // 2. Fetch from Source
      const [rows]: any = await sourcePool.query(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      // 3. Prepare UPSERT query
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const colNames = columns.map(c => `\`${c}\``).join(', ');
      const pk = columns.find(c => c.endsWith('_id')) || columns[0];
      const updateClause = columns
        .filter(c => c !== pk)
        .map(c => `\`${c}\`=VALUES(\`${c}\`)`)
        .join(', ');

      const sql = `INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateClause}`;

      // 4. Push to Target
      const conn = await targetPool.getConnection();
      try {
        await conn.beginTransaction();
        for (const row of rows) {
          const values = columns.map(c => row[c]);
          await conn.execute(sql, values);
        }
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[SYNC ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
