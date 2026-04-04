'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface POSProduct {
  product_id: number;
  product_name: string;
  category: string;
  effective_price: number;
  tax_rate: number;
  total_stock: number;
  has_active_deal: number;
}

export default function POSTerminalPage() {
  const router = useRouter();
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [cart, setCart] = useState<{ product_id: number; name: string; quantity: number; price: number; tax_rate: number }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetch('/api/session').then(r => r.json()).then(d => { if (!d.user || d.user.role !== 'Administrator') router.push('/login'); });
    fetchProducts();
  }, [router]);

  async function fetchProducts() {
    setLoading(true);
    const res = await fetch('/api/admin/pos/products');
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  function addToCart(p: POSProduct) {
    const existing = cart.find(i => i.product_id === p.product_id);
    if (existing) {
        if (existing.quantity >= p.total_stock) { alert('Insufficient stock!'); return; }
        setCart(cart.map(i => i.product_id === p.product_id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
        if (p.total_stock <= 0) { alert('Out of stock!'); return; }
        setCart([...cart, { product_id: p.product_id, name: p.product_name, quantity: 1, price: Number(p.effective_price), tax_rate: Number(p.tax_rate) }]);
    }
  }

  function removeFromCart(productId: number) {
    setCart(cart.filter(i => i.product_id !== productId).map(i => i.product_id === productId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  }

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalTax = cart.reduce((acc, i) => acc + (i.price * i.quantity * i.tax_rate / 100), 0);
  const total = subtotal + totalTax;

  async function handleCheckout() {
    if (cart.length === 0) return;
    setProcessing(true);
    const res = await fetch('/api/admin/pos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })) })
    });
    const data = await res.json();
    setProcessing(false);
    if (res.ok) {
        alert('Sale completed successfully! Transaction ID: ' + data.transaction_id);
        setCart([]);
        fetchProducts();
    } else {
        alert(data.error);
    }
  }

  const filtered = products.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <a href="/admin" className="btn-back">← Dashboard</a>
        <h1 className="admin-title">💻 Web POS Terminal</h1>

        <div className="pos-layout">
          {/* Products Sidebar */}
          <div className="pos-products">
            <input type="text" className="form-control pos-search" placeholder="Search product or category…" value={search} onChange={e => setSearch(e.target.value)} />
            {loading ? <p>Loading catalog…</p> : (
              <div className="product-grid-sm">
                {filtered.map(p => (
                  <div key={p.product_id} className={`product-tile ${p.total_stock <= 0 ? 'out-of-stock' : ''}`} onClick={() => addToCart(p)}>
                    <div className="tile-name">{p.product_name}</div>
                    <div className="tile-category">{p.category}</div>
                    <div className="tile-price"><strong>{Number(p.effective_price).toFixed(2)} DA</strong></div>
                    <div className="tile-stock">Qty: {p.total_stock}</div>
                    {p.has_active_deal === 1 && <span className="deal-star">★</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Panel */}
          <div className="pos-cart">
             <h2>🧾 Current Selection</h2>
             <div className="cart-list">
               {cart.length === 0 ? <p className="empty-cart-msg">No items selected</p> : cart.map(i => (
                 <div key={i.product_id} className="cart-row">
                    <div className="cart-row-details">
                      <strong>{i.name}</strong>
                      <div style={{ fontSize: '0.8rem' }}>{i.quantity} x {i.price.toFixed(2)} DA (+{i.tax_rate}%)</div>
                    </div>
                    <div className="cart-row-actions">
                       <button className="btn btn-muted btn-xs" onClick={() => removeFromCart(i.product_id)}>—</button>
                    </div>
                 </div>
               ))}
             </div>

             <div className="cart-summary">
                <div className="summary-line"><span>Subtotal</span><span>{subtotal.toFixed(2)} DA</span></div>
                <div className="summary-line"><span>Tax</span><span>{totalTax.toFixed(2)} DA</span></div>
                <div className="summary-line total-line"><span>Total</span><span>{total.toFixed(2)} DA</span></div>
             </div>

             <button className="btn btn-primary btn-full checkout-btn" disabled={cart.length === 0 || processing} onClick={handleCheckout}>
               {processing ? 'Processing…' : 'Finalize Sale'}
             </button>
             <button className="btn btn-muted btn-full" style={{ marginTop: '0.5rem' }} onClick={() => setCart([])}>Clear Basket</button>
          </div>
        </div>
      </div>
      <Footer />
      <style jsx>{`
        .pos-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; height: calc(100vh - 250px); }
        .pos-products { display: flex; flex-direction: column; overflow: hidden; }
        .pos-search { margin-bottom: 1rem; border-radius: 20px; padding: 10px 20px; }
        .product-grid-sm { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; overflow-y: auto; padding-right: 5px; }
        .product-tile { background: #fdfdfd; border: 1px solid #eee; padding: 10px; border-radius: 8px; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; position: relative; }
        .product-tile:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .product-tile.out-of-stock { opacity: 0.5; cursor: not-allowed; }
        .tile-name { font-weight: bold; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tile-category { font-size: 0.75rem; color: #7f8c8d; text-transform: uppercase; }
        .tile-price { color: #e74c3c; margin-top: 4px; }
        .tile-stock { font-size: 0.75rem; color: #2c3e50; }
        .deal-star { position: absolute; top: 5px; right: 8px; color: #f1c40f; font-size: 1.2rem; }
        
        .pos-cart { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .cart-list { flex: 1; overflow-y: auto; margin-bottom: 1rem; }
        .cart-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f9f9f9; }
        .btn-xs { padding: 2px 8px; font-size: 0.8rem; }
        .cart-summary { border-top: 2px solid #f1f1f1; padding-top: 1rem; margin-bottom: 1rem; }
        .summary-line { display: flex; justify-content: space-between; color: #7f8c8d; font-size: 0.9rem; margin-bottom: 4px; }
        .total-line { color: #2c3e50; font-weight: bold; font-size: 1.1rem; border-top: 1px dashed #eee; padding-top: 8px; margin-top: 8px; }
        .checkout-btn { height: 50px; font-size: 1.1rem; }
        .empty-cart-msg { text-align: center; color: #999; margin-top: 2rem; font-style: italic; }
      `}</style>
    </>
  );
}
