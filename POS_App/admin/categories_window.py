"""
admin/categories_window.py — Manage product categories.
"""
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT
from db import get_connection
import pos_locale


class CategoriesWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("product_categories"))
        self.window.geometry("600x500")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("product_categories"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Form
        form = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        form.pack(fill='x')

        tk.Label(form, text=pos_locale.t("name"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w')
        self.name_var = tk.StringVar()
        tk.Entry(form, textvariable=self.name_var, width=30, font=("Helvetica", 10)).grid(row=0, column=1, padx=8, pady=4, sticky='w')

        tk.Button(form, text=pos_locale.t("add_category"), font=("Helvetica", 9, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=6,
                  command=self._submit).grid(row=0, column=2, padx=10, sticky='w')

        # Action Buttons for Selection
        action_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        action_frame.pack(fill='x', pady=(0, 8))
        
        tk.Button(action_frame, text=pos_locale.t("rename"), font=("Helvetica", 9),
                  bg="#3498db", fg=COLOR_WHITE, relief='flat', padx=12, pady=4,
                  command=self._rename).pack(side='left', padx=(0, 8))
        
        tk.Button(action_frame, text=pos_locale.t("delete"), font=("Helvetica", 9),
                  bg="#e74c3c", fg=COLOR_WHITE, relief='flat', padx=12, pady=4,
                  command=self._delete).pack(side='left')

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)

        cols = ("id", "name", "created")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=12)
        headers = ["ID", pos_locale.t("name"), pos_locale.t("created")]
        widths = [50, 300, 150]
        
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
                cur.execute("SELECT category_id, name, created_at FROM product_categories ORDER BY category_id")
                rows = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', values=(
                    r['category_id'],
                    r['name'],
                    str(r['created_at'])[:10] if r['created_at'] else "—"
                ))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _submit(self):
        name = self.name_var.get().strip()

        if not name:
            messagebox.showwarning("Warning", "Please enter a category name.")
            return

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO product_categories (name) VALUES (%s)",
                    (name,)
                )
                conn.commit()
                cur.close()
            finally:
                conn.close()
            messagebox.showinfo("Success", pos_locale.t("category_created"))
            self.name_var.set("")
            self._load_data()
        except Exception as e:
            if 'conn' in locals():
                conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _rename(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Select", "Please select a category to rename.")
            return
            
        item = self.tree.item(sel[0])
        cat_id = item['values'][0]
        old_name = item['values'][1]
        
        new_name = simpledialog.askstring("Rename", f"Enter new name for '{old_name}':", parent=self.window, initialvalue=old_name)
        if new_name and new_name.strip() and new_name.strip() != old_name:
            try:
                conn = get_connection()
                try:
                    cur = conn.cursor()
                    cur.execute("UPDATE product_categories SET name=%s WHERE category_id=%s", (new_name.strip(), cat_id))
                    conn.commit()
                    cur.close()
                finally:
                    conn.close()
                self._load_data()
            except Exception as e:
                if 'conn' in locals(): conn.rollback()
                messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _delete(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Select", "Please select a category to delete.")
            return
            
        item = self.tree.item(sel[0])
        cat_id = item['values'][0]
        cat_name = item['values'][1]
        
        if messagebox.askyesno("Confirm", f"Delete category '{cat_name}'?\n\nThis will fail if products use this category."):
            try:
                conn = get_connection()
                try:
                    cur = conn.cursor()
                    cur.execute("DELETE FROM product_categories WHERE category_id=%s", (cat_id,))
                    conn.commit()
                    cur.close()
                finally:
                    conn.close()
                self._load_data()
            except Exception as e:
                if 'conn' in locals(): conn.rollback()
                messagebox.showerror("Error", f"Failed to delete (likely in use): {e}")
