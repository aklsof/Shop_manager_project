# Execution Plan — Hybrid Store Management System

> **Stack:** Python 3.x (POS) · Next.js 14 / TypeScript (Web) · MySQL via XAMPP

---

## Phase 1 — Environment Setup

- [ ] Install Python 3.x — verify `python --version`
- [ ] Install Node.js LTS — verify `node --version` and `npm --version`
- [ ] Clone / open the repo in VS Code

---

## Phase 2 — Database ✅ Complete

- [x] XAMPP installed — Apache & MySQL running on ports 80 / 3306
- [x] Database `hybrid_store` exists in phpMyAdmin
- [ ] Verify all 9 tables created: `users`, `products`, `tax_categories`, `inventory_lots`, `inventory_adjustments`, `price_rules`, `transactions`, `transaction_items`, `web_orders`, `web_order_items`
- [ ] Verify all 8 views created: `vw_active_price`, `vw_fifo_lot_queue`, `vw_financial_report`, `vw_product_stock`, `vw_low_stock_alerts`, `vw_inventory_adjustment_log`, `vw_associate_sales_summary`, `vw_web_orders_dashboard`
- [ ] Verify all DB triggers are active
- [ ] Seed one Administrator account (bcrypt-hashed password)
- [ ] Seed one Client account (`user_type = 'client'`)
- [ ] Seed sample products, lots, and a tax category

---

## Phase 3 — Python POS App

> Directory: `POS_App/`

### 3.1 Project Scaffold
- [ ] Create `POS_App/` folder structure (see implementation plan)
- [ ] Create `requirements.txt`: `mysql-connector-python`, `bcrypt`, `python-dotenv`, `reportlab`, `pytest`
- [ ] Run `pip install -r requirements.txt`
- [ ] Create `config.py` — reads DB credentials from `.env`

### 3.2 Authentication
- [ ] `auth/login_window.py` — Tkinter login screen (title top-left, Red/White/Green palette)
- [ ] Validate credentials against `users` table; verify `bcrypt` hash
- [ ] Enforce password policy (REQ-14): 8+ chars, upper, lower, digit
- [ ] Block inactive users (`is_active = 0`)

### 3.3 Sales Interface
- [ ] `pos/sales_window.py` — product search / barcode entry
- [ ] Price lookup via `vw_active_price` (REQ-3 dynamic price)
- [ ] Tax calculation per product via `tax_category_rate` (REQ-35)
- [ ] FIFO lot selection via `vw_fifo_lot_queue` (REQ-4)
- [ ] Insert into `transactions` + `transaction_items` on checkout
- [ ] Trigger `trg_sale_deduct_stock` verified

### 3.4 Refund Mode
- [ ] `pos/refund_window.py` — toggle Refund Mode button (REQ-25)
- [ ] Submit negative quantity transaction items (REQ-25)
- [ ] Verify `trg_refund_create_lot` creates a new inventory lot (REQ-26)

### 3.5 Receipt Generator
- [ ] `pos/receipt.py` — generate PDF receipt using `reportlab` (REQ-28)
- [ ] Header: "AKLI shopping manager" branding
- [ ] Include itemized lines, tax per item, total

### 3.6 Web Orders Dashboard
- [ ] `orders/web_orders_dashboard.py` — Tkinter tab polling DB every 30 s (REQ-34)
- [ ] Display orders from `vw_web_orders_dashboard`
- [ ] Buttons to advance status: Pending → Ready for Pickup → Completed
- [ ] Trigger `trg_order_status_workflow` enforces sequence

### 3.7 Inventory Adjustment (POS)
- [ ] `inventory/adjustment_window.py` — select lot, enter quantity + reason (REQ-33)
- [ ] Insert into `inventory_adjustments`; trigger auto-updates lot quantity

---

## Phase 4 — TypeScript Web App

> Directory: `Web_App/`  · Run: `cd Web_App && npm run dev`

### 4.1 Foundation
- [ ] Configure `.env.local` with DB credentials
- [ ] `src/lib/db.ts` — `mysql2` connection pool with typed query helper
- [ ] `src/lib/auth.ts` — `next-auth` credentials provider + RBAC (Admin / Store Associate / Client)
- [ ] `src/lib/types.ts` — shared interfaces (Product, Order, User, Lot…)
- [ ] `src/app/globals.css` — CSS variables (Red/White/Green), RTL support for Arabic, Google Fonts

### 4.2 API Routes
| Route | Purpose | REQ |
|---|---|---|
| `/api/auth/[...nextauth]` | Session management | REQ-9, REQ-15 |
| `/api/products` | List products by category | REQ-1 |
| `/api/orders` GET/POST | Submit pickup order | REQ-2 |
| `/api/orders/[id]` PATCH | Update order status | REQ-34 |
| `/api/admin/products` GET/POST | Manage products | REQ-10 |
| `/api/admin/stock` POST | Add stock lot | REQ-11, REQ-12 |
| `/api/admin/adjustments` POST | Inventory adjustment | REQ-33 |
| `/api/admin/price-rules` POST | Create price rule | REQ-16 |
| `/api/admin/users` GET/POST/PATCH | Manage users | REQ-37 |
| `/api/admin/reports` GET | Financial report | REQ-27 |
| `/api/admin/tax-categories` GET/POST | Manage tax rates | REQ-35 |

### 4.3 Client-Facing Pages
- [ ] `/auth/login` — client login page (title top-center per REQ-21)
- [ ] `/` — product catalog with category tabs: All / Cigarettes / Drinks / Snacks (REQ-1)
- [ ] `/product/[id]` — product detail with "Add to Cart"
- [ ] `/cart` — cart review + submit as Pickup Order (REQ-2)
- [ ] Language toggle EN ↔ AR with RTL layout (REQ-32)

### 4.4 Admin Pages
- [ ] `/admin` — dashboard with low-stock alerts (`vw_low_stock_alerts`)
- [ ] `/admin/products` — product list + add/edit form (REQ-10)
- [ ] `/admin/stock` — stock receipt form, lot history (REQ-11, REQ-12)
- [ ] `/admin/adjustments` — shrinkage / damage entry (REQ-33)
- [ ] `/admin/price-rules` — create Deal / Rollback / Clearance / Holiday rules (REQ-16)
- [ ] `/admin/users` — create accounts, assign roles, reset passwords (REQ-37)
- [ ] `/admin/reports` — Revenue / COGS / Net Profit table from `vw_financial_report` (REQ-27)
- [ ] `/admin/tax-categories` — manage tax categories and rates (REQ-35)

---

## Phase 5 — Non-Functional Requirements

- [ ] **REQ-14/15** — enforce password policy via Zod schema in API + `bcryptjs` hashing
- [ ] **REQ-29** — `POS_App/backup.py` script running `mysqldump`; schedule via Windows Task Scheduler (every 24 h)
- [ ] **REQ-30** — ESLint in Web App (`npm run lint`); `black` + `flake8` in Python
- [ ] **Performance** — confirm `vw_active_price` query returns in < 0.5 s using phpMyAdmin `EXPLAIN`

---

## Phase 6 — Testing

### Python (pytest)
- [ ] `tests/test_fifo.py` — FIFO lot selection picks earliest `date_received`
- [ ] `tests/test_tax_calc.py` — itemized tax matches `tax_category_rate × price_applied`
- [ ] `tests/test_price_rules.py` — promo price activates exactly at `start_date 00:00:00`
- [ ] Run: `pytest POS_App/tests/ -v`

### Web App (jest)
- [ ] Unit test `/api/products` filter logic
- [ ] Unit test `/api/admin/reports` COGS calculation
- [ ] Run: `cd Web_App && npm test`

---

## Phase 7 — Documentation

- [ ] Update `README.md` with full setup guide (XAMPP → DB import → Python → Web App)
- [ ] Document `.env` / `.env.local` variable list
- [ ] Add sample screenshots to README

---

## Delivery Checklist

| Item | Status |
|---|---|
| DB imported cleanly with no errors | ⬜ |
| Python POS login works with seeded admin | ⬜ |
| POS sale deducts correct FIFO lot | ⬜ |
| Refund creates new inventory lot | ⬜ |
| Web Order appears in POS dashboard within 30 s | ⬜ |
| Admin can add product, stock, price rule | ⬜ |
| Financial report shows correct Revenue / COGS / Profit | ⬜ |
| Client portal displays products in Arabic (RTL) | ⬜ |
| All pytest tests pass | ⬜ |
| All jest tests pass | ⬜ |
