"""
pos/sales_window.py — Main POS sales interface.
REQ-3: Price from vw_active_price | REQ-4: FIFO lot selection | REQ-35: Per-item tax.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import (APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_GREEN,
                    COLOR_WHITE, COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_BORDER)
from db import get_connection
from pos.receipt import generate_receipt
import subprocess


class SalesWindow:
    def __init__(self, root: tk.Tk, user: dict):
        self.root = root
        self.user = user
        self.cart = []  # list of {product_id, name, quantity, unit_price, tax_rate, lot_id}
        self.refund_mode = False

        self.root.title(f"{APP_NAME} — Sales")
        self.root.geometry("920x600")
        self.root.configure(bg=COLOR_BG)

        self._build_ui()
        self._load_products()

    def _build_ui(self):
        # Top bar
        top = tk.Frame(self.root, bg=COLOR_RED, height=50)
        top.pack(fill='x')
        tk.Label(top, text=APP_NAME, font=("Helvetica", 12, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=10)
        tk.Label(top, text=f"  Cashier: {self.user['username']}",
                 font=("Helvetica", 9), bg=COLOR_RED, fg=COLOR_WHITE).pack(side='left', pady=10)

        self.refund_btn = tk.Button(top, text="🔄 Refund Mode: OFF", font=("Helvetica", 9, "bold"),
                                     bg=COLOR_WHITE, fg=COLOR_RED, relief='flat', padx=10,
                                     command=self._toggle_refund)
        self.refund_btn.pack(side='right', padx=12, pady=8)

        # Orders & Pickups tab buttons (packed BEFORE main so it claims the bottom edge)
        bottom_frame = tk.Frame(self.root, bg=COLOR_BG)
        bottom_frame.pack(side='bottom', fill='x', padx=12, pady=4)

        tk.Button(bottom_frame, text="📦 Manage & Validate Web Pickups",
                  font=("Helvetica", 9, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE,
                  relief='flat', command=self._open_orders).pack(side='right', padx=4)

        tk.Button(bottom_frame, text="📋 Web Orders Dashboard",
                  font=("Helvetica", 9), bg=COLOR_WHITE, fg=COLOR_RED,
                  relief='flat', command=self._open_orders).pack(side='right', padx=4)

        tk.Button(bottom_frame, text="⚙️ Inventory Adjustments (Receive Stock)",
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
        tk.Label(search_frame, text="Search Product:", font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left')
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *a: self._filter_products())
        tk.Entry(search_frame, textvariable=self.search_var, font=("Helvetica", 10),
                 bd=1, relief='solid').pack(side='left', padx=8, fill='x', expand=True)

        tk.Button(search_frame, text="🔄 Refresh", font=("Helvetica", 8, "bold"),
                  bg=COLOR_GREEN, fg=COLOR_WHITE, relief='flat', padx=8,
                  command=self._load_products).pack(side='right')

        cols = ("name", "category", "price", "stock")
        self.product_tree = ttk.Treeview(left, columns=cols, show='headings', height=16)
        for col, hdr, w in zip(cols, ["Product", "Category", "Price (DA)", "Stock"], [200, 90, 90, 60]):
            self.product_tree.heading(col, text=hdr)
            self.product_tree.column(col, width=w)
        self.product_tree.pack(fill='both', expand=True)
        self.product_tree.bind('<Double-1>', self._add_to_cart)

        tk.Label(left, text="Double-click to add to cart", font=("Helvetica", 8),
                 bg=COLOR_BG, fg=COLOR_MUTED).pack()

        # Right: cart
        right = tk.Frame(main, bg=COLOR_WHITE, bd=1, relief='solid', width=360)
        right.pack(side='right', fill='both')

        tk.Label(right, text="Current Sale", font=("Helvetica", 11, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, padx=8, pady=8).pack(fill='x')

        cart_cols = ("name", "qty", "price", "tax")
        self.cart_tree = ttk.Treeview(right, columns=cart_cols, show='headings', height=14)
        for col, hdr, w in zip(cart_cols, ["Item", "Qty", "Price", "Tax"], [150, 40, 70, 70]):
            self.cart_tree.heading(col, text=hdr)
            self.cart_tree.column(col, width=w)
        self.cart_tree.pack(fill='both', expand=True, padx=4, pady=4)
        tk.Button(right, text="Remove Selected", font=("Helvetica", 8),
                  bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat', padx=8, pady=4,
                  command=self._remove_from_cart).pack(pady=2)

        self.total_label = tk.Label(right, text="TOTAL: 0.00 DA", font=("Helvetica", 13, "bold"),
                                     bg=COLOR_WHITE, fg=COLOR_RED)
        self.total_label.pack(pady=8)

        btn_frame = tk.Frame(right, bg=COLOR_WHITE)
        btn_frame.pack(fill='x', padx=8, pady=8)
        tk.Button(btn_frame, text="✅ Checkout & Print Receipt",
                  font=("Helvetica", 10, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE,
                  relief='flat', padx=8, pady=10, command=self._checkout).pack(fill='x', pady=(0, 4))
        tk.Button(btn_frame, text="🗑 Clear Cart",
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
            messagebox.showerror("DB Error", str(e))

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
        input_qty = simpledialog.askinteger("Quantity", f"Quantity for {product['name']}:",
                                            parent=self.root, initialvalue=1, minvalue=1)
        if not input_qty:
            return  # user cancelled

        if stock < input_qty and not self.refund_mode:
            messagebox.showwarning("Not Enough Stock", f"Only {stock} available for '{product['name']}'.")
            return

        # Check if already in cart
        for item in self.cart:
            if item['product_id'] == product_id:
                qty_delta = -input_qty if self.refund_mode else input_qty
                
                if not self.refund_mode and (item['quantity'] + qty_delta) > stock:
                    messagebox.showwarning("Not Enough Stock", f"Cannot add {input_qty} more. Only {stock} total exist in stock.")
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
        self.total_label.config(text=f"TOTAL: {total:.2f} DA")

    def _toggle_refund(self):
        self.refund_mode = not self.refund_mode
        label = "🔄 Refund Mode: ON" if self.refund_mode else "🔄 Refund Mode: OFF"
        color = COLOR_GREEN if self.refund_mode else COLOR_WHITE
        fg = COLOR_WHITE if self.refund_mode else COLOR_RED
        self.refund_btn.config(text=label, bg=color, fg=fg)

    def _checkout(self):
        if not self.cart:
            messagebox.showwarning("Empty Cart", "Add items before checking out.")
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

            messagebox.showinfo("Sale Complete",
                                f"Transaction #{transaction_id} saved!\nReceipt: {os.path.basename(pdf_path)}")
            self._clear_cart()
            self._load_products()  # Refresh stock counts

        except Exception as e:
            messagebox.showerror("Checkout Error", str(e))

    def _open_orders(self):
        from orders.web_orders_dashboard import WebOrdersDashboard
        WebOrdersDashboard(self.root, self.user)

    def _open_adjustments(self):
        from inventory.adjustment_window import AdjustmentWindow
        AdjustmentWindow(self.root, self.user)
