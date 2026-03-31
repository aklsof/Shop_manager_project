import tkinter as tk
from tkinter import messagebox
import bcrypt
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import APP_NAME, COLOR_RED, COLOR_RED_DK, COLOR_WHITE, COLOR_BG, COLOR_MUTED
from db import get_connection

class RegistrationWindow:
    def __init__(self, parent_root):
        self.window = tk.Toplevel(parent_root)
        self.window.title(f"{APP_NAME} - Admin Registration")
        self.window.geometry("420x550")
        self.window.resizable(False, False)
        self.window.configure(bg=COLOR_BG)
        self.window.grab_set()

        self._build_ui()

    def _build_ui(self):
        # Header bar
        header = tk.Frame(self.window, bg=COLOR_RED, height=60)
        header.pack(fill='x')
        tk.Label(header, text="Register Administrator", font=("Helvetica", 14, "bold"),
                 bg=COLOR_RED, fg=COLOR_WHITE, anchor='w', padx=16).pack(side='left', pady=12)

        # Form area
        form = tk.Frame(self.window, bg=COLOR_BG, padx=32, pady=24)
        form.pack(fill='both', expand=True)

        self.entries = {}
        fields = [
            ("Username", "username"),
            ("Email", "email"),
            ("First Name", "firstName"),
            ("Last Name", "lastName"),
            ("Password", "password", True)
        ]

        row = 0
        for field in fields:
            label_text = field[0]
            var_name = field[1]
            is_password = len(field) > 2 and field[2]

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

        self.error_label = tk.Label(form, text="", font=("Helvetica", 9), bg=COLOR_BG, fg=COLOR_RED)
        self.error_label.grid(row=row, column=0, sticky='w', pady=(0, 8))
        row += 1

        btn_frame = tk.Frame(form, bg=COLOR_BG)
        btn_frame.grid(row=row, column=0, sticky='ew')
        
        register_btn = tk.Button(btn_frame, text="Register", font=("Helvetica", 10, "bold"),
                               bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', cursor='hand2',
                               padx=24, pady=8, command=self._handle_register,
                               activebackground=COLOR_RED_DK, activeforeground=COLOR_WHITE)
        register_btn.pack(fill='x')

    def _handle_register(self):
        data = {k: v.get().strip() for k, v in self.entries.items()}
        
        if not all(data.values()):
            self._show_error("All fields are required.")
            return

        password = self.entries['password'].get()

        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Check if username or email exists
            cursor.execute("SELECT user_id FROM users WHERE username = %s OR email = %s", (data['username'], data['email']))
            if cursor.fetchone():
                self._show_error("Username or email already exists.")
                cursor.close()
                conn.close()
                return

            pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            cursor.execute(
                "INSERT INTO users (username, email, user_firstName, user_lastName, password_hash, role, user_type) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (data['username'], data['email'], data['firstName'], data['lastName'], pw_hash, 'Administrator', 'admin')
            )
            conn.commit()
            cursor.close()
            conn.close()

            messagebox.showinfo("Success", "Administrator registered successfully. You can now log in.")
            self.window.destroy()

        except Exception as e:
            print(f"Error registering user: {e}")
            self._show_error("Registration failed. See console for details.")

    def _show_error(self, msg):
        self.error_label.config(text=msg)
