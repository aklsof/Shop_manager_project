"""
admin/reports_window.py — Financial reports dashboard.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT, COLOR_GREEN
from db import get_connection
import pos_locale


class ReportsWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("financial_reports"))
        self.window.geometry("1100x650")
        self.window.configure(bg=COLOR_BG)
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("financial_reports"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Filters
        filter_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        filter_frame.pack(fill='x')

        tk.Label(filter_frame, text=pos_locale.t("from_date"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left')
        self.from_var = tk.StringVar()
        tk.Entry(filter_frame, textvariable=self.from_var, width=12).pack(side='left', padx=8)
        
        tk.Label(filter_frame, text=pos_locale.t("to_date"), font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left')
        self.to_var = tk.StringVar()
        tk.Entry(filter_frame, textvariable=self.to_var, width=12).pack(side='left', padx=8)
        
        tk.Label(filter_frame, text="(YYYY-MM-DD)", font=("Helvetica", 8), bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left', padx=(0, 16))

        tk.Button(filter_frame, text=pos_locale.t("filter"), font=("Helvetica", 9, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=4,
                  command=self._load_data).pack(side='left')

        # Totals Cards
        self.totals_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        self.totals_frame.pack(fill='x', pady=(0, 16))
        
        # Will be populated in _load_data

        # Table
        table_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        table_frame.pack(fill='both', expand=True)

        cols = ("date", "product", "category", "sold", "refunded", "revenue", "cogs", "tax", "profit")
        self.tree = ttk.Treeview(table_frame, columns=cols, show='headings', height=15)
        headers = [pos_locale.t("date"), pos_locale.t("name"), pos_locale.t("product_categories"), pos_locale.t("sold"), pos_locale.t("refunded"), 
                   pos_locale.t("total_revenue"), pos_locale.t("total_cogs"), pos_locale.t("tax"), pos_locale.t("net_profit")]
        widths = [90, 180, 120, 60, 60, 90, 90, 90, 100]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='w' if col in ("product", "category") else 'center')
            
        scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True, pady=(0, 20))
        scroll.pack(side="right", fill="y", pady=(0, 20))

    def _load_data(self):
        f_date = self.from_var.get().strip()
        t_date = self.to_var.get().strip()

        where_clause = ""
        params = []
        if f_date and t_date:
            where_clause = "WHERE sale_date >= %s AND sale_date <= %s"
            params = [f_date, t_date]
        elif f_date:
            where_clause = "WHERE sale_date >= %s"
            params = [f_date]
        elif t_date:
            where_clause = "WHERE sale_date <= %s"
            params = [t_date]

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                # Get detailed rows
                cur.execute(f"SELECT * FROM vw_financial_report {where_clause} ORDER BY sale_date DESC", params)
                rows = cur.fetchall()
                
                # Get totals
                cur.execute(f"""
                    SELECT SUM(revenue) as rev, SUM(cogs) as cogs, SUM(tax_collected) as tax, SUM(net_profit) as profit 
                    FROM vw_financial_report {where_clause}
                """, params)
                totals = cur.fetchone()
                
                cur.close()
            finally:
                conn.close()

            # Update Table
            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', values=(
                    str(r['sale_date'])[:10],
                    r['product_name'],
                    r['category'],
                    r['units_sold'],
                    r['units_refunded'],
                    f"{r['revenue']:.2f}",
                    f"{r['cogs']:.2f}",
                    f"{r['tax_collected']:.2f}",
                    f"{r['net_profit']:.2f}"
                ))
            
            # Update Totals Cards
            for w in self.totals_frame.winfo_children():
                w.destroy()
                
            if totals and totals['rev'] is not None:
                self._make_card(self.totals_frame, pos_locale.t("total_revenue"), f"{totals['rev']:.2f} DA", COLOR_GREEN)
                self._make_card(self.totals_frame, pos_locale.t("total_cogs"), f"{totals['cogs']:.2f} DA", COLOR_RED)
                self._make_card(self.totals_frame, pos_locale.t("tax_collected"), f"{totals['tax']:.2f} DA", "#f39c12")
                
                profit_color = COLOR_GREEN if totals['profit'] >= 0 else COLOR_RED
                self._make_card(self.totals_frame, pos_locale.t("net_profit"), f"{totals['profit']:.2f} DA", profit_color)

        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _make_card(self, parent, title, value, color):
        f = tk.Frame(parent, bg=COLOR_WHITE, bd=1, relief='solid', padx=15, pady=10)
        f.pack(side='left', padx=(0, 16), fill='x', expand=True)
        tk.Label(f, text=title, font=("Helvetica", 8, "bold"), fg=COLOR_MUTED, bg=COLOR_WHITE).pack(anchor='w')
        tk.Label(f, text=value, font=("Helvetica", 14, "bold"), fg=color, bg=COLOR_WHITE).pack(anchor='w', pady=(4, 0))
