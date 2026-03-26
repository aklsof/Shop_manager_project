"""
inventory/adjustment_window.py — Inventory adjustment window for POS. REQ-33.
Allows selecting a lot, entering quantity delta and reason.
DB trigger trg_adjustment_apply auto-updates lot quantity.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_GREEN, COLOR_WHITE, COLOR_BG, COLOR_MUTED
from db import get_connection


class AdjustmentWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title("Inventory Adjustment")
        self.window.geometry("700x480")
        self.window.configure(bg=COLOR_BG)
        self.lots = []
        self._build_ui()
        self._load_lots()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text="🔧 Inventory Adjustment",
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        form = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        form.pack(fill='x')

        tk.Label(form, text="Select Lot:", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w')
        self.lot_var = tk.StringVar()
        self.lot_combo = ttk.Combobox(form, textvariable=self.lot_var, width=42, state='readonly')
        self.lot_combo.grid(row=0, column=1, padx=8, pady=4, sticky='ew')

        tk.Label(form, text="Qty Adjusted:", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=1, column=0, sticky='w', pady=(8, 0))
        self.qty_var = tk.StringVar()
        tk.Entry(form, textvariable=self.qty_var, width=12, font=("Helvetica", 10)).grid(row=1, column=1, sticky='w', padx=8)
        tk.Label(form, text="(negative = reduce stock)", font=("Helvetica", 8), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=1, column=2, sticky='w')

        tk.Label(form, text="Reason:", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=2, column=0, sticky='w', pady=(8, 0))
        self.reason_var = tk.StringVar()
        tk.Entry(form, textvariable=self.reason_var, width=44, font=("Helvetica", 10)).grid(row=2, column=1, padx=8, pady=4, sticky='ew')

        self.error_label = tk.Label(form, text="", fg=COLOR_RED, bg=COLOR_BG, font=("Helvetica", 9))
        self.error_label.grid(row=3, column=0, columnspan=3, sticky='w', pady=(4, 0))

        tk.Button(form, text="Record Adjustment", font=("Helvetica", 10, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=8,
                  command=self._submit).grid(row=4, column=0, columnspan=2, pady=12, sticky='w')

        # Log table
        tk.Label(self.window, text="Recent Adjustments", font=("Helvetica", 10, "bold"),
                 bg=COLOR_BG, anchor='w', padx=20).pack(fill='x')
        cols = ("date", "by", "product", "lot", "qty", "reason")
        self.tree = ttk.Treeview(self.window, columns=cols, show='headings', height=8)
        for col, hdr, w in zip(cols, ["Date", "By", "Product", "Lot #", "Qty", "Reason"], [110, 90, 140, 50, 50, 200]):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w)
        self.tree.pack(fill='both', expand=True, padx=12, pady=4)

    def _load_lots(self):
        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute("""SELECT il.lot_id, p.name AS product_name, il.quantity, il.date_received
                           FROM inventory_lots il JOIN products p ON p.product_id = il.product_id
                           WHERE il.quantity > 0 ORDER BY il.date_received DESC""")
            self.lots = cur.fetchall()
            cur.close(); conn.close()
            self.lot_combo['values'] = [f"Lot #{l['lot_id']} — {l['product_name']} (qty: {l['quantity']})" for l in self.lots]
            self._load_log()
        except Exception as e:
            messagebox.showerror("DB Error", str(e))

    def _load_log(self):
        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute("SELECT * FROM vw_inventory_adjustment_log ORDER BY adjustment_date DESC LIMIT 30")
            rows = cur.fetchall()
            cur.close(); conn.close()
            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', values=(
                    str(r.get('adjustment_date', ''))[:16],
                    r.get('adjusted_by', ''),
                    r.get('product_name', ''),
                    r.get('lot_id', ''),
                    r.get('quantity_adjusted', ''),
                    r.get('reason', ''),
                ))
        except Exception as e:
            messagebox.showerror("Log Error", str(e))

    def _submit(self):
        self.error_label.config(text="")
        sel = self.lot_combo.current()
        qty_str = self.qty_var.get().strip()
        reason = self.reason_var.get().strip()

        if sel < 0:
            self.error_label.config(text="Please select a lot."); return
        if not qty_str:
            self.error_label.config(text="Enter a quantity."); return
        try:
            qty = int(qty_str)
        except ValueError:
            self.error_label.config(text="Quantity must be a whole number."); return
        if qty == 0:
            self.error_label.config(text="Quantity cannot be zero."); return

        lot_id = self.lots[sel]['lot_id']
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO inventory_adjustments (lot_id, user_id, quantity_adjusted, reason) VALUES (%s, %s, %s, %s)",
                (lot_id, self.user['user_id'], qty, reason or None)
            )
            conn.commit()
            cur.close(); conn.close()
            messagebox.showinfo("Saved", "Adjustment recorded successfully.")
            self.qty_var.set('')
            self.reason_var.set('')
            self._load_lots()
        except Exception as e:
            self.error_label.config(text=str(e))
