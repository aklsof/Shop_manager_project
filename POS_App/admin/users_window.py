"""
admin/users_window.py — Manage staff/admin users.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os
import bcrypt

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT
from db import get_connection
import pos_locale


class UsersWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("user_management"))
        self.window.geometry("900x500")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("user_management"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Form
        form = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        form.pack(fill='x')

        # Row 1
        tk.Label(form, text="Username", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w')
        self.user_var = tk.StringVar()
        tk.Entry(form, textvariable=self.user_var, width=20, font=("Helvetica", 10)).grid(row=0, column=1, padx=8, pady=4, sticky='w')

        tk.Label(form, text="Password", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=2, sticky='w')
        self.pwd_var = tk.StringVar()
        tk.Entry(form, textvariable=self.pwd_var, width=20, font=("Helvetica", 10), show="*").grid(row=0, column=3, padx=8, pady=4, sticky='w')

        # Row 2
        tk.Label(form, text=pos_locale.t("role"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=1, column=0, sticky='w')
        self.role_var = tk.StringVar(value="Store Associate")
        ttk.Combobox(form, textvariable=self.role_var, values=["Store Associate", "Administrator"], state='readonly', width=18).grid(row=1, column=1, padx=8, pady=4, sticky='w')

        tk.Label(form, text=pos_locale.t("user_type"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=1, column=2, sticky='w')
        self.type_var = tk.StringVar(value="staff")
        ttk.Combobox(form, textvariable=self.type_var, values=["staff", "client"], state='readonly', width=18).grid(row=1, column=3, padx=8, pady=4, sticky='w')

        # Row 3
        tk.Label(form, text=pos_locale.t("language"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).grid(row=2, column=0, sticky='w')
        self.lang_var = tk.StringVar(value="en")
        ttk.Combobox(form, textvariable=self.lang_var, values=["en", "fr", "ar", "es"], state='readonly', width=18).grid(row=2, column=1, padx=8, pady=4, sticky='w')

        tk.Button(form, text=pos_locale.t("add_user"), font=("Helvetica", 9, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=6,
                  command=self._submit).grid(row=3, column=0, columnspan=2, pady=12, sticky='w')

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)
        
        action_frame = tk.Frame(table_frame, bg=COLOR_BG)
        action_frame.pack(fill='x', pady=(0, 4))
        tk.Button(action_frame, text=f"{pos_locale.t('activate')} / {pos_locale.t('deactivate')}", 
                  bg="#3498db", fg=COLOR_WHITE, relief='flat', padx=12, command=self._toggle_status).pack(side='left')

        cols = ("id", "username", "role", "type", "lang", "status")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=10)
        headers = ["ID", "Username", pos_locale.t("role"), pos_locale.t("user_type"), pos_locale.t("language"), pos_locale.t("status")]
        widths = [40, 150, 150, 80, 60, 80]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='w' if col in ("username", "role") else 'center')
            
        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True, pady=(0, 20))
        scroll.pack(side="right", fill="y", pady=(0, 20))

    def _load_data(self):
        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("SELECT user_id, username, role, user_type, preferred_lang, is_active FROM users ORDER BY user_id")
                rows = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', iid=str(r['user_id']), values=(
                    r['user_id'],
                    r['username'],
                    r['role'],
                    r['user_type'],
                    r['preferred_lang'],
                    "Active" if r['is_active'] else "Inactive"
                ))
        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _submit(self):
        username = self.user_var.get().strip()
        pwd = self.pwd_var.get()
        role = self.role_var.get()
        u_type = self.type_var.get()
        lang = self.lang_var.get()

        if not username or not pwd:
            messagebox.showwarning("Warning", "Username and Password are required.")
            return

        try:
            pw_hash = bcrypt.hashpw(pwd.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO users (username, password_hash, user_firstName, user_lastName, email, role, user_type, preferred_lang, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)
                """, (username, pw_hash, username, "User", f"{username}@example.com", role, u_type, lang))
                conn.commit()
                cur.close()
            finally:
                conn.close()
            messagebox.showinfo("Success", pos_locale.t("user_created"))
            self.user_var.set("")
            self.pwd_var.set("")
            self._load_data()
        except Exception as e:
            if 'conn' in locals(): conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _toggle_status(self):
        sel = self.tree.selection()
        if not sel: return
        user_id = int(sel[0])
        item = self.tree.item(sel[0])
        is_active = item['values'][5] == "Active"
        new_status = 0 if is_active else 1

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                cur.execute("UPDATE users SET is_active=%s WHERE user_id=%s", (new_status, user_id))
                conn.commit()
                cur.close()
            finally:
                conn.close()
            self._load_data()
        except Exception as e:
            if 'conn' in locals(): conn.rollback()
            messagebox.showerror(pos_locale.t("db_error"), str(e))
