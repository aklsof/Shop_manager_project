"""
auth/registration_window.py — Tkinter admin-registration window.
i18n: Respects the current locale (system or user-selected).
Lets the new administrator choose their preferred_lang at registration time.
"""
import tkinter as tk
from tkinter import messagebox, ttk
import bcrypt
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_WHITE, COLOR_BG, COLOR_MUTED
from db import get_connection
import pos_locale


# Language options shown in the registration form
LANG_OPTIONS = [
    ("English",          "en"),
    ("Français (French)","fr"),
    ("العربية (Arabic)", "ar"),
]


class RegistrationWindow:
    def __init__(self, parent_root):
        self.window = tk.Toplevel(parent_root)
        self.window.title(f"{pos_locale.t('app_title')} - {pos_locale.t('register_admin')}")
        self.window.geometry("420x600")
        self.window.resizable(False, False)
        self.window.configure(bg=COLOR_BG)
        self.window.grab_set()

        self._build_ui()

    def _build_ui(self):
        # Header bar
        header = tk.Frame(self.window, bg=COLOR_RED, height=60)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("register_admin"), font=("Helvetica", 14, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, anchor='w', padx=16).pack(side='left', pady=12)

        # Form area
        form = tk.Frame(self.window, bg=COLOR_BG, padx=32, pady=24)
        form.pack(fill='both', expand=True)

        self.entries = {}
        fields = [
            (pos_locale.t("username"),   "username",  False),
            (pos_locale.t("email"),      "email",     False),
            (pos_locale.t("first_name"), "firstName", False),
            (pos_locale.t("last_name"),  "lastName",  False),
            (pos_locale.t("password"),   "password",  True),
        ]

        row = 0
        for label_text, var_name, is_password in fields:
            tk.Label(form, text=label_text, font=("Helvetica", 9, "bold"),
                     bg=COLOR_BG, fg=COLOR_MUTED).grid(row=row, column=0, sticky='w', pady=(0, 2))
            row += 1

            var = tk.StringVar()
            self.entries[var_name] = var
            entry = tk.Entry(form, textvariable=var, font=("Helvetica", 11), bd=1, relief='solid', width=28)
            if is_password:
                entry.config(show='*')
            entry.grid(row=row, column=0, pady=(0, 12), sticky='ew')
            row += 1

        # Preferred language selector
        tk.Label(form, text=pos_locale.t("preferred_lang"), font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).grid(row=row, column=0, sticky='w', pady=(0, 2))
        row += 1

        self.lang_var = tk.StringVar(value="en")
        lang_combo = ttk.Combobox(
            form,
            textvariable=self.lang_var,
            values=[label for label, _ in LANG_OPTIONS],
            state='readonly',
            font=("Helvetica", 10),
            width=27,
        )
        # Map display names to codes and vice-versa
        self._lang_display = {label: code for label, code in LANG_OPTIONS}
        self._lang_code_to_display = {code: label for label, code in LANG_OPTIONS}
        lang_combo.set(self._lang_code_to_display.get(pos_locale.get_lang(), "English"))
        lang_combo.grid(row=row, column=0, pady=(0, 12), sticky='ew')
        row += 1

        self.error_label = tk.Label(form, text="", font=("Helvetica", 9), bg=COLOR_BG, fg=COLOR_RED)
        self.error_label.grid(row=row, column=0, sticky='w', pady=(0, 8))
        row += 1

        btn_frame = tk.Frame(form, bg=COLOR_BG)
        btn_frame.grid(row=row, column=0, sticky='ew')

        register_btn = tk.Button(btn_frame, text=pos_locale.t("register"),
                                 font=("Helvetica", 10, "bold"),
                                 bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                                 padx=24, pady=8, command=self._handle_register,
                                 activebackground=COLOR_RED_DK, activeforeground=COLOR_WHITE)
        register_btn.pack(fill='x')

    def _handle_register(self):
        data = {k: v.get().strip() for k, v in self.entries.items()}

        if not all(data.values()):
            self._show_error(pos_locale.t("all_fields_required"))
            return

        password = self.entries['password'].get()

        # Resolve selected language code
        display_name = self.lang_var.get()
        preferred_lang = self._lang_display.get(display_name, "en")

        try:
            conn = get_connection()
            cursor = conn.cursor()

            # Check if username or email exists
            cursor.execute("SELECT user_id FROM users WHERE username = %s OR email = %s",
                           (data['username'], data['email']))
            if cursor.fetchone():
                self._show_error(pos_locale.t("username_email_exists"))
                cursor.close()
                conn.close()
                return

            pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            cursor.execute(
                "INSERT INTO users "
                "(username, email, user_firstName, user_lastName, password_hash, role, user_type, preferred_lang) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                (data['username'], data['email'], data['firstName'], data['lastName'],
                 pw_hash, 'Administrator', 'staff', preferred_lang)
            )
            conn.commit()
            cursor.close()
            conn.close()

            messagebox.showinfo(pos_locale.t("success"), pos_locale.t("registration_success"))
            self.window.destroy()

        except Exception as e:
            print(f"Error registering user: {e}")
            self._show_error(pos_locale.t("registration_failed"))

    def _show_error(self, msg):
        self.error_label.config(text=msg)
