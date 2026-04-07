'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FinancialReport } from '@/lib/types';
import { useTheme } from '@/lib/theme';

interface Totals { revenue: number; cogs: number; tax_collected: number; net_profit: number; }

export default function AdminReportsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FinancialReport[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const { fmt } = useTheme();

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); else loadReport(); });
  }, [router]);

  function loadReport() {
    setLoading(true);
    let url = '/api/admin/reports';
    if (from && to) url += `?from=${from}&to=${to}`;
    fetch(url).then(r => r.json()).then(data => { setRows(data.rows || []); setTotals(data.totals || null); setLoading(false); });
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">Financial Reports</h1>

        {/* Date filter */}
        <div className="admin-form-card">
          <div className="form-row" style={{ alignItems: 'flex-end' }}>
            <div className="form-group"><label>From</label><input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="form-group"><label>To</label><input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div className="form-group"><button className="btn btn-primary" onClick={loadReport}>Filter</button></div>
          </div>
        </div>

        {/* Totals summary */}
        {totals && (
          <div className="report-summary">
            <div className="summary-card"><div className="summary-label">Total Revenue</div><div className="summary-value revenue">{fmt(totals.revenue)}</div></div>
            <div className="summary-card"><div className="summary-label">Total COGS</div><div className="summary-value cogs">{fmt(totals.cogs)}</div></div>
            <div className="summary-card"><div className="summary-label">Tax Collected</div><div className="summary-value">{fmt(totals.tax_collected)}</div></div>
            <div className="summary-card"><div className="summary-label">Net Profit</div><div className="summary-value profit" style={{ color: totals.net_profit >= 0 ? '#27ae60' : '#c0392b' }}>{fmt(totals.net_profit)}</div></div>
          </div>
        )}

        {/* Detail table */}
        {loading ? <p>Loading…</p> : (
          <table className="admin-table">
            <thead><tr><th>Date</th><th>Product</th><th>Category</th><th>Sold</th><th>Refunded</th><th>Revenue</th><th>COGS</th><th>Tax</th><th>Net Profit</th></tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center' }}>No data yet</td></tr> :
                rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.sale_date}</td>
                    <td>{r.product_name}</td>
                    <td>{r.category}</td>
                    <td>{r.units_sold}</td>
                    <td>{r.units_refunded}</td>
                    <td>{fmt(r.revenue)}</td>
                    <td>{fmt(r.cogs)}</td>
                    <td>{fmt(r.tax_collected)}</td>
                    <td style={{ color: r.net_profit >= 0 ? '#27ae60' : '#c0392b', fontWeight: 700 }}>{fmt(r.net_profit)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      <Footer />
    </>
  );
}
