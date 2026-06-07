"""
admin/tax_window.py — Manage tax categories.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT
from db import get_connection
import pos_locale


class TaxWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("tax_categories"))
        self.window.geometry("600x480")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("tax_categories"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Form
        form = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        form.pack(fill='x')

        tk.Label(form, text=pos_locale.t("name"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w')
        self.name_var = tk.StringVar()
        tk.Entry(form, textvariable=self.name_var, width=25, font=("Helvetica", 10)).grid(row=0, column=1, padx=8, pady=4, sticky='w')

        tk.Label(form, text=pos_locale.t("rate_percent"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=1, column=0, sticky='w')
        self.rate_var = tk.StringVar()
        tk.Entry(form, textvariable=self.rate_var, width=12, font=("Helvetica", 10)).grid(row=1, column=1, padx=8, pady=4, sticky='w')

        tk.Button(form, text=pos_locale.t("add_tax_category"), font=("Helvetica", 9, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=6,
                  command=self._submit).grid(row=2, column=0, columnspan=2, pady=12, sticky='w')

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)

        cols = ("id", "name", "rate", "created")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=10)
        headers = ["ID", pos_locale.t("name"), pos_locale.t("rate_percent"), pos_locale.t("created")]
        widths = [50, 200, 100, 150]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='w' if col == "name" else 'center')
            
        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True, pady=(0, 20))
        scroll.pack(side="right", fill="y", pady=(0, 20))

    def _load_data(self):
        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT tax_category_id, name, rate, created_at FROM tax_categories ORDER BY tax_category_id")
                rows = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', values=(
                    r['tax_category_id'],
                    r['name'],
                    f"{r['rate']}%",
                    str(r['created_at'])[:10] if r['created_at'] else "—"
                ))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _submit(self):
        name = self.name_var.get().strip()
        rate_str = self.rate_var.get().strip()

        if not name or not rate_str:
            messagebox.showwarning("Warning", "Please fill all fields.")
            return

        try:
            rate = float(rate_str)
            if rate < 0 or rate > 100:
                raise ValueError("Rate must be between 0 and 100.")
        except ValueError as e:
            messagebox.showwarning("Invalid Input", str(e))
            return

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO tax_categories (name, rate) VALUES (%s, %s)",
                    (name, rate)
                )
                conn.commit()
                cur.close()
            finally:
                conn.close()
            messagebox.showinfo("Success", pos_locale.t("tax_category_created"))
            self.name_var.set("")
            self.rate_var.set("")
            self._load_data()
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))
