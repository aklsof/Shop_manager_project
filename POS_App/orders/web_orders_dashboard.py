"""
orders/web_orders_dashboard.py — Web Orders Dashboard for POS.
REQ-34: Poll DB every 30 s | Show orders from vw_web_orders_dashboard.
Buttons to advance status: Pending → Ready for Pickup → Completed.
i18n: All strings from locale module.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_GREEN, COLOR_WHITE, COLOR_BG, COLOR_MUTED
from db import get_connection
import locale as pos_locale

POLL_INTERVAL = 30_000  # ms


class WebOrdersDashboard:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("web_orders_title"))
        self.window.geometry("860x500")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._refresh()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("web_orders_title"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)
        tk.Label(header, text=pos_locale.t("auto_refresh"),
                 font=("Helvetica", 8), bg=COLOR_RED, fg=COLOR_WHITE).pack(side='right', padx=12)

        # Status filter
        filter_frame = tk.Frame(self.window, bg=COLOR_BG, pady=8)
        filter_frame.pack(fill='x', padx=12)
        tk.Label(filter_frame, text=pos_locale.t("filter"), bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack(side='left')

        self.status_var = tk.StringVar(value="All")
        # We map translated label → DB value
        self._status_options = [
            (pos_locale.t("all"),             "All"),
            (pos_locale.t("pending"),         "Pending"),
            (pos_locale.t("ready_for_pickup"),"Ready for Pickup"),
            (pos_locale.t("completed"),       "Completed"),
        ]
        for label, value in self._status_options:
            tk.Radiobutton(filter_frame, text=label, variable=self.status_var, value=value,
                           bg=COLOR_BG, command=self._refresh).pack(side='left', padx=4)

        # Orders table
        cols = ("order_id", "client", "status", "items", "order_date")
        self.tree = ttk.Treeview(self.window, columns=cols, show='headings', height=15)
        headers = [
            pos_locale.t("order_num"),
            pos_locale.t("client"),
            pos_locale.t("status"),
            pos_locale.t("items"),
            pos_locale.t("date"),
        ]
        for col, hdr, w in zip(cols, headers, [70, 120, 150, 280, 130]):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w)
        self.tree.pack(fill='both', expand=True, padx=12, pady=4)
        self.tree.tag_configure('pending',  background='#fff3cd')
        self.tree.tag_configure('ready',    background='#d1ecf1')
        self.tree.tag_configure('complete', background='#d4edda')

        # Action buttons
        btn_frame = tk.Frame(self.window, bg=COLOR_BG, pady=8)
        btn_frame.pack(fill='x', padx=12)
        tk.Button(btn_frame, text=pos_locale.t("mark_ready"),
                  font=("Helvetica", 9, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6,
                  command=lambda: self._advance_status("Ready for Pickup")).pack(side='left', padx=4)
        tk.Button(btn_frame, text=pos_locale.t("mark_completed"),
                  font=("Helvetica", 9, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6,
                  command=lambda: self._advance_status("Completed")).pack(side='left', padx=4)
        tk.Button(btn_frame, text=pos_locale.t("refresh_now"),
                  font=("Helvetica", 9), bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6, command=self._refresh).pack(side='right', padx=4)

    def _refresh(self):
        if not self.window.winfo_exists():
            return
        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)
            status_filter = self.status_var.get()
            if status_filter == "All":
                cur.execute(
                    """SELECT order_id, client_username, status,
                              GROUP_CONCAT(CONCAT(product_name, ' x', quantity) SEPARATOR ', ') AS items,
                              order_date
                       FROM vw_web_orders_dashboard
                       GROUP BY order_id, client_username, status, order_date
                       ORDER BY order_date DESC"""
                )
            else:
                cur.execute(
                    """SELECT order_id, client_username, status,
                              GROUP_CONCAT(CONCAT(product_name, ' x', quantity) SEPARATOR ', ') AS items,
                              order_date
                       FROM vw_web_orders_dashboard
                       WHERE status = %s
                       GROUP BY order_id, client_username, status, order_date
                       ORDER BY order_date DESC""",
                    (status_filter,)
                )
            orders = cur.fetchall()
            cur.close(); conn.close()

            self.tree.delete(*self.tree.get_children())
            for o in orders:
                tag = 'pending' if o['status'] == 'Pending' else 'ready' if o['status'] == 'Ready for Pickup' else 'complete'
                self.tree.insert('', 'end', iid=str(o['order_id']),
                                 values=(o['order_id'], o['client_username'], o['status'],
                                         o['items'] or '', str(o['order_date'])[:16]),
                                 tags=(tag,))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

        # Schedule next auto-refresh
        self.window.after(POLL_INTERVAL, self._refresh)

    def _advance_status(self, new_status: str):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning(pos_locale.t("no_selection"), pos_locale.t("select_order_first"))
            return
        order_id = int(sel[0])
        current_status = self.tree.item(sel[0])['values'][2]

        if new_status == 'Completed' and current_status != 'Completed':
            # Execute checkout flow for web order
            try:
                conn = get_connection()
                cur = conn.cursor(dictionary=True)

                # Get items
                cur.execute(
                    """SELECT woi.product_id, woi.quantity, woi.price_at_order,
                              p.name, t.rate AS tax_rate
                       FROM web_order_items woi
                       JOIN products p ON p.product_id = woi.product_id
                       JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
                       WHERE woi.order_id = %s""",
                    (order_id,)
                )
                items = cur.fetchall()

                # Calculate total
                total_amount = sum(
                    (float(i['price_at_order']) * i['quantity']) * (1 + float(i['tax_rate']) / 100)
                    for i in items
                )

                # Create transaction
                cur.execute(
                    "INSERT INTO transactions (user_id, is_refund, total_amount) VALUES (%s, %s, %s)",
                    (self.user['user_id'], 0, total_amount)
                )
                transaction_id = cur.lastrowid

                receipt_items = []
                for item in items:
                    qty = item['quantity']
                    unit_price = float(item['price_at_order'])
                    tax_rate = float(item['tax_rate'])
                    line_total = unit_price * qty
                    tax_amount = line_total * tax_rate / 100

                    # FIFO lot
                    cur.execute(
                        """SELECT lot_id FROM vw_fifo_lot_queue
                           WHERE product_id = %s LIMIT 1""",
                        (item['product_id'],)
                    )
                    lot = cur.fetchone()
                    lot_id = lot['lot_id'] if lot else None

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
                        'name': item['name'], 'quantity': qty,
                        'unit_price': unit_price, 'tax_rate': tax_rate,
                        'line_total': line_total, 'tax_amount': tax_amount,
                    })

                # Mark order completed
                cur.execute(
                    "UPDATE web_orders SET status = %s, handled_by = %s WHERE order_id = %s",
                    (new_status, self.user['user_id'], order_id)
                )

                conn.commit()
                cur.close(); conn.close()

                # Print receipt
                from pos.receipt import generate_receipt
                pdf_path = generate_receipt(transaction_id, self.user['username'], receipt_items)
                try:
                    os.startfile(pdf_path)
                except Exception:
                    pass

                messagebox.showinfo(
                    pos_locale.t("completed_title"),
                    pos_locale.t("order_completed", id=order_id, tx=transaction_id)
                )
                self._refresh()

            except Exception as e:
                messagebox.showerror(pos_locale.t("checkout_error"), str(e))
        else:
            # Just advance status
            try:
                conn = get_connection()
                cur = conn.cursor()
                cur.execute(
                    "UPDATE web_orders SET status = %s, handled_by = %s WHERE order_id = %s",
                    (new_status, self.user['user_id'], order_id)
                )
                conn.commit()
                cur.close(); conn.close()
                self._refresh()
            except Exception as e:
                messagebox.showerror(pos_locale.t("update_error"), str(e))
