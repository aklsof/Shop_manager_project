/**
 * PUT    /api/admin/categories/[id] — rename a product category
 * DELETE /api/admin/categories/[id] — delete a product category (only if unused)
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/session';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== 'Administrator') return null;
  return session;
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Next.js 15+ requires awaiting params
  const { id } = await context.params;
  const categoryId = Number(id);
  if (!categoryId || isNaN(categoryId)) return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });

  try {
    const { name } = await req.json();
    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

    // Fetch the current name BEFORE updating, so we can cascade the rename to products
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT name FROM product_categories WHERE category_id = ?',
      [categoryId]
    );
    if (existing.length === 0) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    const oldName = existing[0].name;

    // Rename the category
    await pool.query<ResultSetHeader>(
      'UPDATE product_categories SET name = ? WHERE category_id = ?',
      [name.trim(), categoryId]
    );

    // Cascade the rename to all products that used the old category name
    if (oldName !== name.trim()) {
      await pool.query(
        'UPDATE products SET category = ? WHERE category = ?',
        [name.trim(), oldName]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Name already taken.' }, { status: 409 });
    return NextResponse.json({ error: 'Failed to rename category.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Next.js 15+ requires awaiting params
  const { id } = await context.params;
  const categoryId = Number(id);
  if (!categoryId || isNaN(categoryId)) return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });

  try {
    // Safety check: refuse deletion if products still use this category
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM products p
       JOIN product_categories c ON c.name = p.category
       WHERE c.category_id = ?`,
      [categoryId]
    );
    if (rows[0].cnt > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${rows[0].cnt} product(s) still use this category. Reassign them first.` },
        { status: 409 }
      );
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM product_categories WHERE category_id = ?',
      [categoryId]
    );
    if (result.affectedRows === 0) return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete category.' }, { status: 500 });
  }
}
