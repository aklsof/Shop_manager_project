"""
auth/login_window.py — Tkinter login window for AKLI POS App.
REQ-14: Password policy | REQ-15: bcrypt verification | REQ-21: title top-left.
"""
import tkinter as tk
from tkinter import messagebox
import bcrypt
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_GREEN, COLOR_WHITE, COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_BORDER
from db import get_connection


class LoginWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(APP_NAME)
        self.root.geometry("420x320")
        self.root.resizable(False, False)
        self.root.configure(bg=COLOR_BG)
        self.logged_in_user = None

        self._build_ui()
        self.root.mainloop()

    def _build_ui(self):
        # Header bar (title top-left per REQ-21)
        header = tk.Frame(self.root, bg=COLOR_RED, height=60)
        header.pack(fill='x')
        tk.Label(header, text=APP_NAME, font=("Helvetica", 14, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, anchor='w', padx=16).pack(side='left', pady=12)

        # Form area
        form = tk.Frame(self.root, bg=COLOR_BG, padx=32, pady=24)
        form.pack(fill='both', expand=True)

        tk.Label(form, text="Username", font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w', pady=(0, 2))
        self.username_var = tk.StringVar()
        tk.Entry(form, textvariable=self.username_var, font=("Helvetica", 11),
                 bd=1, relief='solid', width=28).grid(row=1, column=0, pady=(0, 12), sticky='ew')

        tk.Label(form, text="Password", font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).grid(row=2, column=0, sticky='w', pady=(0, 2))
        self.password_var = tk.StringVar()
        tk.Entry(form, textvariable=self.password_var, show='*', font=("Helvetica", 11),
                 bd=1, relief='solid', width=28).grid(row=3, column=0, pady=(0, 18), sticky='ew')

        self.error_label = tk.Label(form, text="", font=("Helvetica", 9),
                                    bg=COLOR_BG, fg=COLOR_RED)
        self.error_label.grid(row=4, column=0, sticky='w', pady=(0, 8))

        btn_frame = tk.Frame(form, bg=COLOR_BG)
        btn_frame.grid(row=5, column=0, sticky='ew')
        login_btn = tk.Button(btn_frame, text="Sign In", font=("Helvetica", 10, "bold"),
                              bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                              padx=24, pady=8, command=self._handle_login,
                              activebackground=COLOR_RED_DK, activeforeground=COLOR_WHITE)
        login_btn.pack(fill='x')
        self.root.bind('<Return>', lambda e: self._handle_login())

    def _handle_login(self):
        username = self.username_var.get().strip()
        password = self.password_var.get()

        if not username or not password:
            self._show_error("Username and password are required.")
            return

        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT user_id, username, password_hash, role, user_type, is_active "
                "FROM users WHERE username = %s",
                (username,)
            )
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if not user:
                self._show_error("Invalid username or password.")
                return

            if not user['is_active']:
                self._show_error("Account is deactivated. Contact administrator.")
                return

            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                self._show_error("Invalid username or password.")
                return

            self.logged_in_user = user
            self.root.destroy()

        except Exception as e:
            self._show_error(f"Database error: {e}")

    def _show_error(self, msg):
        self.error_label.config(text=msg)
