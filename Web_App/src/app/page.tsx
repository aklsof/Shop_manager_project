'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product } from '@/lib/types';
import { useLang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';


export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [id: number]: number }>({});
  const router = useRouter();
  const { t } = useLang();
  const { fmt } = useTheme();

  // Load cart from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('akli_cart');
    if (saved) setCart(JSON.parse(saved));
    // Load categories dynamically
    fetch('/api/categories')
      .then(r => r.json())
      .then((cats: { name: string }[]) => {
        setCategories(['All', ...cats.map(c => c.name)]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = category === 'All' ? '/api/products' : `/api/products?category=${encodeURIComponent(category)}`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [category]);

  function addToCart(product: Product) {
    const updated = { ...cart, [product.product_id]: (cart[product.product_id] || 0) + 1 };
    setCart(updated);
    sessionStorage.setItem('akli_cart', JSON.stringify(updated));
    sessionStorage.setItem('akli_cart_products', JSON.stringify(
      products.reduce((acc, p) => ({ ...acc, [p.product_id]: p }), {})
    ));
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Translate category label (only 'All' needs translation)
  function catLabel(cat: string) {
    return cat === 'All' ? t('cat_all') : cat;
  }

  return (
    <>
      <Navbar />
      <div className="shop-hero">
        <h1>{t('hero_title')}</h1>
        <p>{t('hero_sub')}</p>
      </div>

      <div className="shop-container">
        {/* Category tabs */}
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-tab${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {catLabel(cat)}
            </button>
          ))}
        </div>

        {/* Cart banner */}
        {cartCount > 0 && (
          <div className="cart-banner" onClick={() => router.push('/cart')}>
            🛒 {t('cart_banner', { n: cartCount })}
          </div>
        )}

        {/* Product grid */}
        {loading ? (
          <div className="loading-spinner"><p>{t('loading')}</p></div>
        ) : products.length === 0 ? (
          <div className="empty-state">{t('no_products')}</div>
        ) : (
          <div className="product-grid">
            {products.map(product => (
              <div key={product.product_id} className="product-card">
                {product.has_active_deal ? <span className="deal-badge">{product.rule_type}</span> : null}
                {product.img_url && (
                  <img
                    src={product.img_url}
                    alt={product.name}
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: '8px 8px 0 0', display: 'block' }}
                  />
                )}
                <div className="product-info" onClick={() => router.push(`/product/${product.product_id}`)}>
                  <h3>{product.name}</h3>
                  <p className="product-category">{product.category}</p>
                  <div className="price-row">
                    <span className="price">{fmt(Number(product.effective_price))}</span>
                    {product.has_active_deal ? (
                      <span className="original-price">{fmt(Number(product.default_selling_price))}</span>
                    ) : null}
                  </div>
                  <p className="stock-info">
                    {t('stock')}: <strong>{product.total_stock ?? 0}</strong>
                    {product.total_stock !== undefined && product.total_stock <= (product.min_stock_threshold || 0)
                      ? <span className="low-stock-badge">{t('low_stock')}</span>
                      : null}
                  </p>
                </div>
                <button
                  className="btn-add-cart"
                  onClick={() => addToCart(product)}
                  disabled={!product.total_stock || product.total_stock <= 0}
                >
                  {!product.total_stock || product.total_stock <= 0 ? t('out_of_stock') : t('add_to_cart')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
