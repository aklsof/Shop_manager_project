'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Product } from '@/lib/types';

export default function ProductPage() {
  const { id } = useParams();
  const router = useRouter();
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

  if (loading) return <><Navbar /><div className="shop-container"><p>Loading…</p></div><Footer /></>;
  if (!product) return <><Navbar /><div className="shop-container"><p>Product not found.</p></div><Footer /></>;

  return (
    <>
      <Navbar />
      <div className="shop-container">
        <button className="btn-back" onClick={() => router.push('/')}>← Back to Shop</button>
        <div className="product-detail-card">
          {product.has_active_deal ? <span className="deal-badge">{product.rule_type}</span> : null}
          <h1>{product.name}</h1>
          <p className="product-category">{product.category}</p>
          <div className="price-row">
            <span className="price price-lg">{Number(product.effective_price).toFixed(2)} DA</span>
            {product.has_active_deal
              ? <span className="original-price">Was {Number(product.default_selling_price).toFixed(2)} DA</span>
              : null}
          </div>
          <div className="product-meta">
            <div><strong>Location:</strong> {product.store_location || 'N/A'}</div>
            <div><strong>Tax:</strong> {product.tax_category_name} ({product.tax_rate}%)</div>
            <div>
              <strong>Stock:</strong> {product.total_stock ?? 0}
              {product.total_stock !== undefined && product.total_stock <= (product.min_stock_threshold || 0)
                ? <span className="low-stock-badge"> Low Stock</span> : null}
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="btn-add-cart"
              onClick={addToCart}
              disabled={!product.total_stock || product.total_stock <= 0}
            >
              {added ? '✓ Added to Cart!' : !product.total_stock || product.total_stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button className="btn-view-cart" onClick={() => router.push('/cart')}>View Cart</button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
