'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ── Types ────────────────────────────────────────────────────────────────────
interface SeriesRow {
  period_label: string;
  period_key: string;
  total_sales: number;
  total_cogs: number;
  net_profit: number;
  total_tx: number;
  total_refunds: number;
}

interface Totals {
  total_sales: number;
  total_cogs: number;
  net_profit: number;
  total_tx: number;
  total_refunds: number;
  total_units_sold: number;
}

interface TopProduct {
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
}

type Period = 'daily' | 'monthly' | 'yearly';

// ── Colour palette ────────────────────────────────────────────────────────────
const COLORS = {
  sales: '#27ae60',
  cogs: '#c0392b',
  profit: '#2980b9',
  salesLight: 'rgba(39,174,96,0.15)',
  cogsLight: 'rgba(192,57,43,0.15)',
  profitLight: 'rgba(41,128,185,0.15)',
};

// ── Chart helpers ─────────────────────────────────────────────────────────────
function drawBarChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  datasets: { label: string; values: number[]; color: string; lightColor: string }[]
) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const PAD_L = 72, PAD_R = 20, PAD_T = 24, PAD_B = 56;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const allVals = datasets.flatMap(d => d.values);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  // Grid lines
  const steps = 5;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const v = minVal + (range / steps) * i;
    const y = PAD_T + chartH - (v - minVal) / range * chartH;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke();
    ctx.fillText(fmtShort(v), PAD_L - 6, y + 4);
  }

  // Bars
  const groupW = chartW / labels.length;
  const barW = Math.min(groupW / (datasets.length + 1), 28);
  datasets.forEach((ds, di) => {
    ds.values.forEach((val, li) => {
      const x = PAD_L + li * groupW + (di + 0.5) * (groupW / (datasets.length + 1));
      const barH = Math.abs(val - Math.min(minVal, 0)) / range * chartH;
      const y = val >= 0
        ? PAD_T + chartH - (val - Math.min(minVal, 0)) / range * chartH
        : PAD_T + chartH - (0 - Math.min(minVal, 0)) / range * chartH;

      // Bar gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, ds.color);
      grad.addColorStop(1, ds.lightColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x - barW / 2, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
    });
  });

  // X labels
  ctx.fillStyle = '#64748b';
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lbl, li) => {
    const x = PAD_L + li * groupW + groupW / 2;
    ctx.save();
    ctx.translate(x, PAD_T + chartH + 14);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(lbl.length > 8 ? lbl.slice(0, 8) : lbl, 0, 0);
    ctx.restore();
  });

  // Legend
  const legX = PAD_L;
  const legY = PAD_T + chartH + 42;
  datasets.forEach((ds, i) => {
    const bx = legX + i * 130;
    ctx.fillStyle = ds.color;
    ctx.fillRect(bx, legY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ds.label, bx + 16, legY + 10);
  });
}

function drawLineChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  datasets: { label: string; values: number[]; color: string; lightColor: string }[]
) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const PAD_L = 72, PAD_R = 20, PAD_T = 24, PAD_B = 56;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const allVals = datasets.flatMap(d => d.values);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;

  // Grid lines
  const steps = 5;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= steps; i++) {
    const v = minVal + (range / steps) * i;
    const y = PAD_T + chartH - (v - minVal) / range * chartH;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + chartW, y); ctx.stroke();
    ctx.fillText(fmtShort(v), PAD_L - 6, y + 4);
  }

  const step = labels.length > 1 ? chartW / (labels.length - 1) : chartW;

  datasets.forEach(ds => {
    if (ds.values.length === 0) return;
    const pts = ds.values.map((v, i) => ({
      x: PAD_L + i * step,
      y: PAD_T + chartH - (v - minVal) / range * chartH,
    }));

    // Filled area
    const areaGrad = ctx.createLinearGradient(0, PAD_T, 0, PAD_T + chartH);
    areaGrad.addColorStop(0, ds.lightColor);
    areaGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(pts[0].x, PAD_T + chartH);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, PAD_T + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      ctx.bezierCurveTo(cpx, pts[i - 1].y, cpx, pts[i].y, pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  });

  // X labels
  ctx.fillStyle = '#64748b';
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  labels.forEach((lbl, li) => {
    const x = PAD_L + li * step;
    ctx.save();
    ctx.translate(x, PAD_T + chartH + 14);
    ctx.rotate(-Math.PI / 6);
    ctx.fillText(lbl.length > 8 ? lbl.slice(0, 8) : lbl, 0, 0);
    ctx.restore();
  });

  // Legend
  const legX = PAD_L;
  const legY = PAD_T + chartH + 42;
  datasets.forEach((ds, i) => {
    const bx = legX + i * 130;
    ctx.fillStyle = ds.color;
    ctx.fillRect(bx, legY, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ds.label, bx + 16, legY + 10);
  });
}

function drawDonutChart(canvas: HTMLCanvasElement, items: { label: string; value: number; color: string }[]) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const cx = W / 2, cy = H / 2 - 16, r = Math.min(W, H) / 2 - 48;
  const total = items.reduce((s, i) => s + Math.max(i.value, 0), 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;
  items.forEach(item => {
    const slice = (Math.max(item.value, 0) / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    startAngle += slice;
  });

  // Inner white circle (donut hole)
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Centre label
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtShort(total) + ' DA', cx, cy);

  // Legend
  const legStartY = cy + r + 18;
  items.forEach((item, i) => {
    const lx = (W / (items.length)) * i + 20;
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, legStartY, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(item.label, lx + 14, legStartY + 9);
  });
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + 'k';
  return sign + abs.toFixed(0);
}

function fmt(n: number): string {
  return Number(n).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Main page component ───────────────────────────────────────────────────────
export default function StatisticsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('monthly');
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const barCanvasRef = useRef<HTMLCanvasElement>(null);
  const profitCanvasRef = useRef<HTMLCanvasElement>(null);
  const donutCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawCharts = useCallback(() => {
    if (!series.length) return;
    const labels = series.map(r => r.period_label);
    const salesVals = series.map(r => Number(r.total_sales));
    const cogsVals = series.map(r => Number(r.total_cogs));
    const profitVals = series.map(r => Number(r.net_profit));

    const datasets = [
      { label: 'Revenue (Sales)', values: salesVals, color: COLORS.sales, lightColor: COLORS.salesLight },
      { label: 'Purchases (COGS)', values: cogsVals, color: COLORS.cogs, lightColor: COLORS.cogsLight },
    ];

    if (barCanvasRef.current) {
      if (chartType === 'bar') drawBarChart(barCanvasRef.current, labels, datasets);
      else drawLineChart(barCanvasRef.current, labels, datasets);
    }

    if (profitCanvasRef.current) {
      const profitDataset = [
        { label: 'Net Profit (Bénéfice)', values: profitVals, color: COLORS.profit, lightColor: COLORS.profitLight },
      ];
      if (chartType === 'bar') drawBarChart(profitCanvasRef.current, labels, profitDataset);
      else drawLineChart(profitCanvasRef.current, labels, profitDataset);
    }

    if (donutCanvasRef.current && totals) {
      drawDonutChart(donutCanvasRef.current, [
        { label: 'Revenue', value: Number(totals.total_sales), color: COLORS.sales },
        { label: 'COGS', value: Number(totals.total_cogs), color: COLORS.cogs },
        { label: 'Profit', value: Math.max(Number(totals.net_profit), 0), color: COLORS.profit },
      ]);
    }
  }, [series, totals, chartType]);

  const loadData = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/admin/statistics?period=${p}`)
      .then(r => r.json())
      .then(data => {
        setSeries(data.series ?? []);
        setTotals(data.totals ?? null);
        setTopProducts(data.topProducts ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/session')
      .then(r => r.json())
      .then(d => {
        if (!d.user || d.user.role !== 'Administrator') { router.push('/login'); return; }
        loadData('monthly');
      });
  }, [router, loadData]);

  useEffect(() => {
    if (!loading) {
      // Give the DOM a tick to size canvases
      requestAnimationFrame(drawCharts);
    }
  }, [loading, drawCharts]);

  // Redraw on window resize
  useEffect(() => {
    const handle = () => { if (!loading) drawCharts(); };
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, [loading, drawCharts]);

  function switchPeriod(p: Period) {
    setPeriod(p);
    loadData(p);
  }

  const kpis = totals
    ? [
        { icon: '💰', label: 'Total Revenue (Sales)', value: `${fmt(totals.total_sales)} DA`, color: 'kpi-green', delta: null },
        { icon: '🛒', label: 'Total Purchases (COGS)', value: `${fmt(totals.total_cogs)} DA`, color: 'kpi-red', delta: null },
        { icon: '📈', label: 'Net Profit (Bénéfice)', value: `${fmt(totals.net_profit)} DA`, color: totals.net_profit >= 0 ? 'kpi-blue' : 'kpi-red', delta: null },
        { icon: '🧾', label: 'Transactions', value: totals.total_tx.toString(), color: 'kpi-slate', delta: null },
        { icon: '↩️', label: 'Refunds', value: totals.total_refunds.toString(), color: 'kpi-slate', delta: null },
        { icon: '📦', label: 'Units Sold', value: totals.total_units_sold.toString(), color: 'kpi-slate', delta: null },
      ]
    : [];

  const maxTopRev = topProducts.length ? Math.max(...topProducts.map(p => Number(p.revenue))) : 1;

  return (
    <>
      <Navbar />
      <div className="stats-page">
        {/* ── Header ── */}
        <div className="stats-header">
          <div className="stats-header-left">
            <a href="/admin" className="btn-back">← Dashboard</a>
            <h1 className="stats-title">📊 Statistics & Analytics</h1>
            <p className="stats-subtitle">Sales, purchases and profit at a glance</p>
          </div>
          <div className="stats-header-right">
            {/* Period toggle */}
            <div className="period-tabs">
              {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
                <button
                  key={p}
                  id={`period-${p}`}
                  className={`period-tab${period === p ? ' active' : ''}`}
                  onClick={() => switchPeriod(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {/* Chart type toggle */}
            <div className="chart-type-tabs">
              <button id="chart-bar" className={`period-tab${chartType === 'bar' ? ' active' : ''}`} onClick={() => setChartType('bar')}>📊 Bar</button>
              <button id="chart-line" className={`period-tab${chartType === 'line' ? ' active' : ''}`} onClick={() => setChartType('line')}>📈 Line</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="stats-loading">
            <div className="stats-spinner" />
            <p>Loading statistics…</p>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="kpi-grid">
              {kpis.map((k, i) => (
                <div key={i} className={`kpi-card ${k.color}`}>
                  <div className="kpi-icon">{k.icon}</div>
                  <div className="kpi-body">
                    <div className="kpi-label">{k.label}</div>
                    <div className="kpi-value">{k.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Main Charts Row ── */}
            <div className="charts-row">
              <div className="chart-card chart-wide">
                <div className="chart-card-header">
                  <h2 className="chart-title">Revenue vs Purchases</h2>
                  <span className="chart-badge">{period === 'daily' ? 'Last 30 days' : period === 'monthly' ? 'Last 12 months' : 'Last 5 years'}</span>
                </div>
                {series.length === 0 ? (
                  <div className="chart-empty">No transaction data recorded yet.</div>
                ) : (
                  <canvas ref={barCanvasRef} className="chart-canvas" />
                )}
              </div>

              <div className="chart-card chart-narrow">
                <div className="chart-card-header">
                  <h2 className="chart-title">Breakdown</h2>
                  <span className="chart-badge">All time</span>
                </div>
                {!totals || Number(totals.total_sales) === 0 ? (
                  <div className="chart-empty">No data yet.</div>
                ) : (
                  <canvas ref={donutCanvasRef} className="chart-canvas-donut" />
                )}
              </div>
            </div>

            {/* ── Profit Chart ── */}
            <div className="chart-card" style={{ marginBottom: '2rem' }}>
              <div className="chart-card-header">
                <h2 className="chart-title">Net Profit (Bénéfice) Over Time</h2>
                <span className="chart-badge profit-badge">{period}</span>
              </div>
              {series.length === 0 ? (
                <div className="chart-empty">No transaction data recorded yet.</div>
              ) : (
                <canvas ref={profitCanvasRef} className="chart-canvas" />
              )}
            </div>

            {/* ── Bottom Row: Data Table + Top Products ── */}
            <div className="charts-row" style={{ alignItems: 'flex-start' }}>
              {/* Data Table */}
              <div className="chart-card chart-wide" style={{ overflowX: 'auto' }}>
                <div className="chart-card-header">
                  <h2 className="chart-title">Period Breakdown</h2>
                </div>
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Revenue</th>
                      <th>Purchases (COGS)</th>
                      <th>Net Profit</th>
                      <th>Transactions</th>
                      <th>Refunds</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                    ) : (
                      series.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{row.period_label}</strong></td>
                          <td className="td-green">{fmt(Number(row.total_sales))} DA</td>
                          <td className="td-red">{fmt(Number(row.total_cogs))} DA</td>
                          <td className={Number(row.net_profit) >= 0 ? 'td-blue' : 'td-red'}>{fmt(Number(row.net_profit))} DA</td>
                          <td>{row.total_tx}</td>
                          <td>{row.total_refunds}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Top Products */}
              <div className="chart-card chart-narrow">
                <div className="chart-card-header">
                  <h2 className="chart-title">🏆 Top Products</h2>
                  <span className="chart-badge">by revenue</span>
                </div>
                {topProducts.length === 0 ? (
                  <div className="chart-empty">No product data yet.</div>
                ) : (
                  <div className="top-products-list">
                    {topProducts.map((p, i) => {
                      const pct = (Number(p.revenue) / maxTopRev) * 100;
                      return (
                        <div key={i} className="top-product-row">
                          <div className="top-product-header">
                            <span className="top-product-rank">#{i + 1}</span>
                            <span className="top-product-name">{p.product_name}</span>
                            <span className="top-product-rev">{fmtShort(Number(p.revenue))} DA</span>
                          </div>
                          <div className="top-product-bar-bg">
                            <div
                              className="top-product-bar-fill"
                              style={{ width: `${pct}%`, background: i === 0 ? COLORS.profit : i === 1 ? COLORS.sales : '#7f8c8d' }}
                            />
                          </div>
                          <div className="top-product-meta">{p.category} · {Number(p.units_sold)} units</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Page-scoped CSS ── */}
      <style>{`
        .stats-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Header */
        .stats-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stats-header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .stats-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0.25rem 0;
          border-left: 4px solid #c0392b;
          padding-left: 0.75rem;
        }
        .stats-subtitle { color: #64748b; font-size: 0.875rem; margin: 0; }

        /* Period / chart type tabs */
        .period-tabs, .chart-type-tabs {
          display: flex;
          gap: 0.35rem;
          background: #f1f5f9;
          padding: 0.25rem;
          border-radius: 10px;
        }
        .period-tab {
          padding: 0.4rem 1rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .period-tab:hover { color: #c0392b; }
        .period-tab.active { background: #c0392b; color: #fff; box-shadow: 0 2px 8px rgba(192,57,43,0.3); }

        /* Loading */
        .stats-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1rem;
          color: #64748b;
        }
        .stats-spinner {
          width: 44px; height: 44px;
          border: 4px solid #e2e8f0;
          border-top-color: #c0392b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* KPI Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .kpi-card {
          background: #fff;
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid #e2e8f0;
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .kpi-icon { font-size: 2rem; flex-shrink: 0; }
        .kpi-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 0.25rem; }
        .kpi-value { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
        .kpi-green .kpi-value { color: #27ae60; }
        .kpi-red .kpi-value { color: #c0392b; }
        .kpi-blue .kpi-value { color: #2980b9; }

        /* Charts layout */
        .charts-row {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .chart-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .chart-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .chart-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0; }
        .chart-badge {
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; background: #f1f5f9; color: #64748b;
          padding: 0.2rem 0.6rem; border-radius: 999px;
        }
        .profit-badge { background: #dbeafe; color: #2980b9; }
        .chart-canvas { display: block; width: 100% !important; height: 340px; }
        .chart-canvas-donut { display: block; width: 100% !important; height: 300px; }
        .chart-empty {
          display: flex; align-items: center; justify-content: center;
          height: 220px; color: #94a3b8; font-size: 0.875rem;
        }

        /* Data Table */
        .stats-table {
          width: 100%; border-collapse: collapse; font-size: 0.82rem;
        }
        .stats-table th {
          background: #0f172a; color: #fff; padding: 0.6rem 0.9rem;
          text-align: left; font-size: 0.75rem; text-transform: uppercase;
          letter-spacing: 0.05em; font-weight: 700;
        }
        .stats-table th:first-child { border-top-left-radius: 8px; }
        .stats-table th:last-child { border-top-right-radius: 8px; }
        .stats-table td { padding: 0.62rem 0.9rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .stats-table tbody tr:last-child td { border-bottom: none; }
        .stats-table tbody tr:hover { background: #f8fafc; }
        .td-green { color: #27ae60; font-weight: 700; }
        .td-red   { color: #c0392b; font-weight: 700; }
        .td-blue  { color: #2980b9; font-weight: 700; }

        /* Top Products */
        .top-products-list { display: flex; flex-direction: column; gap: 1rem; }
        .top-product-row { border-bottom: 1px solid #f1f5f9; padding-bottom: 0.85rem; }
        .top-product-row:last-child { border-bottom: none; padding-bottom: 0; }
        .top-product-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
        .top-product-rank { font-size: 0.7rem; font-weight: 800; color: #94a3b8; min-width: 22px; }
        .top-product-name { flex: 1; font-size: 0.85rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .top-product-rev { font-size: 0.8rem; font-weight: 700; color: #27ae60; }
        .top-product-bar-bg { height: 6px; background: #f1f5f9; border-radius: 999px; overflow: hidden; margin-bottom: 0.25rem; }
        .top-product-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
        .top-product-meta { font-size: 0.72rem; color: #94a3b8; }

        /* Responsive */
        @media (max-width: 900px) {
          .charts-row { grid-template-columns: 1fr; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-header { flex-direction: column; }
          .stats-header-right { align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <Footer />
    </>
  );
}
