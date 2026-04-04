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
  const [form, setForm] = useState({ product_id: '', rule_type: 'Deal', promotional_price: '', start_date: '', end_date: '', is_active: true });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const RULE_TYPES = ['Deal', 'Rollback', 'Clearance', 'Holiday'];

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); });
    refreshData();
  }, [router]);

  function refreshData() {
    fetch('/api/admin/products').then(r => r.json()).then(setProducts);
    fetch('/api/admin/price-rules').then(r => r.json()).then(setRules);
  }

  function formatForInput(dateStr: string) {
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const url = editingRuleId ? `/api/admin/price-rules/${editingRuleId}` : '/api/admin/price-rules';
    const method = editingRuleId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...form, 
        product_id: Number(form.product_id), 
        promotional_price: Number(form.promotional_price),
        is_active: form.is_active ? 1 : 0
      })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(editingRuleId ? 'Price rule updated!' : `Price rule #${data.rule_id} created!`);
      setForm({ product_id: '', rule_type: 'Deal', promotional_price: '', start_date: '', end_date: '', is_active: true });
      setEditingRuleId(null);
      refreshData();
    } else setError(data.error);
  }

  async function handleDelete(ruleId: number) {
    if (!confirm('Are you sure you want to delete this price rule?')) return;
    const res = await fetch(`/api/admin/price-rules/${ruleId}`, { method: 'DELETE' });
    if (res.ok) {
      setSuccess('Rule deleted.');
      refreshData();
    } else {
      const d = await res.json();
      setError(d.error);
    }
  }

  function handleEditClick(r: PriceRule) {
    setEditingRuleId(r.rule_id);
    setForm({
      product_id: r.product_id.toString(),
      rule_type: r.rule_type,
      promotional_price: r.promotional_price.toString(),
      start_date: formatForInput(r.start_date),
      end_date: formatForInput(r.end_date),
      is_active: r.is_active === 1
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Price Rules</h1>
        <div className="admin-form-card">
          <h2>{editingRuleId ? 'Edit Pricing Rule' : 'Create Pricing Rule'}</h2>
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
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '30px' }}>
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                <label htmlFor="is_active" style={{ margin: 0 }}>Active</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary">{editingRuleId ? 'Update Rule' : 'Create Rule'}</button>
                {editingRuleId && <button type="button" className="btn btn-muted" onClick={() => { setEditingRuleId(null); setForm({ product_id: '', rule_type: 'Deal', promotional_price: '', start_date: '', end_date: '', is_active: true }); }}>Cancel</button>}
            </div>
          </form>
        </div>
        <h2 className="section-title">Active & History ({rules.length})</h2>
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Type</th><th>Promo Price</th><th>Start</th><th>End</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.rule_id} className={editingRuleId === r.rule_id ? 'editing-row' : ''}>
                <td>{r.product_name}</td>
                <td><span className="deal-badge">{r.rule_type}</span></td>
                <td>{Number(r.promotional_price).toFixed(2)} DA</td>
                <td>{new Date(r.start_date).toLocaleString()}</td>
                <td>{new Date(r.end_date).toLocaleString()}</td>
                <td>{r.is_active ? '✅' : '❌'}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-muted btn-xs" onClick={() => handleEditClick(r)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDelete(r.rule_id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
      <style jsx>{`
        .action-btns { display: flex; gap: 5px; }
        .btn-xs { padding: 4px 8px; font-size: 0.75rem; }
        .editing-row { background-color: #f0f7ff; }
      `}</style>
    </>
  );
}
