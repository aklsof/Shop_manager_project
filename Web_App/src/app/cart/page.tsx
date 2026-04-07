'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CartItem, Product } from '@/lib/types';
import { useLang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

export default function CartPage() {
  const router = useRouter();
  const { t } = useLang();
  const { fmt } = useTheme();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const savedCart = sessionStorage.getItem('akli_cart');
    const savedProds = sessionStorage.getItem('akli_cart_products');
    if (!savedCart || !savedProds) return;
    const cart: { [id: string]: number } = JSON.parse(savedCart);
    const prods: { [id: string]: Product } = JSON.parse(savedProds);
    const items: CartItem[] = Object.entries(cart)
      .filter(([id]) => prods[id])
      .map(([id, qty]) => ({
        product_id: Number(id),
        name: prods[id].name,
        effective_price: Number(prods[id].effective_price ?? prods[id].default_selling_price),
        quantity: qty,
      }));
    setCartItems(items);
  }, []);

  function updateQty(product_id: number, delta: number) {
    setCartItems(prev => {
      const updated = prev.map(item =>
        item.product_id === product_id
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0);
      // Sync sessionStorage
      const cartMap = updated.reduce((acc, i) => ({ ...acc, [i.product_id]: i.quantity }), {});
      sessionStorage.setItem('akli_cart', JSON.stringify(cartMap));
      return updated;
    });
  }

  const total = cartItems.reduce((sum, i) => sum + i.effective_price * i.quantity, 0);

  async function handleCheckout() {
    setError(''); setLoading(true);
    try {
      const items = cartItems.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price_at_order: i.effective_price,
      }));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        setError(data.error || t('server_error'));
      } else {
        sessionStorage.removeItem('akli_cart');
        sessionStorage.removeItem('akli_cart_products');
        setCartItems([]);
        setSuccess(`${t('order_id')}${data.order_id} — ${t('place_order')} ✓`);
      }
    } catch { setError(t('server_error')); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Navbar />
      <div className="shop-container">
        <h1 className="page-title">{t('cart_title')}</h1>
        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {cartItems.length === 0 && !success ? (
          <div className="empty-state">
            {t('cart_empty')} <a href="/">{t('nav_shop')}</a>
          </div>
        ) : (
          <>
            <div className="cart-list">
              {cartItems.map(item => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                    <span className="qty">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, 1)}>+</button>
                  </div>
                  <div className="cart-item-price">{fmt(item.effective_price * item.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <strong>{t('order_total')}: {fmt(total)}</strong>
            </div>
            <button className="btn-checkout" onClick={handleCheckout} disabled={loading}>
              {loading ? t('placing_order') : `📦 ${t('place_order')}`}
            </button>
          </>
        )}
      </div>
      <Footer />
    </>
  );
}
