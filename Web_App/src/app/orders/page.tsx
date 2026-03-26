'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { WebOrder } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statusColor = (s: string) =>
    s === 'Completed' ? '#27ae60' : s === 'Ready for Pickup' ? '#f39c12' : '#2980b9';

  return (
    <>
      <Navbar />
      <div className="shop-container">
        <h1 className="page-title">My Orders</h1>
        {loading ? (
          <div className="loading-spinner"><p>Loading…</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders yet. <a href="/">Start shopping</a></div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <span className="order-id">Order #{order.order_id}</span>
                  <span className="order-status" style={{ color: statusColor(order.status) }}>
                    ● {order.status}
                  </span>
                  <span className="order-date">{new Date(order.order_date).toLocaleDateString()}</span>
                </div>
                <div className="order-item-row">
                  <span>{(order as unknown as Record<string, unknown>).product_name as string}</span>
                  <span>×{(order as unknown as Record<string, unknown>).quantity as number}</span>
                  <span>{Number((order as unknown as Record<string, unknown>).price_at_order).toFixed(2)} DA</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
