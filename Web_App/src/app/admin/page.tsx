'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LowStockAlert } from '@/lib/types';

export default function AdminDashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify admin access
    fetch('/api/session').then(r => r.json()).then(data => {
      if (!data.user || data.user.role !== 'Administrator') { router.push('/login'); return; }
      // Fetch low-stock alerts via products API
      fetch('/api/admin/products').then(r => r.json()).then((products: { product_id: number; product_name: string; category: string; store_location: string; total_stock: number; min_stock_threshold: number }[]) => {
        const lowStock = products
          .filter((p) => Number(p.total_stock) <= Number(p.min_stock_threshold))
          .map((p) => ({
            product_id: p.product_id,
            product_name: p.product_name,
            category: p.category,
            store_location: p.store_location,
            total_stock: Number(p.total_stock),
            min_stock_threshold: Number(p.min_stock_threshold),
            units_below_threshold: Number(p.min_stock_threshold) - Number(p.total_stock),
          }));
        setAlerts(lowStock);
        setLoading(false);
      });
    });
  }, [router]);

  const adminLinks = [
    { href: '/admin/products', label: '📦 Products', desc: 'Add & manage products' },
    { href: '/admin/stock', label: '📥 Stock', desc: 'Receive new inventory' },
    { href: '/admin/adjustments', label: '🔧 Adjustments', desc: 'Shrinkage & damage' },
    { href: '/admin/price-rules', label: '🏷️ Price Rules', desc: 'Deals & promotions' },
    { href: '/admin/users', label: '👥 Users', desc: 'Manage staff accounts' },
    { href: '/admin/reports', label: '📊 Reports', desc: 'Revenue & profit' },
    { href: '/admin/tax-categories', label: '🧾 Tax', desc: 'Tax categories' },
  ];

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <h1 className="admin-title">Admin Dashboard</h1>

        {/* Quick nav */}
        <div className="admin-grid">
          {adminLinks.map(link => (
            <a key={link.href} href={link.href} className="admin-card">
              <div className="admin-card-icon">{link.label}</div>
              <div className="admin-card-desc">{link.desc}</div>
            </a>
          ))}
        </div>

        {/* Low stock alerts */}
        <h2 className="section-title">⚠️ Low Stock Alerts</h2>
        {loading ? (
          <p>Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="empty-state">All products are adequately stocked.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Location</th><th>Stock</th><th>Min Threshold</th><th>Shortage</th></tr>
            </thead>
            <tbody>
              {alerts.map(a => (
                <tr key={a.product_id}>
                  <td>{a.product_name}</td>
                  <td>{a.category}</td>
                  <td>{a.store_location || 'N/A'}</td>
                  <td><span className="low-stock-badge">{a.total_stock}</span></td>
                  <td>{a.min_stock_threshold}</td>
                  <td style={{ color: '#c0392b', fontWeight: 700 }}>-{a.units_below_threshold}</td>
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
