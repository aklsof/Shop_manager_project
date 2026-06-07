"""
main.py — AKLI POS App entry point.
Flow: LoginWindow → DashboardWindow (service grid, low-stock alerts)
      → individual windows launched from dashboard cards.
"""
import sys
import os

# Ensure POS_App root is on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import tkinter as tk
from auth.login_window import LoginWindow
from pos.dashboard_window import DashboardWindow
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

    # Step 2: Show dashboard (welcome page)
    root = tk.Tk()
    DashboardWindow(root, user)
    root.mainloop()


if __name__ == '__main__':
    main()
