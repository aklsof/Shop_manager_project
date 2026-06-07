# Hybrid Store Management System

A retail management platform combining a **Python POS desktop app** (Tkinter) with a **Next.js web storefront**, both sharing a central MySQL database.

```
Browser  ←→  Next.js Web App  ←→  MySQL
                                      ↑
                     Python POS App ──┘
```

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Installation](#local-installation)
  - [1. Database](#1-database)
  - [2. POS Desktop App](#2-pos-desktop-app)
  - [3. Web App (Development)](#3-web-app-development)
- [Netlify Deployment](#netlify-deployment)
- [Configuration Reference](#configuration-reference)
- [Project Structure](#project-structure)

---

## Prerequisites

| Tool       | Version    | Purpose                          |
|------------|------------|----------------------------------|
| XAMPP      | 8.x        | Apache + MySQL (port 3306)       |
| Python     | 3.10+      | POS desktop app                  |
| Node.js    | 18+ LTS    | Web portal (Next.js)             |
| npm        | 9+         | JavaScript package manager       |
| Git        | any        | Clone the repository             |

---

## Local Installation

### 1. Database

1. **Start XAMPP** — launch the control panel and start **Apache** + **MySQL**.

2. **Import the schema** — open [phpMyAdmin](http://localhost/phpmyadmin) and create a new database named `hybrid_store`, then import:
   ```
   Hybrid_store_DB_v4.sql
   ```
   This creates all tables, views, triggers, and base seed data.

3. **Seed an admin user** — run this SQL in phpMyAdmin (replace the hash with a real bcrypt hash):

   ```sql
   -- Generate a bcrypt hash first:
   --   python -c "import bcrypt; print(bcrypt.hashpw(b'Admin@1234', bcrypt.gensalt()).decode())"
   INSERT INTO users (username, email, user_firstName, user_lastName, password_hash, role, user_type)
   VALUES ('admin', 'admin@example.com', 'Admin', 'User', '$2b$12$YOUR_HASH_HERE', 'Administrator', 'staff');
   ```

4. **Seed default tax categories** (if not already seeded):
   ```sql
   INSERT INTO tax_categories (name, rate) VALUES ('Standard', 19.0), ('Tobacco', 25.0);
   ```

---

### 2. POS Desktop App

```powershell
cd POS_App
```

**A. Configure the environment**

Copy or edit `POS_App/.env`:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hybrid_store
DB_USER=root
DB_PASSWORD=
DB_SSL=false
```

**B. Install dependencies**

```powershell
pip install -r requirements.txt
```

**C. Run the app**

```powershell
python main.py
```

This opens a login window. Log in with the admin credentials you seeded above.

**D. Run tests**

```powershell
pytest tests/ -v
```

**E. Create a standalone executable (optional)**

```powershell
pip install pyinstaller
pyinstaller AKLIShop.spec
```

The executable will be in `POS_App/dist/`.

---

### 3. Web App (Development)

```powershell
cd Web_App
```

**A. Configure the environment**

Copy or edit `Web_App/.env.local`:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hybrid_store
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=change_this_to_a_long_random_secret
```

| Variable        | Description                                           |
|-----------------|-------------------------------------------------------|
| `DB_HOST`       | MySQL host (use `localhost` for local XAMPP)          |
| `DB_PORT`       | MySQL port (default `3306`)                           |
| `DB_NAME`       | Database name (`hybrid_store`)                        |
| `DB_USER`       | MySQL user (`root` for local)                         |
| `DB_PASSWORD`   | MySQL password (empty for default XAMPP)              |
| `DB_SSL`        | Set to `true` if the connection requires TLS          |
| `SESSION_SECRET`| HMAC-SHA256 signing key for session cookies           |

**B. Install dependencies**

```powershell
npm install
```

**C. Start the dev server**

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**D. Build for production**

```powershell
npm run build
npm run start
```

---

## Netlify Deployment

The web app is designed to deploy on Netlify via the `@netlify/plugin-nextjs` plugin. The POS app is desktop-only and cannot be deployed to Netlify.

### Step 1: Push to GitHub

Create a GitHub repository and push your code:

```powershell
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

### Step 2: Connect to Netlify

1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project**.
3. Connect your GitHub repository.
4. Configure build settings (Netlify auto-detects them from `netlify.toml`):

   | Setting      | Value                     |
   |--------------|---------------------------|
   | Base directory | `Web_App`               |
   | Build command  | `npm run build`         |
   | Publish directory | `.next` (handled by the Next.js plugin) |

### Step 3: Set Environment Variables

In Netlify: **Site settings** → **Environment variables**, add the same variables from `.env.local`:

```
DB_HOST=your_mysql_host
DB_PORT=3306
DB_NAME=hybrid_store
DB_USER=your_db_user
DB_PASSWORD=your_db_password
SESSION_SECRET=a_long_random_secret_string
```

> **Important:** For production, use a cloud MySQL provider like:
> - [filess.io](https://filess.io) (free tier, what this project was tested with)
> - [PlanetScale](https://planetscale.com)
> - [Aiven](https://aiven.io)
>
> Local XAMPP will **not** be accessible from Netlify's servers. Set `DB_SSL=true` if your provider requires TLS.

### Step 4: Deploy

Netlify will automatically build and deploy on every push to the connected branch. You can also trigger a manual deploy from the Netlify dashboard.

The `netlify.toml` at the project root already contains:

```toml
[build]
  base = "Web_App"
  command = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## Configuration Reference

### POS App (`POS_App/.env`)

| Variable      | Default     | Description                          |
|---------------|-------------|--------------------------------------|
| `DB_HOST`     | `localhost` | MySQL server hostname                |
| `DB_PORT`     | `3306`      | MySQL server port                    |
| `DB_NAME`     | `hybrid_store` | Database name                    |
| `DB_USER`     | `root`      | Database user                        |
| `DB_PASSWORD` | (empty)     | Database password                    |
| `DB_SSL`      | `false`     | Enable TLS connection to MySQL       |

### Web App (`Web_App/.env.local`)

| Variable         | Default     | Description                                  |
|------------------|-------------|----------------------------------------------|
| `DB_HOST`        | `localhost` | MySQL server hostname                        |
| `DB_PORT`        | `3306`      | MySQL server port                            |
| `DB_NAME`        | `hybrid_store` | Database name                            |
| `DB_USER`        | `root`      | Database user                                |
| `DB_PASSWORD`    | (empty)     | Database password                            |
| `DB_SSL`        | (unset)     | Set to `true` to enable TLS                  |
| `SESSION_SECRET` | (required)  | HMAC-SHA256 key for signing session cookies  |

---

## Project Structure

```
Shop_manager_project/
├── Hybrid_store_DB_v4.sql       # Full database schema + views + triggers
├── netlify.toml                  # Netlify build configuration
│
├── POS_App/                      # Python desktop POS (Tkinter)
│   ├── main.py                   # Entry point
│   ├── config.py                 # Database & app configuration
│   ├── db.py                     # MySQL connection helper
│   ├── cache_manager.py          # Local JSON cache for offline resilience
│   ├── sync_manager.py           # Background cache sync every 2 min
│   ├── backup.py                 # mysqldump backup script
│   ├── pos_locale.py             # i18n: EN / FR / AR translations
│   ├── auth/
│   │   ├── login_window.py       # Login screen
│   │   └── registration_window.py
│   ├── pos/
│   │   ├── sales_window.py       # Main POS sales interface
│   │   └── receipt.py            # PDF receipt generator (ReportLab)
│   ├── inventory/
│   │   └── adjustment_window.py  # Stock adjustment UI
│   ├── orders/
│   │   └── web_orders_dashboard.py
│   └── tests/
│       ├── test_fifo.py
│       ├── test_tax_calc.py
│       └── test_price_rules.py
│
├── Web_App/                      # Next.js web storefront
│   ├── next.config.ts
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Home / product catalog
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── api/              # REST API routes
│       │   │   ├── products/
│       │   │   ├── categories/
│       │   │   ├── orders/
│       │   │   ├── auth/
│       │   │   ├── session/
│       │   │   ├── user/
│       │   │   ├── cache/
│       │   │   └── admin/
│       │   ├── cart/
│       │   ├── orders/
│       │   ├── product/
│       │   ├── login/
│       │   ├── registration/
│       │   ├── profile/
│       │   └── admin/            # Admin dashboard pages
│       ├── components/           # Shared React components
│       └── lib/                  # Shared utilities
│           ├── db.ts             # MySQL connection pool (mysql2)
│           ├── session.ts        # Signed cookie session management
│           ├── jsonCache.ts      # File-based JSON cache for serverless
│           ├── cacheDatasets.ts  # Cache data loaders
│           ├── types.ts          # TypeScript interfaces
│           ├── user.ts           # IUser type
│           ├── i18n.tsx          # Internationalisation context
│           ├── theme.tsx         # Theme provider
│           └── settings.ts       # App settings & currency config
│
└── migrations/                   # SQL migration scripts
    ├── add_product_categories.sql
    └── fix_category_integrity.sql
```

---

## Key Pages (Web App)

| Route                     | Role    | Description                       |
|---------------------------|---------|-----------------------------------|
| `/`                       | All     | Product catalog, category tabs    |
| `/cart`                   | Client  | Cart + place pickup order         |
| `/orders`                 | Client  | Order history                     |
| `/product/[id]`           | All     | Product detail page               |
| `/login`                  | Guest   | Sign in                           |
| `/registration`           | Guest   | Create account                    |
| `/profile`                | Client  | Edit profile                      |
| `/admin`                  | Admin   | Dashboard + low-stock alerts      |
| `/admin/products`         | Admin   | Add / edit / delete products      |
| `/admin/categories`       | Admin   | Manage product categories         |
| `/admin/stock`            | Admin   | Receive new inventory lots        |
| `/admin/adjustments`      | Admin   | Record stock adjustments          |
| `/admin/price-rules`      | Admin   | Deal / Clearance / Holiday rules  |
| `/admin/orders`           | Admin   | Process web pickup orders         |
| `/admin/reports`          | Admin   | Revenue, COGS, Net Profit         |
| `/admin/users`            | Admin   | Manage staff accounts             |
| `/admin/tax-categories`   | Admin   | Manage tax rates                  |
| `/admin/statistics`       | Admin   | Daily / monthly / yearly stats    |
| `/admin/settings`         | Admin   | Currency & default theme          |
| `/admin/pos`              | Admin   | Link to POS terminal dashboard    |

---

## Features

- **Point of Sale** — cashier interface with search, cart, refund mode, FIFO lot selection
- **Web Storefront** — product catalog with category filtering, cart, pickup orders
- **Admin Dashboard** — full CRUD for products, stock, price rules, users, categories, tax
- **Internationalisation** — English, French, Arabic (RTL support)
- **Theme System** — light, dark, high-contrast themes; font size control
- **PDF Receipts** — A6-sized receipts with per-item tax breakdown
- **JSON Cache** — web app uses file-based cache for fast serverless responses; POS syncs every 2 min
- **Database Views** — `vw_active_price` (deal-aware pricing), `vw_fifo_lot_queue` (FIFO inventory), `vw_financial_report`
- **Security** — bcrypt password hashing, HMAC-SHA256 signed sessions, parameterized queries
