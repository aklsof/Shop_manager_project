"""
backup.py — Automated MySQL backup using mysqldump. REQ-29.
Run this script manually or schedule via Windows Task Scheduler every 24h.

Setup Task Scheduler:
  Action: python C:/path/to/POS_App/backup.py
  Trigger: Daily at 02:00 AM
"""
import subprocess
import os
from datetime import datetime
from config import DB_CONFIG

BACKUP_DIR = os.path.join(os.path.dirname(__file__), '..', 'backups')
MYSQLDUMP_PATH = r"C:\xampp\mysql\bin\mysqldump.exe"  # Adjust if XAMPP is in a different location


def run_backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"hybrid_store_backup_{timestamp}.sql"
    filepath = os.path.join(BACKUP_DIR, filename)

    cmd = [
        MYSQLDUMP_PATH,
        f"--host={DB_CONFIG['host']}",
        f"--port={DB_CONFIG['port']}",
        f"--user={DB_CONFIG['user']}",
        f"--password={DB_CONFIG['password']}",
        DB_CONFIG['database'],
    ]

    try:
        with open(filepath, 'w') as f:
            result = subprocess.run(cmd, stdout=f, stderr=subprocess.PIPE, text=True)
        if result.returncode != 0:
            print(f"[BACKUP ERROR] {result.stderr}")
        else:
            size_kb = os.path.getsize(filepath) / 1024
            print(f"[BACKUP OK] {filename} ({size_kb:.1f} KB)")
    except Exception as e:
        print(f"[BACKUP FAILED] {e}")


if __name__ == '__main__':
    run_backup()
