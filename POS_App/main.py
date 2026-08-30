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

import subprocess

def start_mysql_service():
    try:
        # Silently attempt to start MySQL service via PowerShell
        cmd = 'powershell -Command "$s = Get-Service -Name MySQL* -ErrorAction SilentlyContinue; if ($s) { if ($s.Status -ne \'Running\') { Start-Service -Name $s.Name -ErrorAction SilentlyContinue } }"'
        subprocess.run(cmd, shell=True, creationflags=subprocess.CREATE_NO_WINDOW)
    except Exception:
        pass

def main():
    # Attempt to start MySQL server automatically
    start_mysql_service()

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
