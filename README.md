# Hybrid Store Management System — README

## Overview
A retail management solution combining a **Python POS desktop app** with a **Next.js web portal** (AKLI shopping website), both sharing a central MySQL database via XAMPP.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| XAMPP | 8.x | Apache + MySQL (port 3306) |
| Python | 3.10+ | POS desktop app |
| Node.js | 18+ LTS | Web portal |

---

## 1. Database Setup

1. Start XAMPP — ensure **Apache** and **MySQL** are running.
2. Open **phpMyAdmin** → Import `Hybrid_store_DB_v3.sql`.
3. Verify database `hybrid_store` has all tables and views.
4. **Seed initial admin user** (run in phpMyAdmin SQL tab):

```sql
-- First generate bcrypt hash of your password in Python:
-- import bcrypt; print(bcrypt.hashpw(b'Admin@1234', bcrypt.gensalt()).decode())

INSERT INTO users (username, password_hash, role, user_type)
VALUES ('admin', '$2b$12$YOUR_HASH', 'Administrator', 'staff');

INSERT INTO tax_categories (name, rate) VALUES ('Standard', 19.0), ('Tobacco', 25.0);

INSERT INTO products (name, category, default_selling_price, tax_category_id, min_stock_threshold)
VALUES ('Marlboro Red', 'Cigarettes', 500.00, 2, 10);

INSERT INTO inventory_lots (product_id, quantity, buying_price) VALUES (1, 100, 380.00);
```

---

## 2. Python POS App

```powershell
cd POS_App
pip install -r requirements.txt
python main.py
```

Edit `POS_App/.env` to match your XAMPP credentials. Run tests with:
```powershell
pytest POS_App/tests/ -v
```

Backup: `python POS_App/backup.py` (schedule daily via Windows Task Scheduler).

---

## 3. Web App

```powershell
cd Web_App
npm install
npm run dev
```

Edit `Web_App/.env.local`:
```
DB_HOST=localhost
DB_NAME=hybrid_store
DB_USER=root
DB_PASSWORD=
SESSION_SECRET=change_this_to_a_long_random_secret
```

Open: http://localhost:3000

---

## 4. Architecture

```
Browser  ←→  Next.js Web App  ←→  MySQL (XAMPP)
                                        ↑
                       Python POS App ──┘
```

---

## 5. Key Pages

| Route | Role | Description |
|---|---|---|
| `/` | All | Product catalog, category tabs |
| `/cart` | Client | Cart + place pickup order |
| `/orders` | Client | Order history |
| `/admin` | Admin | Dashboard + low-stock alerts |
| `/admin/products` | Admin | Add/edit products |
| `/admin/stock` | Admin | Receive inventory lots |
| `/admin/price-rules` | Admin | Deal/Clearance/Holiday rules |
| `/admin/reports` | Admin | Revenue, COGS, Net Profit |
| `/admin/users` | Admin | Create accounts, manage roles |

---

## 6. Security

- Passwords hashed with **bcrypt** (10 rounds)
- Policy: 8+ chars, uppercase, lowercase, digit
- Sessions: HMAC-SHA256 signed cookies
- Admin endpoints check `role = 'Administrator'`

---

## 7. Color Palette (REQ-20)

| Color | Hex | Usage |
|---|---|---|
| Red | `#C0392B` | Brand, buttons, headers |
| Green | `#27AE60` | Success, deals, checkout |
| White | `#FFFFFF` | Backgrounds, cards |