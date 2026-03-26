'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { TaxCategory } from '@/lib/types';

export default function AdminTaxCategoriesPage() {
  const router = useRouter();
  const [cats, setCats] = useState<TaxCategory[]>([]);
  const [form, setForm] = useState({ name: '', rate: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => fetch('/api/admin/tax-categories').then(r => r.json()).then(setCats);

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); else load(); });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/tax-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, rate: Number(form.rate) }) });
    const data = await res.json();
    if (res.ok) { setSuccess('Tax category created!'); setForm({ name: '', rate: '' }); load(); }
    else setError(data.error);
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Tax Categories</h1>
        <div className="admin-form-card">
          <h2>Add Tax Category</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Name</label><input className="form-control" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Standard, Tobacco" /></div>
              <div className="form-group"><label>Rate (%)</label><input type="number" step="0.01" min="0" max="100" className="form-control" required value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} /></div>
            </div>
            <button type="submit" className="btn btn-primary">Add Tax Category</button>
          </form>
        </div>
        <h2 className="section-title">Current Tax Categories</h2>
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Name</th><th>Rate</th><th>Created</th></tr></thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.tax_category_id}>
                <td>{c.tax_category_id}</td>
                <td>{c.name}</td>
                <td>{c.rate}%</td>
                <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
