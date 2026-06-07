"""
admin/price_rules_window.py — Manage price rules.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT
from db import get_connection
import pos_locale


class PriceRulesWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("price_rules"))
        self.window.geometry("1000x600")
        self.window.configure(bg=COLOR_BG)
        
        self.products = []
        self.editing_id = None
        
        self._load_dependencies()
        self._build_ui()
        self._load_data()

    def _load_dependencies(self):
        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT product_id, name FROM products ORDER BY name")
                self.products = cur.fetchall()
                cur.close()
            finally:
                conn.close()
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("price_rules"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Form
        self.form_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        self.form_frame.pack(fill='x')

        self.form_title = tk.Label(self.form_frame, text=pos_locale.t("add_rule"), font=("Helvetica", 10, "bold"), bg=COLOR_BG, fg=COLOR_TEXT)
        self.form_title.grid(row=0, column=0, columnspan=4, sticky='w', pady=(0, 10))

        # Row 1
        tk.Label(self.form_frame, text=pos_locale.t("name"), bg=COLOR_BG).grid(row=1, column=0, sticky='e', padx=5, pady=2)
        self.prod_var = tk.StringVar()
        prod_combo = ttk.Combobox(self.form_frame, textvariable=self.prod_var, state='readonly', width=30)
        prod_combo['values'] = [f"{p['product_id']} - {p['name']}" for p in self.products]
        prod_combo.grid(row=1, column=1, sticky='w', pady=2)
        if self.products: prod_combo.current(0)

        tk.Label(self.form_frame, text=pos_locale.t("rule_type"), bg=COLOR_BG).grid(row=1, column=2, sticky='e', padx=5, pady=2)
        self.type_var = tk.StringVar(value="Deal")
        type_combo = ttk.Combobox(self.form_frame, textvariable=self.type_var, state='readonly', width=15)
        type_combo['values'] = ["Deal", "Rollback", "Clearance", "Holiday"]
        type_combo.grid(row=1, column=3, sticky='w', pady=2)

        # Row 2
        tk.Label(self.form_frame, text=pos_locale.t("promo_price"), bg=COLOR_BG).grid(row=2, column=0, sticky='e', padx=5, pady=2)
        self.price_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.price_var, width=15).grid(row=2, column=1, sticky='w', pady=2)

        self.active_var = tk.BooleanVar(value=True)
        tk.Checkbutton(self.form_frame, text=pos_locale.t("active"), variable=self.active_var, bg=COLOR_BG).grid(row=2, column=3, sticky='w', pady=2)

        # Row 3 (Dates) - YYYY-MM-DD HH:MM format
        tk.Label(self.form_frame, text=pos_locale.t("start_date"), bg=COLOR_BG).grid(row=3, column=0, sticky='e', padx=5, pady=2)
        self.start_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.start_var, width=20).grid(row=3, column=1, sticky='w', pady=2)
        tk.Label(self.form_frame, text="(YYYY-MM-DD HH:MM)", font=("Helvetica", 8), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=4, column=1, sticky='w')

        tk.Label(self.form_frame, text=pos_locale.t("end_date"), bg=COLOR_BG).grid(row=3, column=2, sticky='e', padx=5, pady=2)
        self.end_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.end_var, width=20).grid(row=3, column=3, sticky='w', pady=2)

        # Buttons
        btn_frame = tk.Frame(self.form_frame, bg=COLOR_BG)
        btn_frame.grid(row=5, column=0, columnspan=4, pady=10)
        
        self.submit_btn = tk.Button(btn_frame, text=pos_locale.t("save"), font=("Helvetica", 9, "bold"),
                                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=4,
                                  command=self._submit)
        self.submit_btn.pack(side='left', padx=5)
        
        self.cancel_btn = tk.Button(btn_frame, text=pos_locale.t("cancel"), font=("Helvetica", 9),
                                  bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat', padx=16, pady=4,
                                  command=self._cancel_edit)
        self.cancel_btn.pack(side='left', padx=5)
        self.cancel_btn.pack_forget()

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)

        action_frame = tk.Frame(table_frame, bg=COLOR_BG)
        action_frame.pack(fill='x', pady=(0, 4))
        tk.Button(action_frame, text=pos_locale.t("edit"), bg="#3498db", fg=COLOR_WHITE, relief='flat', padx=12, command=self._edit).pack(side='left', padx=(0, 8))
        tk.Button(action_frame, text=pos_locale.t("delete"), bg="#e74c3c", fg=COLOR_WHITE, relief='flat', padx=12, command=self._delete).pack(side='left')

        cols = ("id", "product", "type", "price", "start", "end", "active")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=10)
        headers = ["ID", pos_locale.t("name"), pos_locale.t("rule_type"), pos_locale.t("promo_price"), pos_locale.t("start_date"), pos_locale.t("end_date"), pos_locale.t("active")]
        widths = [40, 200, 100, 100, 150, 150, 60]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='w' if col == "product" else 'center')
            
        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True, pady=(0, 20))
        scroll.pack(side="right", fill="y", pady=(0, 20))

    def _load_data(self):
        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT pr.rule_id, pr.product_id, p.name as product_name, pr.rule_type,
                           pr.promotional_price, pr.start_date, pr.end_date, pr.is_active
                    FROM price_rules pr
                    JOIN products p ON p.product_id = pr.product_id
                    ORDER BY pr.is_active DESC, pr.end_date DESC
                """)
                self.rules = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            self.tree.delete(*self.tree.get_children())
            for r in self.rules:
                self.tree.insert('', 'end', iid=str(r['rule_id']), values=(
                    r['rule_id'],
                    r['product_name'],
                    r['rule_type'],
                    f"{r['promotional_price']}",
                    str(r['start_date'])[:16],
                    str(r['end_date'])[:16],
                    "✅" if r['is_active'] else "❌"
                ))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _edit(self):
        sel = self.tree.selection()
        if not sel: return
        rule_id = int(sel[0])
        rule = next((r for r in self.rules if r['rule_id'] == rule_id), None)
        if not rule: return

        self.editing_id = rule_id
        self.form_title.config(text=f"{pos_locale.t('edit')} #{rule_id}")
        
        for p in self.window.nametowidget(str(self.prod_var._name) if hasattr(self.prod_var, '_name') else "").master.children.values():
            if isinstance(p, ttk.Combobox): pass # helper logic similar to products

        # simpler combo search
        target_prod = f"{rule['product_id']} -"
        for val in self.prod_var.get() and [self.prod_var.get()] or []: pass # dummy
        combo_vals = [f"{p['product_id']} - {p['name']}" for p in self.products]
        for v in combo_vals:
            if v.startswith(target_prod):
                self.prod_var.set(v)
                break
                
        self.type_var.set(rule['rule_type'])
        self.price_var.set(str(rule['promotional_price']))
        self.start_var.set(str(rule['start_date'])[:16])
        self.end_var.set(str(rule['end_date'])[:16])
        self.active_var.set(bool(rule['is_active']))
        
        self.cancel_btn.pack(side='left', padx=5)

    def _cancel_edit(self):
        self.editing_id = None
        self.form_title.config(text=pos_locale.t("add_rule"))
        self.price_var.set("")
        self.start_var.set("")
        self.end_var.set("")
        self.active_var.set(True)
        self.cancel_btn.pack_forget()

    def _submit(self):
        prod_str = self.prod_var.get()
        r_type = self.type_var.get()
        price_str = self.price_var.get().strip()
        start_str = self.start_var.get().strip()
        end_str = self.end_var.get().strip()
        is_active = 1 if self.active_var.get() else 0

        if not prod_str or not price_str or not start_str or not end_str:
            messagebox.showwarning("Warning", "All fields are required.")
            return

        try:
            prod_id = int(prod_str.split(" - ")[0])
            price = float(price_str)
            
            # format check
            # DB accepts standard string format 'YYYY-MM-DD HH:MM:SS'
            start_date = datetime.strptime(start_str, "%Y-%m-%d %H:%M").strftime("%Y-%m-%d %H:%M:00")
            end_date = datetime.strptime(end_str, "%Y-%m-%d %H:%M").strftime("%Y-%m-%d %H:%M:00")
        except ValueError as e:
            messagebox.showwarning("Invalid Input", "Check numbers and ensure date format is YYYY-MM-DD HH:MM")
            return

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                if self.editing_id:
                    cur.execute("""
                        UPDATE price_rules SET product_id=%s, rule_type=%s, promotional_price=%s,
                        start_date=%s, end_date=%s, is_active=%s WHERE rule_id=%s
                    """, (prod_id, r_type, price, start_date, end_date, is_active, self.editing_id))
                else:
                    cur.execute("""
                        INSERT INTO price_rules (product_id, rule_type, promotional_price, start_date, end_date, is_active)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (prod_id, r_type, price, start_date, end_date, is_active))
                conn.commit()
                cur.close()
            finally:
                conn.close()
            
            messagebox.showinfo("Success", pos_locale.t("rule_saved"))
            self._cancel_edit()
            self._load_data()
        except Exception as e:
            if 'conn' in locals(): conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _delete(self):
        sel = self.tree.selection()
        if not sel: return
        rule_id = int(sel[0])
        if messagebox.askyesno("Confirm", pos_locale.t("confirm_delete")):
            try:
                conn = get_connection()
                try:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM price_rules WHERE rule_id=%s", (rule_id,))
                    conn.commit()
                    cur.close()
                finally:
                    conn.close()
                self._load_data()
            except Exception as e:
                if 'conn' in locals(): conn.rollback()
                messagebox.showerror("Error", str(e))
