'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product, InventoryLot } from '@/lib/types';
import { useTheme } from '@/lib/theme';

export default function AdminStockPage() {
  const router = useRouter();
  const { fmt } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [form, setForm] = useState({ product_id: '', buying_price: '', quantity: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); });
    fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    fetch('/api/admin/stock').then(r => r.json()).then(setLots);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/stock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: Number(form.product_id), buying_price: Number(form.buying_price), quantity: Number(form.quantity) })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(`Lot #${data.lot_id} created!`);
      setForm({ product_id: '', buying_price: '', quantity: '' });
      fetch('/api/admin/stock').then(r => r.json()).then(setLots);
    } else setError(data.error);
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Stock Management</h1>
        <div className="admin-form-card">
          <h2>Receive New Stock</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Product</label>
                <select className="form-control" required value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name} ({p.category})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Buying Price (DA)</label><input type="number" step="0.01" min="0.01" className="form-control" required value={form.buying_price} onChange={e => setForm({...form, buying_price: e.target.value})} /></div>
              <div className="form-group"><label>Quantity</label><input type="number" min="1" className="form-control" required value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Add Inventory Lot</button>
          </form>
        </div>
        <h2 className="section-title">Inventory Lots</h2>
        <table className="admin-table">
          <thead><tr><th>Lot ID</th><th>Product</th><th>Category</th><th>Quantity</th><th>Buying Price</th><th>Date Received</th></tr></thead>
          <tbody>
            {lots.map((l: InventoryLot & { product_name?: string; category?: string }) => (
              <tr key={l.lot_id}>
                <td>#{l.lot_id}</td>
                <td>{l.product_name}</td>
                <td>{l.category}</td>
                <td>{l.quantity}</td>
                <td>{fmt(Number(l.buying_price))}</td>
                <td>{new Date(l.date_received).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
