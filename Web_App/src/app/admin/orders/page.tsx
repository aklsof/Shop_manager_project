'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface WebOrder {
  order_id: number;
  status: string;
  order_date: string;
  client_username: string;
  items: { product_name: string; quantity: number; price: number }[];
  total: number;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => {
      if (!d.user || d.user.role !== 'Administrator') router.push('/login');
    });
    fetchOrders();
  }, [router]);

  async function fetchOrders() {
    setLoading(true);
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  }

  async function updateStatus(order_id: number, new_status: string) {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, new_status })
    });
    const data = await res.json();
    if (res.ok) {
        fetchOrders();
    } else {
        alert(data.error);
    }
  }

  const filteredOrders = filter === 'All' ? orders : orders.filter(o => o.status === filter);

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">🌐 Web Orders Dashboard</h1>

        <div className="filter-row" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span>Filter:</span>
          {['All', 'Pending', 'Ready for Pickup', 'Completed'].map(f => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
          <button className="btn btn-muted" style={{ marginLeft: 'auto' }} onClick={fetchOrders}>Refresh Now</button>
        </div>

        {loading ? (
          <p>Loading orders…</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.order_id} style={{ opacity: o.status === 'Completed' ? 0.7 : 1 }}>
                    <td>{o.order_id}</td>
                    <td>{new Date(o.order_date).toLocaleDateString()} {new Date(o.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><span className="client-badge">{o.client_username}</span></td>
                    <td>
                      <div className="order-items-summary">
                        {o.items.map((i, idx) => (
                           <div key={idx} className="order-item-chip">{i.product_name} x{i.quantity}</div>
                        ))}
                      </div>
                    </td>
                    <td><strong>{Number(o.total).toFixed(2)} DA</strong></td>
                    <td>
                       <span className={`status-badge status-${o.status.toLowerCase().replace(/ /g, '-')}`}>
                         {o.status}
                       </span>
                    </td>
                    <td>
                      {o.status === 'Pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(o.order_id, 'Ready for Pickup')}>Mark Ready</button>
                      )}
                      {o.status === 'Ready for Pickup' && (
                        <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.order_id, 'Completed')}>Complete Checkout</button>
                      )}
                      {o.status === 'Completed' && (
                        <span style={{ fontSize: '0.8rem', color: '#999' }}>Finished</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Footer />
      <style jsx>{`
        .client-badge { background: #ecf0f1; border-radius: 4px; padding: 2px 6px; font-size: 0.85rem; font-weight: bold; }
        .order-items-summary { display: flex; flex-wrap: wrap; gap: 4px; max-width: 300px; }
        .order-item-chip { font-size: 0.75rem; background: #fff; border: 1px solid #ddd; padding: 1px 5px; border-radius: 3px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-ready-for-pickup { background: #d1ecf1; color: #0c5460; }
        .status-completed { background: #d4edda; color: #155724; }
        .btn-sm { padding: 4px 8px; font-size: 0.75rem; }
      `}</style>
    </>
  );
}
