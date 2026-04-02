"""
pos/sales_window.py — Main POS sales interface.
REQ-3: Price from vw_active_price | REQ-4: FIFO lot selection | REQ-35: Per-item tax.
i18n: All user-visible strings pulled from locale module.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import (APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_GREEN,
                    COLOR_WHITE, COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_BORDER)
from db import get_connection
from pos.receipt import generate_receipt
import locale as pos_locale
import subprocess


class SalesWindow:
    def __init__(self, root: tk.Tk, user: dict):
        self.root = root
        self.user = user
        self.cart = []  # list of {product_id, name, quantity, unit_price, tax_rate, lot_id}
        self.refund_mode = False

        self.root.title(f"{pos_locale.t('app_title')} — {pos_locale.t('sales_title')}")
        self.root.geometry("920x600")
        self.root.configure(bg=COLOR_BG)

        self._build_ui()
        self._load_products()

    def _build_ui(self):
        # Top bar
        top = tk.Frame(self.root, bg=COLOR_RED, height=50)
        top.pack(fill='x')
        tk.Label(top, text=pos_locale.t("app_title"), font=("Helvetica", 12, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=10)
        tk.Label(top, text=f"  {pos_locale.t('cashier')}: {self.user['username']}",
                 font=("Helvetica", 9), bg=COLOR_RED, fg=COLOR_WHITE).pack(side='left', pady=10)

        # Language switcher
        lang_frame = tk.Frame(top, bg=COLOR_RED)
        lang_frame.pack(side='right', padx=12, pady=10)
        for lang_code, lang_label in [('en', 'EN'), ('fr', 'FR'), ('ar', 'ع')]:
            btn = tk.Button(lang_frame, text=lang_label, font=("Helvetica", 9, "bold"),
                            bg=COLOR_WHITE if pos_locale.get_lang() == lang_code else COLOR_RED,
                            fg=COLOR_RED if pos_locale.get_lang() == lang_code else COLOR_WHITE,
                            relief='flat', padx=6, pady=2, cursor='hand2',
                            command=lambda c=lang_code: self._switch_lang(c))
            btn.pack(side='left', padx=2)

        lbl = pos_locale.t("refund_mode_on") if self.refund_mode else pos_locale.t("refund_mode_off")
        color = COLOR_GREEN if self.refund_mode else COLOR_WHITE
        fg = COLOR_WHITE if self.refund_mode else COLOR_RED
        self.refund_btn = tk.Button(top, text=lbl,
                                     font=("Helvetica", 9, "bold"),
                                     bg=color, fg=fg, relief='flat', padx=10,
                                     command=self._toggle_refund)
        self.refund_btn.pack(side='right', padx=12, pady=8)

        # Orders & Pickups tab buttons (packed BEFORE main so it claims the bottom edge)
        bottom_frame = tk.Frame(self.root, bg=COLOR_BG)
        bottom_frame.pack(side='bottom', fill='x', padx=12, pady=4)

        tk.Button(bottom_frame, text=pos_locale.t("manage_pickups"),
                  font=("Helvetica", 9, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE,
                  relief='flat', command=self._open_orders).pack(side='right', padx=4)

        tk.Button(bottom_frame, text=pos_locale.t("orders_dashboard"),
                  font=("Helvetica", 9), bg=COLOR_WHITE, fg=COLOR_RED,
                  relief='flat', command=self._open_orders).pack(side='right', padx=4)

        tk.Button(bottom_frame, text=pos_locale.t("inventory_adjustments"),
                  font=("Helvetica", 9), bg=COLOR_MUTED, fg=COLOR_WHITE,
                  relief='flat', command=self._open_adjustments).pack(side='left', padx=4)

        # Main layout: left=products, right=cart
        main = tk.Frame(self.root, bg=COLOR_BG)
        main.pack(fill='both', expand=True, padx=12, pady=12)

        # Left: product search + list
        left = tk.Frame(main, bg=COLOR_BG, width=420)
        left.pack(side='left', fill='both', expand=True, padx=(0, 8))

        search_frame = tk.Frame(left, bg=COLOR_BG)
        search_frame.pack(fill='x', pady=(0, 8))
        tk.Label(search_frame, text=pos_locale.t("search_product"), font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left')
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *a: self._filter_products())
        tk.Entry(search_frame, textvariable=self.search_var, font=("Helvetica", 10),
                 bd=1, relief='solid').pack(side='left', padx=8, fill='x', expand=True)

        tk.Button(search_frame, text=pos_locale.t("refresh"), font=("Helvetica", 8, "bold"),
                  bg=COLOR_GREEN, fg=COLOR_WHITE, relief='flat', padx=8,
                  command=self._load_products).pack(side='right')

        cols = ("name", "category", "price", "stock")
        self.product_tree = ttk.Treeview(left, columns=cols, show='headings', height=16)
        for col, hdr, w in zip(cols,
                               [pos_locale.t("product"), pos_locale.t("category"),
                                pos_locale.t("price_da"), pos_locale.t("stock")],
                               [200, 90, 90, 60]):
            self.product_tree.heading(col, text=hdr)
            self.product_tree.column(col, width=w)
        self.product_tree.pack(fill='both', expand=True)
        self.product_tree.bind('<Double-1>', self._add_to_cart)

        tk.Label(left, text=pos_locale.t("double_click_hint"), font=("Helvetica", 8),
                 bg=COLOR_BG, fg=COLOR_MUTED).pack()

        # Right: cart
        right = tk.Frame(main, bg=COLOR_WHITE, bd=1, relief='solid', width=360)
        right.pack(side='right', fill='both')

        tk.Label(right, text=pos_locale.t("current_sale"), font=("Helvetica", 11, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, padx=8, pady=8).pack(fill='x')

        cart_cols = ("name", "qty", "price", "tax")
        self.cart_tree = ttk.Treeview(right, columns=cart_cols, show='headings', height=14)
        for col, hdr, w in zip(cart_cols,
                               [pos_locale.t("item"), pos_locale.t("qty"),
                                pos_locale.t("price"), pos_locale.t("tax")],
                               [150, 40, 70, 70]):
            self.cart_tree.heading(col, text=hdr)
            self.cart_tree.column(col, width=w)
        self.cart_tree.pack(fill='both', expand=True, padx=4, pady=4)
        tk.Button(right, text=pos_locale.t("remove_selected"), font=("Helvetica", 8),
                  bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat', padx=8, pady=4,
                  command=self._remove_from_cart).pack(pady=2)

        self.total_label = tk.Label(right, text=pos_locale.t("total", amount="0.00"),
                                     font=("Helvetica", 13, "bold"),
                                     bg=COLOR_WHITE, fg=COLOR_RED)
        self.total_label.pack(pady=8)

        btn_frame = tk.Frame(right, bg=COLOR_WHITE)
        btn_frame.pack(fill='x', padx=8, pady=8)
        tk.Button(btn_frame, text=pos_locale.t("checkout_print"),
                  font=("Helvetica", 10, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE,
                  relief='flat', padx=8, pady=10, command=self._checkout).pack(fill='x', pady=(0, 4))
        tk.Button(btn_frame, text=pos_locale.t("clear_cart"),
                  font=("Helvetica", 9), bg=COLOR_MUTED, fg=COLOR_WHITE,
                  relief='flat', padx=8, pady=6, command=self._clear_cart).pack(fill='x')

        self.all_products = []

    def _load_products(self):
        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                """SELECT p.product_id, p.name, p.category,
                          COALESCE(v.effective_price, p.default_selling_price) AS effective_price,
                          t.rate AS tax_rate,
                          COALESCE(SUM(il.quantity), 0) AS total_stock
                   FROM products p
                   JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
                   LEFT JOIN vw_active_price v ON v.product_id = p.product_id
                   LEFT JOIN inventory_lots il ON il.product_id = p.product_id
                   GROUP BY p.product_id, p.name, p.category,
                            v.effective_price, p.default_selling_price, t.rate
                   ORDER BY p.category, p.name"""
            )
            self.all_products = cur.fetchall()
            cur.close(); conn.close()
            self._populate_product_tree(self.all_products)
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _populate_product_tree(self, products):
        self.product_tree.delete(*self.product_tree.get_children())
        for p in products:
            stock = int(p['total_stock'])
            tag = 'low' if stock <= 0 else ''
            self.product_tree.insert('', 'end', iid=str(p['product_id']),
                                     values=(p['name'], p['category'],
                                             f"{float(p['effective_price']):.2f}", stock),
                                     tags=(tag,))
        self.product_tree.tag_configure('low', foreground='grey')

    def _filter_products(self):
        q = self.search_var.get().lower()
        filtered = [p for p in self.all_products if q in p['name'].lower() or q in p['category'].lower()]
        self._populate_product_tree(filtered)

    def _add_to_cart(self, event=None):
        sel = self.product_tree.selection()
        if not sel: return
        product_id = int(sel[0])
        product = next((p for p in self.all_products if p['product_id'] == product_id), None)
        if not product: return

        stock = int(product['total_stock'])

        from tkinter import simpledialog
        input_qty = simpledialog.askinteger(
            pos_locale.t("qty"),
            pos_locale.t("quantity_for", name=product['name']),
            parent=self.root, initialvalue=1, minvalue=1
        )
        if not input_qty:
            return  # user cancelled

        if stock < input_qty and not self.refund_mode:
            messagebox.showwarning(
                pos_locale.t("not_enough_stock"),
                pos_locale.t("only_n_available", n=stock, name=product['name'])
            )
            return

        # Check if already in cart
        for item in self.cart:
            if item['product_id'] == product_id:
                qty_delta = -input_qty if self.refund_mode else input_qty

                if not self.refund_mode and (item['quantity'] + qty_delta) > stock:
                    messagebox.showwarning(
                        pos_locale.t("not_enough_stock"),
                        pos_locale.t("only_n_available", n=stock, name=product['name'])
                    )
                    return

                item['quantity'] += qty_delta
                if item['quantity'] == 0: self.cart.remove(item)
                self._refresh_cart()
                return

        qty = -input_qty if self.refund_mode else input_qty
        self.cart.append({
            'product_id': product_id,
            'name': product['name'],
            'quantity': qty,
            'unit_price': float(product['effective_price']),
            'tax_rate': float(product['tax_rate']),
        })
        self._refresh_cart()

    def _remove_from_cart(self):
        sel = self.cart_tree.selection()
        if not sel: return
        idx = int(sel[0])
        if 0 <= idx < len(self.cart):
            self.cart.pop(idx)
        self._refresh_cart()

    def _clear_cart(self):
        self.cart.clear()
        self._refresh_cart()

    def _refresh_cart(self):
        self.cart_tree.delete(*self.cart_tree.get_children())
        total = 0.0
        for i, item in enumerate(self.cart):
            line = item['unit_price'] * abs(item['quantity'])
            tax = line * item['tax_rate'] / 100
            sign = '-' if item['quantity'] < 0 else ''
            self.cart_tree.insert('', 'end', iid=str(i),
                                  values=(item['name'], item['quantity'],
                                          f"{sign}{line:.2f}", f"{sign}{tax:.2f}"))
            total += (line + tax) * (1 if item['quantity'] > 0 else -1)
        self.total_label.config(text=pos_locale.t("total", amount=f"{total:.2f}"))

    def _toggle_refund(self):
        self.refund_mode = not self.refund_mode
        label = pos_locale.t("refund_mode_on") if self.refund_mode else pos_locale.t("refund_mode_off")
        color = COLOR_GREEN if self.refund_mode else COLOR_WHITE
        fg = COLOR_WHITE if self.refund_mode else COLOR_RED
        self.refund_btn.config(text=label, bg=color, fg=fg)

    def _checkout(self):
        if not self.cart:
            messagebox.showwarning(pos_locale.t("empty_cart"), pos_locale.t("add_items_first"))
            return

        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)

            # Calculate total amount
            total_amount = sum(
                (item['unit_price'] * abs(item['quantity'])) * (1 + item['tax_rate'] / 100)
                * (1 if item['quantity'] > 0 else -1)
                for item in self.cart
            )

            # Insert transaction
            cur.execute(
                "INSERT INTO transactions (user_id, is_refund, total_amount) VALUES (%s, %s, %s)",
                (self.user['user_id'], 1 if self.refund_mode else 0, total_amount)
            )
            transaction_id = cur.lastrowid

            receipt_items = []
            for item in self.cart:
                # FIFO: get oldest lot with stock
                cur.execute(
                    """SELECT lot_id, remaining_quantity FROM vw_fifo_lot_queue
                       WHERE product_id = %s LIMIT 1""",
                    (item['product_id'],)
                )
                lot = cur.fetchone()
                lot_id = lot['lot_id'] if lot else None

                qty = item['quantity']
                unit_price = item['unit_price']
                tax_rate = item['tax_rate']
                line_total = unit_price * abs(qty)
                tax_amount = line_total * tax_rate / 100

                cur.execute(
                    """INSERT INTO transaction_items
                       (transaction_id, product_id, lot_id, quantity, price_applied, tax_applied)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (transaction_id, item['product_id'], lot_id, qty, unit_price, tax_amount)
                )

                if lot_id:
                    cur.execute(
                        "UPDATE inventory_lots SET quantity = quantity - %s WHERE lot_id = %s",
                        (qty, lot_id)
                    )

                receipt_items.append({
                    'name': item['name'], 'quantity': abs(qty),
                    'unit_price': unit_price, 'tax_rate': tax_rate,
                    'line_total': line_total, 'tax_amount': tax_amount,
                })

            conn.commit()
            cur.close(); conn.close()

            # Generate receipt
            pdf_path = generate_receipt(transaction_id, self.user['username'], receipt_items)
            try:
                os.startfile(pdf_path)  # Windows: open PDF
            except Exception:
                pass

            messagebox.showinfo(
                pos_locale.t("sale_complete"),
                pos_locale.t("transaction_saved", id=transaction_id, file=os.path.basename(pdf_path))
            )
            self._clear_cart()
            self._load_products()  # Refresh stock counts

        except Exception as e:
            messagebox.showerror(pos_locale.t("checkout_error"), str(e))

    def _open_orders(self):
        from orders.web_orders_dashboard import WebOrdersDashboard
        WebOrdersDashboard(self.root, self.user)

    def _switch_lang(self, lang_code):
        pos_locale.set_lang(lang_code)
        self.root.title(f"{pos_locale.t('app_title')} — {pos_locale.t('sales_title')}")
        
        # Update user's preferred language in the database
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("UPDATE users SET preferred_lang = %s WHERE user_id = %s", (lang_code, self.user['user_id']))
            conn.commit()
            cur.close()
            conn.close()
            self.user['preferred_lang'] = lang_code
        except Exception as e:
            print("Failed to save language preference:", e)
            
        search_val = self.search_var.get()
        # Destroy all layout
        for widget in self.root.winfo_children():
            widget.destroy()
            
        # Rebuild layout with new language
        self._build_ui()
        self.search_var.set(search_val)
        self._load_products()
        self._refresh_cart()

    def _open_adjustments(self):
        from inventory.adjustment_window import AdjustmentWindow
        AdjustmentWindow(self.root, self.user)
