# Web App Audit Report — AKLI Shopping Website

> Audited: `Web_App/` · Date: 2026-03-26

---

## Summary

The existing Web App is a **repurposed generic portal** (originally "AKLSOF Network") with a basic auth scaffold. It must be significantly refactored to become the "AKLI shopping website" described in the SRS. The good news: the session system, `bcryptjs`, `mysql2`, and Next.js 14 are already wired up correctly.

---

## 🔴 Critical Fixes Required (Blockers)

### 1. Wrong Database Name — `src/lib/db.ts`
- **Current:** `database: 'mydata'`
- **Required:** `database: 'hybrid_store'`

### 2. Old Data Model — `src/lib/employee.ts`
The `IEmployee` interface maps to a non-existent `tbluser` table with columns (`email`, `firstname`, `lastname`, `salary`, `address`, `ssn`) that do not exist in `hybrid_store`.
- **Replace** `employee.ts` with a `user.ts` file matching the actual `users` table: `user_id`, `username`, `role`, `user_type`, `preferred_lang`, `is_active`.

### 3. Login API queries wrong table — `src/app/api/auth/login/route.ts`
- **Current:** `SELECT ... FROM tbluser WHERE email = ?`
- **Required:** `SELECT ... FROM users WHERE username = ? AND is_active = 1`

### 4. Register API inserts into wrong table — `src/app/api/auth/register/route.ts`
- **Current:** `INSERT INTO tbluser (email, password, firstname, lastname, address)`
- **Required:** `INSERT INTO users (username, password_hash, role, user_type)` with `user_type='client'` and `role='Store Associate'` (or derived from context).
- Fields collected must change: `username` + `password` only for client self-registration.

---

## 🟠 Pages to Completely Replace

### `src/app/page.tsx` — Home Page
- **Current:** Generic 3-column layout with RSS feeds (AKLSOF TV, sport, videos) — completely unrelated to the store.
- **Replace with:** Product catalog page with category tabs (All / Cigarettes / Drinks / Snacks), active deal badges, and "Add to Cart" buttons. Reads from `vw_active_price`.

### `src/app/profile/page.tsx` — Profile Page
- **Current:** Shows `firstName`, `lastName`, `salary`, `SSN` — all wrong fields.
- **Replace with:** Simple user profile showing `username`, `role`, `preferred_lang`, and order history.

### `src/app/registration/page.tsx` — Registration Page
- **Current:** Collects `email`, `firstname`, `lastname`, `address` — wrong schema.
- **Replace with:** Simple form collecting only `username` + `password` (client self-registration, `user_type='client'`).

---

## 🟠 Components to Refactor

### `src/components/Navbar.tsx`
- **Current:** Brand = "AKLSOF NETWORK"; menus link to external blog URLs (TV, Videos, Sport).
- **Required:**
  - Brand = **"AKLI shopping website"** (REQ-19), title top-center on sign-in (REQ-21)
  - Navigation: `Shop` (categories), `Cart`, `My Orders`
  - Auth links: `Login` / `Register` when guest; `Profile` / `Logout` when logged in
  - **Language toggle: EN ↔ AR** (REQ-32)
  - Remove all external blog links

### `src/components/Carousel.tsx`
- **Current:** Likely generic promotional slides.
- **Replace with:** Store promotional banners (active deals/rules).

### `src/components/RssFeed.tsx`
- **Delete** — not needed in the shopping website.

---

## 🟡 Missing Files — Need to Create

### `src/lib/` additions
| File | Purpose |
|---|---|
| `user.ts` | `IUser` interface matching `users` table schema (replaces `employee.ts`) |
| `types.ts` | Shared types: `Product`, `Order`, `OrderItem`, `Lot`, `TaxCategory`, `PriceRule` |

### New API Routes
| Route | Method | Purpose | REQ |
|---|---|---|---|
| `/api/products` | GET | Product list, filterable by category | REQ-1 |
| `/api/orders` | GET/POST | Submit / view pickup orders | REQ-2 |
| `/api/orders/[id]` | PATCH | Update order status | REQ-34 |
| `/api/admin/products` | GET/POST/PATCH | Manage products | REQ-10 |
| `/api/admin/stock` | POST | Add stock lot | REQ-11, REQ-12 |
| `/api/admin/adjustments` | POST | Inventory adjustment | REQ-33 |
| `/api/admin/price-rules` | POST | Create pricing rule | REQ-16 |
| `/api/admin/users` | GET/POST/PATCH | User management | REQ-37 |
| `/api/admin/reports` | GET | Financial report from `vw_financial_report` | REQ-27 |
| `/api/admin/tax-categories` | GET/POST | Tax categories | REQ-35 |

### New Client Pages
| Path | Purpose |
|---|---|
| `/product/[id]` | Product detail + add to cart |
| `/cart` | Cart review + submit pickup order |
| `/orders` | Client order history |

### New Admin Pages (entirely missing)
| Path | Purpose |
|---|---|
| `/admin` | Dashboard + low-stock alerts |
| `/admin/products` | Product list + add/edit |
| `/admin/stock` | Add stock / lot history |
| `/admin/adjustments` | Inventory shrinkage entry |
| `/admin/price-rules` | Deal / Rollback / Clearance / Holiday rules |
| `/admin/users` | Create accounts, assign roles, reset passwords |
| `/admin/reports` | Revenue / COGS / Net Profit report |
| `/admin/tax-categories` | Tax rate management |

---

## 🟢 What Can Be Kept / Reused

| Asset | Status |
|---|---|
| `src/lib/db.ts` | ✅ Keep — just fix the DB name |
| `src/lib/session.ts` | ✅ Keep — HMAC cookie session works fine |
| `src/app/api/auth/logout/` | ✅ Keep — likely correct |
| `src/app/api/session/` | ✅ Keep — just update payload type |
| `src/components/Footer.tsx` | ✅ Keep — update branding text |
| `package.json` | ✅ Keep — `bcryptjs`, `mysql2`, `next` already installed |
| `globals.css` | 🟡 Partial — update color palette to Red/White/Green (REQ-20); add RTL styles |
| `.env.local` | 🟡 Update `DB_NAME=hybrid_store`, add `SESSION_SECRET` |

---

## Change Count Summary

| Severity | Count | Action |
|---|---|---|
| 🔴 Critical fixes | 4 | Fix DB name, replace data model, fix API queries |
| 🟠 Full rewrites | 5 | Home, Profile, Registration pages + Navbar + Carousel |
| 🟡 Partial edits | 3 | `globals.css`, `.env.local`, `session.ts` typing |
| 🟢 New files | 20+ | All admin pages, product/cart/orders pages, API routes |
| 🗑️ Delete | 1 | `RssFeed.tsx` |
