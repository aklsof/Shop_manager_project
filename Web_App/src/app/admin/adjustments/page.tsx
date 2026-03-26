'use client';

import { useEffect, useState } from 'next';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface AdjustmentLog { adjustment_id: number; adjustment_date: string; adjusted_by: string; product_name: string; lot_id: number; quantity_adjusted: number; adjustment_type: string; reason: string; }
interface Lot { lot_id: number; product_name: string; quantity: number; date_received: string; }

export default function AdminAdjustmentsPage() {
  const router = useRouter();
  const [lots, setLots] = useState<Lot[]>([]);
  const [log, setLog] = useState<AdjustmentLog[]>([]);
  const [form, setForm] = useState({ lot_id: '', quantity_adjusted: '', reason: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); });
    fetch('/api/admin/stock').then(r => r.json()).then(setLots);
    fetch('/api/admin/adjustments').then(r => r.json()).then(setLog);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    const res = await fetch('/api/admin/adjustments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: Number(form.lot_id), quantity_adjusted: Number(form.quantity_adjusted), reason: form.reason })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess('Adjustment recorded!');
      setForm({ lot_id: '', quantity_adjusted: '', reason: '' });
      fetch('/api/admin/adjustments').then(r => r.json()).then(setLog);
    } else setError(data.error);
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Inventory Adjustments</h1>
        <div className="admin-form-card">
          <h2>Record Adjustment (Shrinkage / Damage)</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group"><label>Lot</label>
                <select className="form-control" required value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})}>
                  <option value="">Select lot…</option>
                  {lots.map((l: Lot & { product_name?: string }) => <option key={l.lot_id} value={l.lot_id}>Lot #{l.lot_id} — {l.product_name} (qty: {l.quantity})</option>)}
                </select>
              </div>
              <div className="form-group"><label>Qty Adjusted (negative = remove)</label><input type="number" className="form-control" required value={form.quantity_adjusted} onChange={e => setForm({...form, quantity_adjusted: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>Reason</label><input className="form-control" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g. Damaged goods" /></div>
            <button type="submit" className="btn btn-primary">Record Adjustment</button>
          </form>
        </div>
        <h2 className="section-title">Adjustment Log</h2>
        <table className="admin-table">
          <thead><tr><th>#</th><th>Date</th><th>By</th><th>Product</th><th>Lot</th><th>Qty</th><th>Type</th><th>Reason</th></tr></thead>
          <tbody>
            {log.map(a => (
              <tr key={a.adjustment_id}>
                <td>{a.adjustment_id}</td>
                <td>{new Date(a.adjustment_date).toLocaleDateString()}</td>
                <td>{a.adjusted_by}</td>
                <td>{a.product_name}</td>
                <td>#{a.lot_id}</td>
                <td style={{ color: a.quantity_adjusted > 0 ? '#27ae60' : '#c0392b', fontWeight: 700 }}>{a.quantity_adjusted > 0 ? '+' : ''}{a.quantity_adjusted}</td>
                <td>{a.adjustment_type}</td>
                <td>{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );
}
