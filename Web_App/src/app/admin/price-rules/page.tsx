'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product, PriceRule } from '@/lib/types';

export default function AdminPriceRulesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [form, setForm] = useState({ product_id: '', rule_type: 'Deal', promotional_price: '', start_date: '', end_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const RULE_TYPES = ['Deal', 'Rollback', 'Clearance', 'Holiday'];

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); });
    fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    fetch('/api/admin/price-rules').then(r => r.json()).then(setRules);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/price-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, product_id: Number(form.product_id), promotional_price: Number(form.promotional_price) })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(`Price rule #${data.rule_id} created!`);
      setForm({ product_id: '', rule_type: 'Deal', promotional_price: '', start_date: '', end_date: '' });
      fetch('/api/admin/price-rules').then(r => r.json()).then(setRules);
    } else setError(data.error);
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Price Rules</h1>
        <div className="admin-form-card">
          <h2>Create Pricing Rule</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Product</label>
                <select className="form-control" required value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Rule Type</label>
                <select className="form-control" value={form.rule_type} onChange={e => setForm({...form, rule_type: e.target.value})}>
                  {RULE_TYPES.map(rt => <option key={rt}>{rt}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Promotional Price (DA)</label><input type="number" step="0.01" min="0" className="form-control" required value={form.promotional_price} onChange={e => setForm({...form, promotional_price: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Start Date &amp; Time</label><input type="datetime-local" className="form-control" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
              <div className="form-group"><label>End Date &amp; Time</label><input type="datetime-local" className="form-control" required value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Create Rule</button>
          </form>
        </div>
        <h2 className="section-title">Active & History ({rules.length})</h2>
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Type</th><th>Promo Price</th><th>Start</th><th>End</th><th>Active</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.rule_id}>
                <td>{r.product_name}</td>
                <td><span className="deal-badge">{r.rule_type}</span></td>
                <td>{Number(r.promotional_price).toFixed(2)} DA</td>
                <td>{new Date(r.start_date).toLocaleString()}</td>
                <td>{new Date(r.end_date).toLocaleString()}</td>
                <td>{r.is_active ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
