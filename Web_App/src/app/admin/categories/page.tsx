'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ProductCategory } from '@/lib/types';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Inline rename state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch('/api/admin/categories').then(r => r.json()).then(setCategories);

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'Administrator') router.push('/login');
      else load();
    });
  }, [router]);

  // ── Add ───────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(''); setAddSuccess('');
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (res.ok) {
      setAddSuccess(`Category "${newName}" added!`);
      setNewName('');
      load();
    } else {
      setAddError(data.error ?? 'Failed to add category.');
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────
  function startEdit(cat: ProductCategory) {
    setEditingId(cat.category_id);
    setEditName(cat.name);
    setEditError('');
  }

  async function handleRename(id: number) {
    setEditError(''); setSaving(true);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      setEditError(data.error ?? 'Failed to rename.');
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(cat: ProductCategory) {
    if (!confirm(`Delete category "${cat.name}"?\n\nThis will fail if products are still assigned to it.`)) return;
    const res = await fetch(`/api/admin/categories/${cat.category_id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      load();
    } else {
      alert(data.error ?? 'Failed to delete.');
    }
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">🗂️ Product Categories</h1>

        {/* Add form */}
        <div className="admin-form-card">
          <h2>Add New Category</h2>
          {addError && <div className="alert alert-danger">{addError}</div>}
          {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
          <form onSubmit={handleAdd} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Category Name</label>
                <input
                  className="form-control"
                  required
                  placeholder="e.g. Beverages, Dairy, Electronics…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Add Category</button>
          </form>
        </div>

        {/* Category list */}
        <h2 className="section-title">All Categories ({categories.length})</h2>
        {editError && <div className="alert alert-danger">{editError}</div>}
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Created</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#aaa', padding: '2rem' }}>
                  No categories yet. Add one above.
                </td>
              </tr>
            )}
            {categories.map(cat => (
              <tr key={cat.category_id}>
                <td>{cat.category_id}</td>
                <td>
                  {editingId === cat.category_id ? (
                    <input
                      className="form-control"
                      value={editName}
                      autoFocus
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(cat.category_id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      style={{ margin: 0 }}
                    />
                  ) : (
                    <strong>{cat.name}</strong>
                  )}
                </td>
                <td>{cat.created_at ? new Date(cat.created_at).toLocaleDateString() : '—'}</td>
                <td>
                  {editingId === cat.category_id ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }}
                        onClick={() => handleRename(cat.category_id)}
                        disabled={saving}
                      >
                        {saving ? '…' : '💾 Save'}
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem', background: '#eee', color: '#333' }}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }}
                        onClick={() => startEdit(cat)}
                      >
                        ✏️ Rename
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem', background: '#c0392b', color: '#fff' }}
                        onClick={() => handleDelete(cat)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="alert" style={{ background: '#fff8e1', border: '1px solid #f0c040', color: '#7a5f00', marginTop: '1.5rem', borderRadius: 8, padding: '0.85rem 1rem' }}>
          ⚠️ <strong>Note:</strong> Renaming a category will automatically update all products assigned to the old name.
          Deleting a category is only allowed when no products are using it — reassign those products first.
        </div>
      </div>
      <Footer />
    </>
  );
}
