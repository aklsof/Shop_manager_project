"""
pos/dashboard_window.py — Admin Dashboard for the AKLI POS App.

Shown immediately after login; mirrors the web app's /admin page with:
  - Greeting header (user name, date/time, language switcher)
  - 12-card service grid
  - Low-stock alerts table (reads from cache or DB)
  - Logout button
"""
import tkinter as tk
from tkinter import ttk
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config import (
    APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_GREEN,
    COLOR_WHITE, COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_BORDER,
)
import pos_locale
import cache_manager


# ─── palette helpers ──────────────────────────────────────────────────────────
COLOR_CARD_BG   = "#FFFFFF"
COLOR_CARD_HVR  = "#F1F5F9"
COLOR_SECTION   = "#F8FAFC"
COLOR_BADGE_RED = "#E74C3C"
COLOR_GOLD      = "#F39C12"


class DashboardWindow:
    """
    Modal-style welcome dashboard.

    After login, main.py creates this window (passing the Tk root and user dict).
    Clicking a service card either opens the relevant window directly or spawns a
    Toplevel stub.  Clicking 'Logout' destroys the window so main.py can exit.
    """

    def __init__(self, root: tk.Tk, user: dict):
        self.root = root
        self.user = user
        self._sales_window_open = False   # guard against double-opening

        self.root.title(pos_locale.t("dashboard_title"))
        self.root.geometry("1000x680")
        self.root.configure(bg=COLOR_BG)
        self.root.resizable(True, True)

        self._build_ui()
        self._load_low_stock()

    # ──────────────────────────────────────────────────────────────────────
    # Build
    # ──────────────────────────────────────────────────────────────────────
    def _build_ui(self):
        # ── Top bar ──────────────────────────────────────────────────────
        top = tk.Frame(self.root, bg=COLOR_RED, height=56)
        top.pack(fill="x")
        top.pack_propagate(False)

        tk.Label(
            top, text=pos_locale.t("app_title"),
            font=("Helvetica", 13, "bold"),
            bg=COLOR_RED, fg=COLOR_WHITE, padx=16,
        ).pack(side="left", pady=10)

        # Right side: lang switcher + logout
        right_frame = tk.Frame(top, bg=COLOR_RED)
        right_frame.pack(side="right", padx=12, pady=8)

        logout_btn = tk.Button(
            right_frame,
            text=pos_locale.t("logout"),
            font=("Helvetica", 9, "bold"),
            bg=COLOR_WHITE, fg=COLOR_RED,
            relief="flat", padx=8, pady=4,
            cursor="hand2",
            command=self._logout,
        )
        logout_btn.pack(side="right", padx=(8, 0))

        self.lang_frame = tk.Frame(right_frame, bg=COLOR_RED)
        self.lang_frame.pack(side="right")
        self._rebuild_lang_buttons()

        # ── Welcome strip ─────────────────────────────────────────────────
        welcome_bar = tk.Frame(self.root, bg=COLOR_SECTION, pady=12)
        welcome_bar.pack(fill="x")

        name = self.user.get("username", "")
        now  = datetime.now().strftime("%A, %d %B %Y  •  %H:%M")
        tk.Label(
            welcome_bar,
            text=pos_locale.t("welcome_msg", name=name),
            font=("Helvetica", 14, "bold"),
            bg=COLOR_SECTION, fg=COLOR_TEXT,
        ).pack(side="left", padx=20)
        tk.Label(
            welcome_bar,
            text=now,
            font=("Helvetica", 9),
            bg=COLOR_SECTION, fg=COLOR_MUTED,
        ).pack(side="right", padx=20)

        # ── Scrollable body ───────────────────────────────────────────────
        canvas = tk.Canvas(self.root, bg=COLOR_BG, highlightthickness=0)
        scrollbar = ttk.Scrollbar(self.root, orient="vertical", command=canvas.yview)
        self.body = tk.Frame(canvas, bg=COLOR_BG)

        self.body.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.create_window((0, 0), window=self.body, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        canvas.bind_all("<MouseWheel>", lambda e: canvas.yview_scroll(-1*(e.delta//120), "units"))

        self._build_cards()
        self._build_low_stock_section()

    # ──────────────────────────────────────────────────────────────────────
    # Language switcher
    # ──────────────────────────────────────────────────────────────────────
    def _rebuild_lang_buttons(self):
        for w in self.lang_frame.winfo_children():
            w.destroy()
        for code, label in [("en", "EN"), ("fr", "FR"), ("ar", "ع"), ("es", "ES")]:
            active = pos_locale.get_lang() == code
            btn = tk.Button(
                self.lang_frame, text=label,
                font=("Helvetica", 9, "bold"),
                bg=COLOR_WHITE if active else COLOR_RED,
                fg=COLOR_RED   if active else COLOR_WHITE,
                relief="flat", padx=6, pady=2, cursor="hand2",
                command=lambda c=code: self._switch_lang(c),
            )
            btn.pack(side="left", padx=2)

    def _switch_lang(self, code: str):
        pos_locale.set_lang(code)
        # Persist to DB silently
        try:
            from db import get_connection
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "UPDATE users SET preferred_lang=%s WHERE user_id=%s",
                    (code, self.user["user_id"]),
                )
                conn.commit(); cur.close()
            finally:
                conn.close()
            self.user["preferred_lang"] = code
        except Exception as e:
            print("[Dashboard] Lang DB update failed:", e)
        # Rebuild the whole UI
        for w in self.root.winfo_children():
            w.destroy()
        self._build_ui()
        self._load_low_stock()

    # ──────────────────────────────────────────────────────────────────────
    # Card grid  (mirrors web app admin links)
    # ──────────────────────────────────────────────────────────────────────
    def _build_cards(self):
        header = tk.Label(
            self.body,
            text=pos_locale.t("dashboard_title"),
            font=("Helvetica", 14, "bold"),
            bg=COLOR_BG, fg=COLOR_TEXT,
            anchor="w",
        )
        header.pack(fill="x", padx=20, pady=(18, 8))

        grid = tk.Frame(self.body, bg=COLOR_BG)
        grid.pack(fill="x", padx=16)

        cards = [
            ("card_pos",         "card_pos_desc",         self._open_pos,         COLOR_RED),
            ("card_web_orders",  "card_web_orders_desc",  self._open_web_orders,  "#2980B9"),
            ("card_products",    "card_products_desc",    self._open_products,    "#8E44AD"),
            ("card_categories",  "card_categories_desc",  self._open_categories,  "#16A085"),
            ("card_stock",       "card_stock_desc",       self._open_stock,       "#27AE60"),
            ("card_adjustments", "card_adjustments_desc", self._open_adjustments, "#D35400"),
            ("card_price_rules", "card_price_rules_desc", self._open_price_rules, "#C0392B"),
            ("card_users",       "card_users_desc",       self._open_users,       "#2C3E50"),
            ("card_statistics",  "card_statistics_desc",  self._open_statistics,  "#1ABC9C"),
            ("card_reports",     "card_reports_desc",     self._open_reports,     "#2ECC71"),
            ("card_tax",         "card_tax_desc",         self._open_tax,         "#7F8C8D"),
            ("card_settings",    "card_settings_desc",    self._open_settings,    "#34495E"),
        ]

        COLS = 4
        for idx, (label_key, desc_key, cmd, accent) in enumerate(cards):
            row, col = divmod(idx, COLS)
            card = self._make_card(
                grid,
                pos_locale.t(label_key),
                pos_locale.t(desc_key),
                cmd,
                accent,
            )
            card.grid(row=row, column=col, padx=8, pady=8, sticky="nsew")

        for c in range(COLS):
            grid.columnconfigure(c, weight=1)

    def _make_card(self, parent, label: str, desc: str, command, accent: str):
        """Return a clickable card frame."""
        frame = tk.Frame(
            parent, bg=COLOR_CARD_BG,
            bd=1, relief="solid",
            cursor="hand2",
            padx=14, pady=14,
        )
        # accent left bar
        bar = tk.Frame(frame, bg=accent, width=4)
        bar.pack(side="left", fill="y")

        inner = tk.Frame(frame, bg=COLOR_CARD_BG)
        inner.pack(side="left", fill="both", expand=True, padx=(10, 0))

        title_lbl = tk.Label(
            inner, text=label,
            font=("Helvetica", 10, "bold"),
            bg=COLOR_CARD_BG, fg=COLOR_TEXT,
            anchor="w", justify="left", wraplength=180,
        )
        title_lbl.pack(anchor="w")

        desc_lbl = tk.Label(
            inner, text=desc,
            font=("Helvetica", 8),
            bg=COLOR_CARD_BG, fg=COLOR_MUTED,
            anchor="w", justify="left", wraplength=180,
        )
        desc_lbl.pack(anchor="w", pady=(2, 0))

        # Hover effects
        def on_enter(e, f=frame, i=inner, t=title_lbl, d=desc_lbl):
            for w in (f, i, t, d): w.configure(bg=COLOR_CARD_HVR)
        def on_leave(e, f=frame, i=inner, t=title_lbl, d=desc_lbl):
            for w in (f, i, t, d): w.configure(bg=COLOR_CARD_BG)

        for w in (frame, inner, title_lbl, desc_lbl):
            w.bind("<Enter>", on_enter)
            w.bind("<Leave>", on_leave)
            w.bind("<Button-1>", lambda e, c=command, lk=label: c(lk))

        return frame

    # ──────────────────────────────────────────────────────────────────────
    # Low-stock section
    # ──────────────────────────────────────────────────────────────────────
    def _build_low_stock_section(self):
        section = tk.Frame(self.body, bg=COLOR_BG)
        section.pack(fill="x", padx=20, pady=(16, 4))

        tk.Label(
            section,
            text=pos_locale.t("low_stock_alerts"),
            font=("Helvetica", 12, "bold"),
            bg=COLOR_BG, fg=COLOR_TEXT, anchor="w",
        ).pack(anchor="w")

        self.stock_body = tk.Frame(self.body, bg=COLOR_BG)
        self.stock_body.pack(fill="x", padx=20, pady=(4, 20))

        # Placeholder while loading
        self.stock_placeholder = tk.Label(
            self.stock_body,
            text=pos_locale.t("loading") if "loading" in pos_locale.TRANSLATIONS else "Loading…",
            font=("Helvetica", 9),
            bg=COLOR_BG, fg=COLOR_MUTED,
        )
        self.stock_placeholder.pack(anchor="w")

    def _load_low_stock(self):
        """Populate the low-stock table from cache or DB."""
        alerts = []
        try:
            products = cache_manager.get_table("products")
            lots     = cache_manager.get_table("inventory_lots")
            if products:
                for p in products:
                    stock = sum(
                        float(l["quantity"])
                        for l in lots
                        if l["product_id"] == p["product_id"]
                    )
                    threshold = float(p.get("min_stock_threshold") or 0)
                    if stock <= threshold:
                        alerts.append({
                            "name":      p.get("name", ""),
                            "category":  p.get("category", ""),
                            "location":  p.get("store_location", ""),
                            "stock":     int(stock),
                            "threshold": int(threshold),
                            "shortage":  int(threshold - stock),
                        })
            else:
                # Fallback to DB
                from db import get_connection
                conn = get_connection()
                try:
                    cur = conn.cursor()
                    cur.execute(
                        """SELECT p.name, c.category_name AS category,
                                  p.store_location AS location,
                                  COALESCE(SUM(il.quantity),0) AS stock,
                                  p.min_stock_threshold AS threshold
                           FROM products p
                           JOIN categories c ON c.category_id = p.category_id
                           LEFT JOIN inventory_lots il ON il.product_id = p.product_id
                           GROUP BY p.product_id, p.name, c.category_name,
                                    p.store_location, p.min_stock_threshold
                           HAVING stock <= threshold
                           ORDER BY (threshold - stock) DESC"""
                    )
                    rows = cur.fetchall()
                    cur.close()
                    for r in rows:
                        alerts.append({
                            "name":      r["name"],
                            "category":  r["category"],
                            "location":  r.get("location", ""),
                            "stock":     int(r["stock"]),
                            "threshold": int(r["threshold"]),
                            "shortage":  int(r["threshold"] - r["stock"]),
                        })
                finally:
                    conn.close()
        except Exception as e:
            print("[Dashboard] Low-stock load error:", e)

        # Destroy placeholder
        for w in self.stock_body.winfo_children():
            w.destroy()

        if not alerts:
            tk.Label(
                self.stock_body,
                text=pos_locale.t("all_stocked"),
                font=("Helvetica", 9),
                bg=COLOR_BG, fg=COLOR_GREEN,
            ).pack(anchor="w")
            return

        # Treeview table
        cols = ("name", "category", "location", "stock", "threshold", "shortage")
        headers = [
            pos_locale.t("product_name"),
            pos_locale.t("category"),
            pos_locale.t("location"),
            pos_locale.t("stock"),
            pos_locale.t("min_threshold"),
            pos_locale.t("shortage"),
        ]
        widths = [180, 120, 120, 70, 100, 80]

        tree = ttk.Treeview(
            self.stock_body, columns=cols, show="headings", height=min(len(alerts), 8),
        )
        for col, hdr, w in zip(cols, headers, widths):
            tree.heading(col, text=hdr)
            tree.column(col, width=w, anchor="center")
        tree.column("name", anchor="w")

        for a in alerts:
            tree.insert("", "end", values=(
                a["name"], a["category"], a["location"] or "—",
                a["stock"], a["threshold"], f"-{a['shortage']}",
            ))

        tree.tag_configure("low", foreground=COLOR_BADGE_RED)
        for iid in tree.get_children():
            tree.item(iid, tags=("low",))

        scroll = ttk.Scrollbar(self.stock_body, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scroll.set)
        tree.pack(side="left", fill="x", expand=True)
        scroll.pack(side="right", fill="y")

    # ──────────────────────────────────────────────────────────────────────
    # Card actions
    # ──────────────────────────────────────────────────────────────────────
    def _open_pos(self, _label=""):
        """Open the POS sales window as a Toplevel."""
        if self._sales_window_open:
            return
        self._sales_window_open = True
        pos_win = tk.Toplevel(self.root)
        from pos.sales_window import SalesWindow
        sw = SalesWindow(pos_win, self.user)
        pos_win.protocol("WM_DELETE_WINDOW", lambda: self._on_pos_close(pos_win))

    def _on_pos_close(self, win: tk.Toplevel):
        self._sales_window_open = False
        win.destroy()

    def _open_web_orders(self, _label=""):
        from orders.web_orders_dashboard import WebOrdersDashboard
        WebOrdersDashboard(self.root, self.user)

    def _open_stock(self, _label=""):
        from inventory.adjustment_window import AdjustmentWindow
        AdjustmentWindow(self.root, self.user)

    def _open_adjustments(self, _label=""):
        from inventory.adjustment_window import AdjustmentWindow
        AdjustmentWindow(self.root, self.user)

    def _open_products(self, _label=""):
        from admin.products_window import ProductsWindow
        ProductsWindow(self.root, self.user)

    def _open_categories(self, _label=""):
        from admin.categories_window import CategoriesWindow
        CategoriesWindow(self.root, self.user)

    def _open_price_rules(self, _label=""):
        from admin.price_rules_window import PriceRulesWindow
        PriceRulesWindow(self.root, self.user)

    def _open_users(self, _label=""):
        from admin.users_window import UsersWindow
        UsersWindow(self.root, self.user)

    def _open_statistics(self, _label=""):
        from admin.statistics_window import StatisticsWindow
        StatisticsWindow(self.root, self.user)

    def _open_reports(self, _label=""):
        from admin.reports_window import ReportsWindow
        ReportsWindow(self.root, self.user)

    def _open_tax(self, _label=""):
        from admin.tax_window import TaxWindow
        TaxWindow(self.root, self.user)

    def _open_settings(self, _label=""):
        """Reuse the server settings dialog from login_window."""
        from auth.login_window import LoginWindow
        # Instead of spawning the full login flow, inline the settings dialog
        win = tk.Toplevel(self.root)
        win.title(pos_locale.t("card_settings"))
        win.geometry("300x370")
        win.resizable(False, False)
        win.configure(bg=COLOR_BG)

        import os
        from config import BASE_DIR
        env_path = os.path.join(BASE_DIR, ".env")
        env_data = {
            "DB_HOST": "localhost", "DB_NAME": "hybrid_store",
            "DB_USER": "root", "DB_PASSWORD": "", "DB_PORT": "3306",
        }
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        env_data[k] = v

        for lbl, key, show in [
            ("Host:",     "DB_HOST",     ""),
            ("Database:", "DB_NAME",     ""),
            ("Username:", "DB_USER",     ""),
            ("Password:", "DB_PASSWORD", "*"),
            ("Port:",     "DB_PORT",     ""),
        ]:
            tk.Label(win, text=lbl, bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack(pady=(8, 0))
            e = tk.Entry(win, width=30, show=show)
            e.insert(0, env_data.get(key, ""))
            e.pack()
            env_data[f"_entry_{key}"] = e   # store ref

        def save():
            for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_PORT"):
                env_data[key] = env_data[f"_entry_{key}"].get()
            with open(env_path, "w") as f:
                for k in ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_PORT"):
                    f.write(f"{k}={env_data[k]}\n")
            from tkinter import messagebox
            messagebox.showinfo("Saved", "Server credentials updated.")
            win.destroy()

        tk.Button(
            win, text="Save Changes",
            bg=COLOR_RED, fg=COLOR_WHITE,
            font=("Helvetica", 10, "bold"),
            command=save,
        ).pack(pady=16)

    def _stub_window(self, label=""):
        """Generic 'Coming Soon' dialog for unimplemented features."""
        from tkinter import messagebox
        messagebox.showinfo(
            pos_locale.t("coming_soon"),
            f"{label}\n\n{pos_locale.t('coming_soon_desc')}",
        )

    # ──────────────────────────────────────────────────────────────────────
    # Logout
    # ──────────────────────────────────────────────────────────────────────
    def _logout(self):
        self.root.destroy()
