'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product, TaxCategory } from '@/lib/types';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [taxCats, setTaxCats] = useState<TaxCategory[]>([]);
  const [form, setForm] = useState({ name: '', category: 'Cigarettes', default_selling_price: '', store_location: '', tax_category_id: '', min_stock_threshold: '0' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const CATEGORIES = ['Cigarettes', 'Drinks', 'Snacks'];

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'Administrator') router.push('/login');
    });
    fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    fetch('/api/admin/tax-categories').then(r => r.json()).then(setTaxCats);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, default_selling_price: Number(form.default_selling_price), tax_category_id: Number(form.tax_category_id), min_stock_threshold: Number(form.min_stock_threshold) })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess('Product added!');
      setForm({ name: '', category: 'Cigarettes', default_selling_price: '', store_location: '', tax_category_id: '', min_stock_threshold: '0' });
      fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    } else setError(data.error);
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Product Management</h1>

        {/* Add product form */}
        <div className="admin-form-card">
          <h2>Add New Product</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Name</label><input className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div className="form-group"><label>Category</label>
                <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Default Price (DA)</label><input type="number" step="0.01" min="0" className="form-control" required value={form.default_selling_price} onChange={e => setForm({...form, default_selling_price: e.target.value})} /></div>
              <div className="form-group"><label>Store Location</label><input className="form-control" value={form.store_location} onChange={e => setForm({...form, store_location: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Tax Category</label>
                <select className="form-control" required value={form.tax_category_id} onChange={e => setForm({...form, tax_category_id: e.target.value})}>
                  <option value="">Select…</option>
                  {taxCats.map(t => <option key={t.tax_category_id} value={t.tax_category_id}>{t.name} ({t.rate}%)</option>)}
                </select>
              </div>
              <div className="form-group"><label>Min Stock Threshold</label><input type="number" min="0" className="form-control" value={form.min_stock_threshold} onChange={e => setForm({...form, min_stock_threshold: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Add Product</button>
          </form>
        </div>

        {/* Product list */}
        <h2 className="section-title">All Products ({products.length})</h2>
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Tax</th><th>Location</th><th>Stock</th><th>Min</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.product_id}>
                <td>{p.name}</td><td>{p.category}</td>
                <td>{Number(p.default_selling_price).toFixed(2)} DA</td>
                <td>{p.tax_category_name} ({p.tax_rate}%)</td>
                <td>{p.store_location || '—'}</td>
                <td>{p.total_stock ?? 0}</td>
                <td>{p.min_stock_threshold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
