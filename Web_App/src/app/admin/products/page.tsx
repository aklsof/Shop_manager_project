'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product, TaxCategory, ProductCategory } from '@/lib/types';

const EMPTY_FORM = {
  name: '',
  category_id: '',
  default_selling_price: '',
  store_location: '',
  tax_category_id: '',
  min_stock_threshold: '0',
  description: '',
  img_url: '',
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxCats, setTaxCats] = useState<TaxCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // ── Add form ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const refreshProducts = () =>
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setProducts(d);
      });

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'Administrator') router.push('/login');
    });
    refreshProducts().catch(err => setAddError("Failed to load products: " + err.message));
    fetch('/api/admin/tax-categories')
      .then(async r => {
        const raw = await r.text();
        if (!raw.trim()) {
          throw new Error('Empty response body from /api/admin/tax-categories');
        }
        return JSON.parse(raw);
      })
      .then(cats => {
        if (cats.error) throw new Error(cats.error);
        setTaxCats(cats);
        // Pre-select the first tax category in the add form
        if (cats.length > 0) setForm(f => ({ ...f, tax_category_id: f.tax_category_id || String(cats[0].tax_category_id) }));
      })
      .catch(err => {
        setAddError("Failed to load tax categories: " + err.message);
      });

    fetch('/api/admin/categories')
      .then(async r => {
        const raw = await r.text();
        if (!raw.trim()) {
          throw new Error('Empty response body from /api/admin/categories');
        }
        return JSON.parse(raw);
      })
      .then((cats: ProductCategory[]) => {
        if ((cats as any).error) throw new Error((cats as any).error);
        setCategories(cats);
        // Pre-select the first category in the add form once loaded
        if (cats.length > 0) setForm(f => ({ ...f, category_id: f.category_id || String(cats[0].category_id) }));
      })
      .catch(err => {
        setAddError("Failed to load categories: " + err.message);
      });
  }, [router]);

  // ── Add product ───────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(''); setAddSuccess('');
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        category_id: Number(form.category_id),
        default_selling_price: Number(form.default_selling_price),
        tax_category_id: Number(form.tax_category_id),
        min_stock_threshold: Number(form.min_stock_threshold),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAddSuccess('Product added successfully!');
      setForm({ ...EMPTY_FORM });
      refreshProducts();
    } else {
      setAddError(data.error);
    }
  }

  // ── Open edit modal ───────────────────────────────────────────────────────
  function openEdit(p: Product) {
    setEditProduct(p);
    setEditError(''); setEditSuccess('');
    setEditForm({
      name: p.name,
      category_id: String(p.category_id),
      default_selling_price: String(p.default_selling_price),
      store_location: p.store_location ?? '',
      tax_category_id: String(p.tax_category_id),
      min_stock_threshold: String(p.min_stock_threshold),
      description: p.description ?? '',
      img_url: p.img_url ?? '',
    });
  }

  // ── Save edit ─────────────────────────────────────────────────────────────
  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct) return;
    setEditError(''); setEditSuccess(''); setSaving(true);

    const res = await fetch(`/api/admin/products/${editProduct.product_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        category_id: Number(editForm.category_id),
        default_selling_price: Number(editForm.default_selling_price),
        tax_category_id: Number(editForm.tax_category_id),
        min_stock_threshold: Number(editForm.min_stock_threshold),
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setEditSuccess('Product updated successfully!');
      refreshProducts();
      // Close modal after a short delay so user sees the success message
      setTimeout(() => setEditProduct(null), 1200);
    } else {
      setEditError(data.error ?? 'Failed to update product.');
    }
  }

  return (
    <>
      <Navbar />

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editProduct && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditProduct(null); }}
        >
          <div style={{
            background: 'var(--bg-card, #fff)',
            borderRadius: 16,
            padding: '2rem',
            width: '100%',
            maxWidth: 680,
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit Product <span style={{ color: 'var(--color-primary, #c0392b)', fontStyle: 'italic' }}>#{editProduct.product_id}</span></h2>
              <button
                onClick={() => setEditProduct(null)}
                style={{
                  background: 'none', border: 'none', fontSize: '1.5rem',
                  cursor: 'pointer', color: '#888', lineHeight: 1,
                }}
                aria-label="Close edit modal"
              >×</button>
            </div>

            {editError && <div className="alert alert-danger">{editError}</div>}
            {editSuccess && <div className="alert alert-success">{editSuccess}</div>}

            <form onSubmit={handleEditSave} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input className="form-control" required value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={editForm.category_id}
                    onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}>
                    {categories.map((c: ProductCategory) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Default Price (DA)</label>
                  <input type="number" step="0.01" min="0" className="form-control" required
                    value={editForm.default_selling_price}
                    onChange={e => setEditForm({ ...editForm, default_selling_price: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Store Location</label>
                  <input className="form-control" value={editForm.store_location}
                    onChange={e => setEditForm({ ...editForm, store_location: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tax Category</label>
                  <select className="form-control" required value={editForm.tax_category_id}
                    onChange={e => setEditForm({ ...editForm, tax_category_id: e.target.value })}>
                    <option value="">Select…</option>
                    {taxCats.map(t => (
                      <option key={t.tax_category_id} value={t.tax_category_id}>
                        {t.name} ({t.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Min Stock Threshold</label>
                  <input type="number" min="0" className="form-control"
                    value={editForm.min_stock_threshold}
                    onChange={e => setEditForm({ ...editForm, min_stock_threshold: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Description</label>
                  <textarea className="form-control" rows={2} value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Image URL</label>
                  <input className="form-control" placeholder="https://…" value={editForm.img_url}
                    onChange={e => setEditForm({ ...editForm, img_url: e.target.value })} />
                </div>
                {editForm.img_url && (
                  <div className="form-group" style={{ flex: '0 0 auto' }}>
                    <label>Preview</label>
                    <img src={editForm.img_url} alt="preview"
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={() => setEditProduct(null)}
                  style={{ background: '#eee', color: '#333' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page body ──────────────────────────────────────────────────────── */}
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Product Management</h1>

        {/* Add product form */}
        <div className="admin-form-card">
          <h2>Add New Product</h2>
          {addError && <div className="alert alert-danger">{addError}</div>}
          {addSuccess && <div className="alert alert-success">{addSuccess}</div>}
          <form onSubmit={handleAdd} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Name</label><input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-group"><label>Category</label>
                <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  {categories.map((c: ProductCategory) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Default Price (DA)</label><input type="number" step="0.01" min="0" className="form-control" required value={form.default_selling_price} onChange={e => setForm({ ...form, default_selling_price: e.target.value })} /></div>
              <div className="form-group"><label>Store Location</label><input className="form-control" value={form.store_location} onChange={e => setForm({ ...form, store_location: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Tax Category</label>
                <select className="form-control" required value={form.tax_category_id} onChange={e => setForm({ ...form, tax_category_id: e.target.value })}>
                  <option value="">Select…</option>
                  {taxCats.map(t => <option key={t.tax_category_id} value={t.tax_category_id}>{t.name} ({t.rate}%)</option>)}
                </select>
              </div>
              <div className="form-group"><label>Min Stock Threshold</label><input type="number" min="0" className="form-control" value={form.min_stock_threshold} onChange={e => setForm({ ...form, min_stock_threshold: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}><label>Description</label><textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Image URL</label><input className="form-control" placeholder="https://…" value={form.img_url} onChange={e => setForm({ ...form, img_url: e.target.value })} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Add Product</button>
          </form>
        </div>

        {/* Product list */}
        <h2 className="section-title">All Products ({products.length})</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Category</th>
              <th>Price</th>
              <th>Tax</th>
              <th>Location</th>
              <th>Stock</th>
              <th>Min</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.product_id}>
                <td>
                  {p.img_url
                    ? <img src={p.img_url} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    : <span style={{ color: '#aaa' }}>—</span>}
                </td>
                <td>{p.name}</td>
                <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{p.description || '—'}</td>
                <td>{p.category}</td>
                <td>{Number(p.default_selling_price).toFixed(2)} DA</td>
                <td>{p.tax_category_name} ({p.tax_rate}%)</td>
                <td>{p.store_location || '—'}</td>
                <td>{p.total_stock ?? 0}</td>
                <td>{p.min_stock_threshold}</td>
                <td>
                  <button
                    onClick={() => openEdit(p)}
                    className="btn btn-primary"
                    style={{ padding: '0.3rem 0.75rem', fontSize: '0.82rem' }}
                  >
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
