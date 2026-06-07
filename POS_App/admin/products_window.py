"""
admin/products_window.py — Manage products.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT, COLOR_GREEN
from db import get_connection
import pos_locale


class ProductsWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("products_management"))
        self.window.geometry("1100x700")
        self.window.configure(bg=COLOR_BG)
        
        self.categories = []
        self.tax_categories = []
        self.editing_id = None
        
        self._load_dependencies()
        self._build_ui()
        self._load_data()

    def _load_dependencies(self):
        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT category_id, name FROM product_categories ORDER BY name")
                self.categories = cur.fetchall()
                cur.execute("SELECT tax_category_id, name, rate FROM tax_categories ORDER BY name")
                self.tax_categories = cur.fetchall()
                cur.close()
            finally:
                conn.close()
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("products_management"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Form
        self.form_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        self.form_frame.pack(fill='x')

        self.form_title = tk.Label(self.form_frame, text=pos_locale.t("add_product"), font=("Helvetica", 10, "bold"), bg=COLOR_BG, fg=COLOR_TEXT)
        self.form_title.grid(row=0, column=0, columnspan=4, sticky='w', pady=(0, 10))

        # Row 1
        tk.Label(self.form_frame, text=pos_locale.t("name"), bg=COLOR_BG).grid(row=1, column=0, sticky='e', padx=5, pady=2)
        self.name_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.name_var, width=30).grid(row=1, column=1, sticky='w', pady=2)

        tk.Label(self.form_frame, text=pos_locale.t("product_categories"), bg=COLOR_BG).grid(row=1, column=2, sticky='e', padx=5, pady=2)
        self.cat_var = tk.StringVar()
        cat_combo = ttk.Combobox(self.form_frame, textvariable=self.cat_var, state='readonly', width=27)
        cat_combo['values'] = [f"{c['category_id']} - {c['name']}" for c in self.categories]
        cat_combo.grid(row=1, column=3, sticky='w', pady=2)
        if self.categories: cat_combo.current(0)

        # Row 2
        tk.Label(self.form_frame, text=pos_locale.t("default_price"), bg=COLOR_BG).grid(row=2, column=0, sticky='e', padx=5, pady=2)
        self.price_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.price_var, width=15).grid(row=2, column=1, sticky='w', pady=2)

        tk.Label(self.form_frame, text=pos_locale.t("store_location"), bg=COLOR_BG).grid(row=2, column=2, sticky='e', padx=5, pady=2)
        self.location_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.location_var, width=30).grid(row=2, column=3, sticky='w', pady=2)

        # Row 3
        tk.Label(self.form_frame, text=pos_locale.t("tax_categories"), bg=COLOR_BG).grid(row=3, column=0, sticky='e', padx=5, pady=2)
        self.tax_var = tk.StringVar()
        tax_combo = ttk.Combobox(self.form_frame, textvariable=self.tax_var, state='readonly', width=27)
        tax_combo['values'] = [f"{t['tax_category_id']} - {t['name']} ({t['rate']}%)" for t in self.tax_categories]
        tax_combo.grid(row=3, column=1, sticky='w', pady=2)
        if self.tax_categories: tax_combo.current(0)

        tk.Label(self.form_frame, text=pos_locale.t("min_stock"), bg=COLOR_BG).grid(row=3, column=2, sticky='e', padx=5, pady=2)
        self.min_stock_var = tk.StringVar(value="0")
        tk.Entry(self.form_frame, textvariable=self.min_stock_var, width=15).grid(row=3, column=3, sticky='w', pady=2)

        # Row 4
        tk.Label(self.form_frame, text=pos_locale.t("image_url"), bg=COLOR_BG).grid(row=4, column=0, sticky='e', padx=5, pady=2)
        self.img_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.img_var, width=30).grid(row=4, column=1, sticky='w', pady=2)

        tk.Label(self.form_frame, text=pos_locale.t("description"), bg=COLOR_BG).grid(row=4, column=2, sticky='e', padx=5, pady=2)
        self.desc_var = tk.StringVar()
        tk.Entry(self.form_frame, textvariable=self.desc_var, width=30).grid(row=4, column=3, sticky='w', pady=2)

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
        self.cancel_btn.pack_forget() # Hide initially

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)

        action_frame = tk.Frame(table_frame, bg=COLOR_BG)
        action_frame.pack(fill='x', pady=(0, 4))
        tk.Button(action_frame, text=pos_locale.t("edit"), bg="#3498db", fg=COLOR_WHITE, relief='flat', padx=12, command=self._edit).pack(side='left')

        cols = ("id", "name", "category", "price", "tax", "location", "stock", "min")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=12)
        headers = ["ID", pos_locale.t("name"), pos_locale.t("product_categories"), pos_locale.t("price"), pos_locale.t("tax"), pos_locale.t("store_location"), pos_locale.t("stock"), pos_locale.t("min_stock")]
        widths = [40, 200, 150, 80, 100, 120, 60, 60]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='w' if col in ("name", "category", "location", "tax") else 'center')
            
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
                    SELECT p.product_id, p.name, p.default_selling_price, p.store_location, p.min_stock_threshold,
                           p.category_id, c.name as category_name,
                           p.tax_category_id, t.name as tax_name, t.rate as tax_rate,
                           p.description, p.img_url,
                           COALESCE(vs.total_stock, 0) as current_stock
                    FROM products p
                    JOIN product_categories c ON p.category_id = c.category_id
                    JOIN tax_categories t ON p.tax_category_id = t.tax_category_id
                    LEFT JOIN vw_product_stock vs ON vs.product_id = p.product_id
                    ORDER BY p.product_id DESC
                """)
                self.products = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            self.tree.delete(*self.tree.get_children())
            for r in self.products:
                self.tree.insert('', 'end', iid=str(r['product_id']), values=(
                    r['product_id'],
                    r['name'],
                    r['category_name'],
                    f"{r['default_selling_price']}",
                    f"{r['tax_name']} ({r['tax_rate']}%)",
                    r['store_location'] or "",
                    int(r['current_stock']),
                    r['min_stock_threshold']
                ))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _edit(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Select", "Please select a product to edit.")
            return
            
        product_id = int(sel[0])
        prod = next((p for p in self.products if p['product_id'] == product_id), None)
        if not prod: return

        self.editing_id = product_id
        self.form_title.config(text=f"{pos_locale.t('edit')} #{product_id}")
        self.name_var.set(prod['name'])
        self.price_var.set(str(prod['default_selling_price']))
        self.location_var.set(prod['store_location'] or "")
        self.min_stock_var.set(str(prod['min_stock_threshold']))
        self.desc_var.set(prod['description'] or "")
        self.img_var.set(prod['img_url'] or "")
        
        # Set combos
        for v in self.cat_var, self.tax_var: v.set("")
        for v in self.cat_var, self.tax_var:
            combo = self.window.nametowidget(str(v)) if hasattr(self, 'window') else None # Find combo by var is hard, just iterate values manually
            
        for val in self.window.nametowidget(str(self.cat_var._name) if hasattr(self.cat_var, '_name') else "").master.children.values():
            if isinstance(val, ttk.Combobox):
                pass # Just build a small helper to set combo by ID
        
        # Helper to set Combobox value by ID
        def set_combo(var, options, target_id):
            for opt in options:
                if opt.startswith(f"{target_id} -"):
                    var.set(opt)
                    break
                    
        set_combo(self.cat_var, [f"{c['category_id']} - {c['name']}" for c in self.categories], prod['category_id'])
        set_combo(self.tax_var, [f"{t['tax_category_id']} - {t['name']} ({t['rate']}%)" for t in self.tax_categories], prod['tax_category_id'])

        self.cancel_btn.pack(side='left', padx=5)

    def _cancel_edit(self):
        self.editing_id = None
        self.form_title.config(text=pos_locale.t("add_product"))
        self.name_var.set("")
        self.price_var.set("")
        self.location_var.set("")
        self.min_stock_var.set("0")
        self.desc_var.set("")
        self.img_var.set("")
        self.cancel_btn.pack_forget()

    def _submit(self):
        name = self.name_var.get().strip()
        price_str = self.price_var.get().strip()
        cat_str = self.cat_var.get()
        tax_str = self.tax_var.get()
        min_str = self.min_stock_var.get().strip()
        loc = self.location_var.get().strip()
        desc = self.desc_var.get().strip()
        img = self.img_var.get().strip()

        if not name or not price_str or not cat_str or not tax_str:
            messagebox.showwarning("Warning", "Name, Price, Category, and Tax are required.")
            return

        try:
            price = float(price_str)
            min_stock = int(min_str) if min_str else 0
            cat_id = int(cat_str.split(" - ")[0])
            tax_id = int(tax_str.split(" - ")[0])
        except ValueError:
            messagebox.showwarning("Invalid Input", "Please check your numbers and selections.")
            return

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                if self.editing_id:
                    cur.execute("""
                        UPDATE products SET name=%s, category_id=%s, default_selling_price=%s,
                        store_location=%s, tax_category_id=%s, min_stock_threshold=%s,
                        description=%s, img_url=%s WHERE product_id=%s
                    """, (name, cat_id, price, loc or None, tax_id, min_stock, desc or None, img or None, self.editing_id))
                else:
                    cur.execute("""
                        INSERT INTO products (name, category_id, default_selling_price, store_location,
                        tax_category_id, min_stock_threshold, description, img_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (name, cat_id, price, loc or None, tax_id, min_stock, desc or None, img or None))
                conn.commit()
                cur.close()
            finally:
                conn.close()
            
            messagebox.showinfo("Success", pos_locale.t("product_saved"))
            self._cancel_edit()
            self._load_data()
        except Exception as e:
            if 'conn' in locals(): conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))
