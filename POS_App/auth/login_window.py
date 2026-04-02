"""
auth/login_window.py — Tkinter login window for AKLI POS App.
REQ-14: Password policy | REQ-15: bcrypt verification | REQ-21: title top-left.
i18n: Uses system locale before login; switches to user.preferred_lang after.
"""
import tkinter as tk
from tkinter import messagebox
import bcrypt
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_GREEN, COLOR_WHITE, COLOR_BG, COLOR_TEXT, COLOR_MUTED, COLOR_BORDER
from db import get_connection
from auth.registration_window import RegistrationWindow
import locale as pos_locale   # our translation module


class LoginWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title(pos_locale.t("app_title"))
        self.root.geometry("420x400") # slightly taller for new buttons
        self.root.resizable(False, False)
        self.root.configure(bg=COLOR_BG)
        self.logged_in_user = None

        self._check_version()
        self._build_ui()
        self.root.mainloop()

    def _check_version(self):
        self.update_available = False
        try:
            import urllib.request
            version_path = os.path.join(os.path.dirname(__file__), '..', 'version.txt')
            if os.path.exists(version_path):
                with open(version_path, 'r') as f: local_v = f.read().strip()
                
                # Fetch remote version from GitHub Raw URL
                url = "https://raw.githubusercontent.com/aklsof/Updates/main/Aklishop_version.txt"
                req = urllib.request.Request(url, headers={'Cache-Control': 'no-cache'})
                with urllib.request.urlopen(req, timeout=3) as response:
                    remote_v = response.read().decode('utf-8').strip()
                if local_v and remote_v:
                    def parse_v(v_str):
                        return tuple(int(x) for x in v_str.replace('-', '.').split('.') if x.isdigit())
                    if parse_v(remote_v) > parse_v(local_v):
                        self.update_available = True
        except Exception as e:
            print(f"Version check failed: {e}")
            pass


    def _build_ui(self):
        # Header bar (title top-left per REQ-21)
        header = tk.Frame(self.root, bg=COLOR_RED, height=60)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("app_title"), font=("Helvetica", 14, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, anchor='w', padx=16).pack(side='left', pady=12)

        # Language switcher
        lang_frame = tk.Frame(header, bg=COLOR_RED)
        lang_frame.pack(side='right', padx=16, pady=12)

        settings_btn = tk.Button(lang_frame, text="⚙ Server", font=("Helvetica", 9, "bold"),
                        bg=COLOR_WHITE, fg=COLOR_TEXT, relief='flat', cursor='hand2',
                        padx=4, pady=2, command=self._open_settings)
        settings_btn.pack(side='left', padx=6)

        for lang_code, lang_label in [('en', 'EN'), ('fr', 'FR'), ('ar', 'ع')]:
            btn = tk.Button(lang_frame, text=lang_label, font=("Helvetica", 9, "bold"),
                            bg=COLOR_WHITE if pos_locale.get_lang() == lang_code else COLOR_RED,
                            fg=COLOR_RED if pos_locale.get_lang() == lang_code else COLOR_WHITE,
                            relief='flat', padx=6, pady=2, cursor='hand2',
                            command=lambda c=lang_code: self._switch_lang(c))
            btn.pack(side='left', padx=2)

        # Form area
        form = tk.Frame(self.root, bg=COLOR_BG, padx=32, pady=24)
        form.pack(fill='both', expand=True)

        tk.Label(form, text=pos_locale.t("username"), font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).grid(row=0, column=0, sticky='w', pady=(0, 2))
        self.username_var = tk.StringVar()
        tk.Entry(form, textvariable=self.username_var, font=("Helvetica", 11),
                 bd=1, relief='solid', width=28).grid(row=1, column=0, pady=(0, 12), sticky='ew')

        tk.Label(form, text=pos_locale.t("password"), font=("Helvetica", 9, "bold"),
                 bg=COLOR_BG, fg=COLOR_MUTED).grid(row=2, column=0, sticky='w', pady=(0, 2))
        self.password_var = tk.StringVar()
        tk.Entry(form, textvariable=self.password_var, show='*', font=("Helvetica", 11),
                 bd=1, relief='solid', width=28).grid(row=3, column=0, pady=(0, 18), sticky='ew')

        self.error_label = tk.Label(form, text="", font=("Helvetica", 9),
                                    bg=COLOR_BG, fg=COLOR_RED)
        self.error_label.grid(row=4, column=0, sticky='w', pady=(0, 8))

        btn_frame = tk.Frame(form, bg=COLOR_BG)
        btn_frame.grid(row=5, column=0, sticky='ew')
        login_btn = tk.Button(btn_frame, text=pos_locale.t("sign_in"), font=("Helvetica", 10, "bold"),
                              bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                              padx=24, pady=8, command=self._handle_login,
                              activebackground=COLOR_RED_DK, activeforeground=COLOR_WHITE)
        login_btn.pack(fill='x', pady=(0, 8))

        register_btn = tk.Button(btn_frame, text=pos_locale.t("register"), font=("Helvetica", 10, "bold"),
                              bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                              padx=24, pady=8, command=self._open_registration)
        register_btn.pack(fill='x')

        if getattr(self, 'update_available', False):
            update_btn = tk.Button(btn_frame, text="Update Available!", font=("Helvetica", 10, "bold"),
                                   bg=COLOR_GREEN, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                                   padx=24, pady=8, command=self._trigger_update)
            update_btn.pack(fill='x', pady=(8, 0))

        self.root.bind('<Return>', lambda e: self._handle_login())

    def _handle_login(self):
        username = self.username_var.get().strip()
        password = self.password_var.get()

        if not username or not password:
            self._show_error(pos_locale.t("username_password_required"))
            return

        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT user_id, username, password_hash, role, user_type, preferred_lang, is_active "
                "FROM users WHERE username = %s",
                (username,)
            )
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if not user:
                self._show_error(pos_locale.t("invalid_credentials"))
                return

            if not user['is_active']:
                self._show_error(pos_locale.t("account_deactivated"))
                return

            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                self._show_error(pos_locale.t("invalid_credentials"))
                return

            # Switch locale to the authenticated user's preferred language
            lang = (user.get('preferred_lang') or 'en').strip().lower()[:2]
            pos_locale.set_lang(lang)

            self.logged_in_user = user
            self.root.destroy()

        except Exception as e:
            self._show_error(f"{pos_locale.t('db_error')}: {e}")

    def _switch_lang(self, lang_code):
        uname = self.username_var.get()
        pwd = self.password_var.get()
        pos_locale.set_lang(lang_code)
        self.root.title(pos_locale.t("app_title"))
        for widget in self.root.winfo_children():
            widget.destroy()
        self._build_ui()
        self.username_var.set(uname)
        self.password_var.set(pwd)

    def _open_registration(self):
        RegistrationWindow(self.root)

    def _open_settings(self):
        win = tk.Toplevel(self.root)
        win.title("Server Credentials")
        win.geometry("300x350")
        win.resizable(False, False)
        win.configure(bg=COLOR_BG)

        env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        env_data = {'DB_HOST': 'localhost', 'DB_NAME': 'hybrid_store', 'DB_USER': 'root', 'DB_PASSWORD': '', 'DB_PORT': '3306'}
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                for line in f:
                    if '=' in line:
                        k, v = line.strip().split('=', 1)
                        env_data[k] = v

        tk.Label(win, text="Host:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack(pady=(12, 0))
        host_ent = tk.Entry(win, width=30)
        host_ent.insert(0, env_data.get('DB_HOST', ''))
        host_ent.pack()

        tk.Label(win, text="Database:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack()
        db_ent = tk.Entry(win, width=30)
        db_ent.insert(0, env_data.get('DB_NAME', ''))
        db_ent.pack()

        tk.Label(win, text="Username:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack()
        user_ent = tk.Entry(win, width=30)
        user_ent.insert(0, env_data.get('DB_USER', ''))
        user_ent.pack()

        tk.Label(win, text="Password:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack()
        pwd_ent = tk.Entry(win, width=30, show="*")
        pwd_ent.insert(0, env_data.get('DB_PASSWORD', ''))
        pwd_ent.pack()

        tk.Label(win, text="Port:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack()
        port_ent = tk.Entry(win, width=30)
        port_ent.insert(0, env_data.get('DB_PORT', ''))
        port_ent.pack()

        def save():
            env_data['DB_HOST'] = host_ent.get()
            env_data['DB_NAME'] = db_ent.get()
            env_data['DB_USER'] = user_ent.get()
            env_data['DB_PASSWORD'] = pwd_ent.get()
            env_data['DB_PORT'] = port_ent.get()
            with open(env_path, 'w') as f:
                for k, v in env_data.items():
                    f.write(f"{k}={v}\n")
            
            from config import DB_CONFIG
            DB_CONFIG['host'] = env_data['DB_HOST']
            DB_CONFIG['database'] = env_data['DB_NAME']
            DB_CONFIG['user'] = env_data['DB_USER']
            DB_CONFIG['password'] = env_data['DB_PASSWORD']
            DB_CONFIG['port'] = int(env_data['DB_PORT'] or '3306')
            
            messagebox.showinfo("Success", "Server credentials updated.")
            win.destroy()

        tk.Button(win, text="Save Changes", bg=COLOR_RED, fg=COLOR_WHITE, font=("Helvetica", 10, "bold"), command=save).pack(pady=16)

    def _trigger_update(self):
        import webbrowser
        webbrowser.open("https://github.com/aklsof/Updates/blob/main/README.md")
        messagebox.showinfo("Update", "Opening the update instructions in your browser.")

    def _show_error(self, msg):
        self.error_label.config(text=msg)

 