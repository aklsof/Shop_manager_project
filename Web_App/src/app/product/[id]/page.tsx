'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product } from '@/lib/types';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { fmt } = useTheme();
  const { t } = useLang();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(data => { setProduct(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  function addToCart() {
    if (!product) return;
    const saved = sessionStorage.getItem('akli_cart');
    const cart = saved ? JSON.parse(saved) : {};
    cart[product.product_id] = (cart[product.product_id] || 0) + 1;
    sessionStorage.setItem('akli_cart', JSON.stringify(cart));

    const savedProds = sessionStorage.getItem('akli_cart_products');
    const prods = savedProds ? JSON.parse(savedProds) : {};
    prods[product.product_id] = product;
    sessionStorage.setItem('akli_cart_products', JSON.stringify(prods));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <><Navbar /><div className="shop-container"><p>{t('loading')}</p></div><Footer /></>;
  if (!product) return <><Navbar /><div className="shop-container"><p>{t('product_not_found')}</p></div><Footer /></>;

  return (
    <>
      <Navbar />
      <div className="shop-container">
        <button className="btn-back" onClick={() => router.push('/')}>{t('back_to_shop')}</button>
        <div className="product-detail-card">
          {product.has_active_deal ? <span className="deal-badge">{product.rule_type}</span> : null}
          {product.img_url && (
            <img
              src={product.img_url}
              alt={product.name}
              style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }}
            />
          )}
          <h1>{product.name}</h1>
          <p className="product-category">{product.category}</p>
          {product.description && (
            <p style={{ color: '#475569', marginBottom: 12, lineHeight: 1.6 }}>{product.description}</p>
          )}
          <div className="price-row">
            <span className="price price-lg">{fmt(Number(product.effective_price))}</span>
            {product.has_active_deal
              ? <span className="original-price">{t('was')} {fmt(Number(product.default_selling_price))}</span>
              : null}
          </div>
          <div className="product-meta">
            <div><strong>{t('location')}</strong> {product.store_location || 'N/A'}</div>
            <div><strong>{t('tax')}</strong> {product.tax_category_name} ({product.tax_rate}%)</div>
            <div>
              <strong>{t('stock_colon')}</strong> {product.total_stock ?? 0}
              {product.total_stock !== undefined && product.total_stock <= (product.min_stock_threshold || 0)
                ? <span className="low-stock-badge"> {t('low_stock')}</span> : null}
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="btn-add-cart"
              onClick={addToCart}
              disabled={!product.total_stock || product.total_stock <= 0}
            >
              {added ? t('added_to_cart') : !product.total_stock || product.total_stock <= 0 ? t('out_of_stock') : t('add_to_cart')}
            </button>
            <button className="btn-view-cart" onClick={() => router.push('/cart')}>{t('view_cart')}</button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
