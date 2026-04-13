'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LowStockAlert } from '@/lib/types';
import { useLang } from '@/lib/i18n';

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLang();
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
    { href: '/admin/pos', label: t('pos_terminal'), desc: t('pos_desc') },
    { href: '/admin/orders', label: t('web_orders'), desc: t('web_orders_desc') },
    { href: '/admin/products', label: t('products_mgmt'), desc: t('products_desc') },
    { href: '/admin/categories', label: t('categories_mgmt'), desc: t('categories_desc') },
    { href: '/admin/stock', label: t('stock_mgmt'), desc: t('stock_desc') },
    { href: '/admin/adjustments', label: t('adjustments_mgmt'), desc: t('adjustments_desc') },
    { href: '/admin/price-rules', label: t('price_rules'), desc: t('price_rules_desc') },
    { href: '/admin/users', label: t('users_mgmt'), desc: t('users_desc') },
    { href: '/admin/statistics', label: t('statistics'), desc: t('statistics_desc') },
    { href: '/admin/reports', label: t('reports'), desc: t('reports_desc') },
    { href: '/admin/tax-categories', label: t('tax_categories'), desc: t('tax_categories_desc') },
    { href: '/admin/settings', label: t('settings_mgmt'), desc: t('settings_desc') },
  ];

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <h1 className="admin-title">{t('admin_dashboard')}</h1>

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
        <h2 className="section-title">{t('low_stock_alerts')}</h2>
        {loading ? (
          <p>{t('loading')}</p>
        ) : alerts.length === 0 ? (
          <p className="empty-state">{t('all_stocked')}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>{t('product_name')}</th><th>{t('category')}</th><th>{t('location')}</th><th>{t('stock')}</th><th>{t('min_threshold')}</th><th>{t('shortage')}</th></tr>
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
