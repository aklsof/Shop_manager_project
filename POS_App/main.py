"""
main.py — AKLI POS App entry point.
Launches login window, then opens sales window on successful auth.
"""
import sys
import os

# Ensure POS_App root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tkinter as tk
from auth.login_window import LoginWindow
from pos.sales_window import SalesWindow
from sync_manager import sync_worker


def main():
    # Start background sync (Safe initialization)
    try:
        sync_worker.start()
    except Exception as e:
        print(f"Sync failed to start: {e}")

    # Step 1: Show login
    login = LoginWindow()
    user = login.logged_in_user

    if not user:
        # Window was closed without logging in
        return

    # Step 2: Open main sales window
    root = tk.Tk()
    SalesWindow(root, user)
    root.mainloop()


if __name__ == '__main__':
    main()
