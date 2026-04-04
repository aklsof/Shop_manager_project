"""
sync_manager.py — Background data synchronization between Primary (Netlify) and Secondary (filess.io) DBs.
Runs every 2 minutes as requested.
"""
import time
import threading
from db import get_connection
import cache_manager

class CacheWorker:
    """Background thread that pulls from SQL to JSON every 2 minutes."""
    def __init__(self, interval_seconds=120):
        self.interval = interval_seconds
        self.running = False
        self.thread = None

    def start(self):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._run_loop, daemon=True)
            self.thread.start()
            print("[CACHE] Background worker started.")

    def _run_loop(self):
        while self.running:
            try:
                self._refresh_cache()
            except Exception as e:
                print(f"[CACHE ERROR] Refresh cycle failed: {e}")
            time.sleep(self.interval)

    def _refresh_cache(self):
        """Pull core tables from SQL and save to local JSON."""
        print(f"[CACHE] Refreshing local JSON from SQL at {time.strftime('%H:%M:%S')}...")
        
        tables = ['products', 'users', 'inventory_lots']
        
        try:
            conn = get_connection()
            try:
                cursor = conn.cursor()
                
                for table in tables:
                    cursor.execute(f"SELECT * FROM `{table}`")
                    rows = cursor.fetchall()
                    # Update the local cache file
                    cache_manager.update_table(table, rows)
                    
                cursor.close()
            finally:
                conn.close()
            print("[CACHE] Local JSON updated successfully.")
        except Exception as e:
            print(f"[CACHE ERROR] Failed to fetch from SQL: {e}")

# Global instance for use in main.py
sync_worker = CacheWorker()
