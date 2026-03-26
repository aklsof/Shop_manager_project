"""
orders/web_orders_dashboard.py — Web Orders Dashboard for POS.
REQ-34: Poll DB every 30 s | Show orders from vw_web_orders_dashboard.
Buttons to advance status: Pending → Ready for Pickup → Completed.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_GREEN, COLOR_WHITE, COLOR_BG, COLOR_MUTED
from db import get_connection

POLL_INTERVAL = 30_000  # ms


class WebOrdersDashboard:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title("Web Orders Dashboard")
        self.window.geometry("860x500")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._refresh()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text="💻 Web Orders Dashboard",
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)
        tk.Label(header, text="Auto-refreshes every 30 s",
                 font=("Helvetica", 8), bg=COLOR_RED, fg=COLOR_WHITE).pack(side='right', padx=12)

        # Status filter
        filter_frame = tk.Frame(self.window, bg=COLOR_BG, pady=8)
        filter_frame.pack(fill='x', padx=12)
        tk.Label(filter_frame, text="Filter:", bg=COLOR_BG, font=("Helvetica", 9, "bold")).pack(side='left')
        self.status_var = tk.StringVar(value="All")
        for s in ["All", "Pending", "Ready for Pickup", "Completed"]:
            tk.Radiobutton(filter_frame, text=s, variable=self.status_var, value=s,
                           bg=COLOR_BG, command=self._refresh).pack(side='left', padx=4)

        # Orders table
        cols = ("order_id", "client", "status", "items", "order_date")
        self.tree = ttk.Treeview(self.window, columns=cols, show='headings', height=15)
        for col, hdr, w in zip(cols,
                                ["Order #", "Client", "Status", "Items", "Date"],
                                [70, 120, 150, 280, 130]):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w)
        self.tree.pack(fill='both', expand=True, padx=12, pady=4)
        self.tree.tag_configure('pending',  background='#fff3cd')
        self.tree.tag_configure('ready',    background='#d1ecf1')
        self.tree.tag_configure('complete', background='#d4edda')

        # Action buttons
        btn_frame = tk.Frame(self.window, bg=COLOR_BG, pady=8)
        btn_frame.pack(fill='x', padx=12)
        tk.Button(btn_frame, text="✅ Mark Ready for Pickup",
                  font=("Helvetica", 9, "bold"), bg=COLOR_GREEN, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6, command=lambda: self._advance_status("Ready for Pickup")).pack(side='left', padx=4)
        tk.Button(btn_frame, text="🏁 Mark Completed",
                  font=("Helvetica", 9, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6, command=lambda: self._advance_status("Completed")).pack(side='left', padx=4)
        tk.Button(btn_frame, text="🔄 Refresh Now",
                  font=("Helvetica", 9), bg=COLOR_MUTED, fg=COLOR_WHITE, relief='flat',
                  padx=10, pady=6, command=self._refresh).pack(side='right', padx=4)

    def _refresh(self):
        try:
            conn = get_connection()
            cur = conn.cursor(dictionary=True)
            status_filter = self.status_var.get()
            if status_filter == "All":
                cur.execute(
                    """SELECT order_id, client_username, status,
                              GROUP_CONCAT(CONCAT(product_name, ' x', quantity) SEPARATOR ', ') AS items,
                              order_date
                       FROM vw_web_orders_dashboard
                       GROUP BY order_id, client_username, status, order_date
                       ORDER BY order_date DESC"""
                )
            else:
                cur.execute(
                    """SELECT order_id, client_username, status,
                              GROUP_CONCAT(CONCAT(product_name, ' x', quantity) SEPARATOR ', ') AS items,
                              order_date
                       FROM vw_web_orders_dashboard
                       WHERE status = %s
                       GROUP BY order_id, client_username, status, order_date
                       ORDER BY order_date DESC""",
                    (status_filter,)
                )
            orders = cur.fetchall()
            cur.close(); conn.close()

            self.tree.delete(*self.tree.get_children())
            for o in orders:
                tag = 'pending' if o['status'] == 'Pending' else 'ready' if o['status'] == 'Ready for Pickup' else 'complete'
                self.tree.insert('', 'end', iid=str(o['order_id']),
                                 values=(o['order_id'], o['client_username'], o['status'],
                                         o['items'] or '', str(o['order_date'])[:16]),
                                 tags=(tag,))
        except Exception as e:
            messagebox.showerror("DB Error", str(e))

        # Schedule next auto-refresh
        self.window.after(POLL_INTERVAL, self._refresh)

    def _advance_status(self, new_status: str):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("No Selection", "Select an order first.")
            return
        order_id = int(sel[0])
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute(
                "UPDATE web_orders SET status = %s, handled_by = %s WHERE order_id = %s",
                (new_status, self.user['user_id'], order_id)
            )
            conn.commit()
            cur.close(); conn.close()
            self._refresh()
        except Exception as e:
            messagebox.showerror("Update Error", str(e))
