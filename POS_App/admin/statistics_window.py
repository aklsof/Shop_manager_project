"""
admin/statistics_window.py — High-level KPI dashboard.
"""
import tkinter as tk
from tkinter import ttk, messagebox
import sys, os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config import COLOR_RED, COLOR_WHITE, COLOR_BG, COLOR_MUTED, COLOR_TEXT, COLOR_GREEN
from db import get_connection
import pos_locale


class StatisticsWindow:
    def __init__(self, parent: tk.Tk, user: dict):
        self.user = user
        self.window = tk.Toplevel(parent)
        self.window.title(pos_locale.t("statistics"))
        self.window.geometry("1100x650")
        self.window.configure(bg=COLOR_BG)
        self.period_var = tk.StringVar(value="Monthly")
        self._build_ui()
        self._load_data()

    def _build_ui(self):
        header = tk.Frame(self.window, bg=COLOR_RED, height=45)
        header.pack(fill='x')
        tk.Label(header, text=pos_locale.t("statistics"),
                 font=("Helvetica", 12, "bold"), bg=COLOR_RED, fg=COLOR_WHITE, padx=12).pack(side='left', pady=8)

        # Filters
        filter_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20, pady=16)
        filter_frame.pack(fill='x')

        tk.Label(filter_frame, text="Period: ", font=("Helvetica", 9, "bold"), bg=COLOR_BG, fg=COLOR_MUTED).pack(side='left')
        ttk.Combobox(filter_frame, textvariable=self.period_var, values=["Daily", "Monthly", "Yearly"], state="readonly", width=15).pack(side='left', padx=8)
        
        tk.Button(filter_frame, text=pos_locale.t("filter"), font=("Helvetica", 9, "bold"),
                  bg=COLOR_RED, fg=COLOR_WHITE, relief='flat', padx=16, pady=4,
                  command=self._load_data).pack(side='left')

        # KPI Cards (2 rows of 3)
        self.kpi_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        self.kpi_frame.pack(fill='x', pady=(0, 16))
        
        # Grid frame for table
        self.bottom_frame = tk.Frame(self.window, bg=COLOR_BG, padx=20)
        self.bottom_frame.pack(fill='both', expand=True)

        tk.Label(self.bottom_frame, text="Breakdown", font=("Helvetica", 11, "bold"), bg=COLOR_BG, fg=COLOR_TEXT).pack(anchor='w', pady=(0, 8))
        
        cols = ("period", "revenue", "cogs", "profit", "sold", "refunds")
        self.tree = ttk.Treeview(self.bottom_frame, columns=cols, show='headings', height=10)
        headers = ["Period", pos_locale.t("total_revenue"), pos_locale.t("total_cogs"), pos_locale.t("net_profit"), pos_locale.t("sold"), pos_locale.t("refunded")]
        widths = [150, 120, 120, 120, 80, 80]
        
        for col, hdr, w in zip(cols, headers, widths):
            self.tree.heading(col, text=hdr)
            self.tree.column(col, width=w, anchor='center')
            
        scroll = ttk.Scrollbar(self.bottom_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True, pady=(0, 20))
        scroll.pack(side="right", fill="y", pady=(0, 20))

    def _load_data(self):
        period = self.period_var.get()
        # Daily: last 30 days
        # Monthly: last 12 months
        # Yearly: all time
        
        group_sql = ""
        where_sql = ""
        if period == "Daily":
            group_sql = "DATE(sale_date)"
            # roughly 30 days
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            where_sql = f"WHERE sale_date >= '{start_date}'"
        elif period == "Monthly":
            group_sql = "DATE_FORMAT(sale_date, '%%Y-%%m')"
            start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
            where_sql = f"WHERE sale_date >= '{start_date}'"
        else:
            group_sql = "YEAR(sale_date)"

        try:
            conn = get_connection()
            try:
                cur = conn.cursor()
                
                # Overall KPIs (all time, just for show, or we could scope it to the selected period)
                # Let's scope it to the selected timeframe.
                cur.execute(f"""
                    SELECT SUM(revenue) as rev, SUM(cogs) as cogs, SUM(net_profit) as profit,
                           SUM(units_sold) as sold, SUM(units_refunded) as ref
                    FROM vw_financial_report {where_sql}
                """)
                kpis = cur.fetchone()
                
                # Breakdown
                cur.execute(f"""
                    SELECT {group_sql} as period_lbl, 
                           SUM(revenue) as rev, SUM(cogs) as cogs, SUM(net_profit) as profit,
                           SUM(units_sold) as sold, SUM(units_refunded) as ref
                    FROM vw_financial_report 
                    {where_sql}
                    GROUP BY period_lbl
                    ORDER BY period_lbl DESC
                """)
                rows = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            # Render KPIs
            for w in self.kpi_frame.winfo_children():
                w.destroy()
                
            rev = kpis['rev'] or 0
            cogs = kpis['cogs'] or 0
            profit = kpis['profit'] or 0
            sold = kpis['sold'] or 0
            ref = kpis['ref'] or 0
            
            row1 = tk.Frame(self.kpi_frame, bg=COLOR_BG)
            row1.pack(fill='x', pady=5)
            self._make_card(row1, pos_locale.t("total_revenue"), f"{rev:.2f} DA", COLOR_GREEN)
            self._make_card(row1, pos_locale.t("total_cogs"), f"{cogs:.2f} DA", COLOR_RED)
            self._make_card(row1, pos_locale.t("net_profit"), f"{profit:.2f} DA", COLOR_GREEN if profit >=0 else COLOR_RED)
            
            row2 = tk.Frame(self.kpi_frame, bg=COLOR_BG)
            row2.pack(fill='x', pady=5)
            self._make_card(row2, pos_locale.t("sold"), str(sold), "#3498db")
            self._make_card(row2, pos_locale.t("refunded"), str(ref), "#e67e22")
            self._make_card(row2, "Margin", f"{(profit/rev*100 if rev else 0):.1f}%", "#9b59b6")

            # Update Table
            self.tree.delete(*self.tree.get_children())
            for r in rows:
                self.tree.insert('', 'end', values=(
                    r['period_lbl'],
                    f"{r['rev']:.2f}",
                    f"{r['cogs']:.2f}",
                    f"{r['profit']:.2f}",
                    r['sold'],
                    r['ref']
                ))

        except Exception as e:
            messagebox.showerror(pos_locale.t("db_error"), str(e))

    def _make_card(self, parent, title, value, color):
        f = tk.Frame(parent, bg=COLOR_WHITE, bd=1, relief='solid', padx=15, pady=10)
        f.pack(side='left', padx=(0, 10), fill='x', expand=True)
        tk.Label(f, text=title, font=("Helvetica", 8, "bold"), fg=COLOR_MUTED, bg=COLOR_WHITE).pack(anchor='w')
        tk.Label(f, text=value, font=("Helvetica", 14, "bold"), fg=color, bg=COLOR_WHITE).pack(anchor='w', pady=(4, 0))
