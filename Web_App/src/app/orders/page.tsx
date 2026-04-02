'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { WebOrder } from '@/lib/types';
import { useLang } from '@/lib/i18n';

export default function OrdersPage() {
  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function translateStatus(status: string) {
    if (status === 'Pending') return t('pending');
    if (status === 'Ready for Pickup') return t('ready_for_pickup');
    if (status === 'Completed') return t('completed');
    return status;
  }

  const statusColor = (s: string) =>
    s === 'Completed' ? '#27ae60' : s === 'Ready for Pickup' ? '#f39c12' : '#2980b9';

  return (
    <>
      <Navbar />
      <div className="shop-container">
        <h1 className="page-title">{t('orders_title')}</h1>
        {loading ? (
          <div className="loading-spinner"><p>{t('loading')}</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">{t('cart_empty')} <a href="/">{t('nav_shop')}</a></div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.order_id} className="order-card">
                <div className="order-header">
                  <span className="order-id">{t('order_id')}{order.order_id}</span>
                  <span className="order-status" style={{ color: statusColor(order.status) }}>
                    ● {translateStatus(order.status)}
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
