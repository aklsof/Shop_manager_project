import os
import re
import mysql.connector
from dotenv import load_dotenv

load_dotenv(r"c:\Users\sofiane\Documents\GitHub\aklsof\Shop_manager_project\POS_App\.env")

def setup_db():
    try:
        conn = mysql.connector.connect(
            host=os.environ.get("DB_HOST"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            port=int(os.environ.get("DB_PORT", 4000)),
            database=os.environ.get("DB_NAME")
        )
        cursor = conn.cursor()
        
        with open(r"c:\Users\sofiane\Documents\GitHub\aklsof\Shop_manager_project\Hybrid_store_DB_v3.sql", "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Remove DELIMITER blocks (which contain the triggers)
        sql_content = re.sub(r'DELIMITER \$\$(.*?)\$\$[\s\r\n]*DELIMITER ;', '', sql_content, flags=re.DOTALL)
        sql_content = re.sub(r'CREATE\s+TRIGGER.*?(?=;|DELIMITER|$)', '', sql_content, flags=re.DOTALL | re.IGNORECASE)

        # Merge AUTO_INCREMENT to CREATE TABLE
        # Example: CREATE TABLE `users` ( `user_id` int(11) NOT NULL,
        # We know the primary keys are the first column usually or we can simply replace `int(11) NOT NULL` with `int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY` for known id columns
        pk_columns = [
            "adjustment_id", "lot_id", "rule_id", "product_id", 
            "tax_category_id", "transaction_id", "transaction_item_id", 
            "user_id", "order_id", "order_item_id"
        ]
        
        for pk in pk_columns:
            sql_content = re.sub(rf'(`{pk}` int\(11\) NOT NULL)', r'\1 AUTO_INCREMENT PRIMARY KEY', sql_content, count=1)
            
        sql_content = re.sub(r'ALTER TABLE `.*?`\s+MODIFY `.*?` int\(11\) NOT NULL AUTO_INCREMENT.*?;', '', sql_content)
        sql_content = re.sub(r'ALTER TABLE `.*?`\s+ADD PRIMARY KEY.*?;', '', sql_content)

        statements = []
        stmt = []
        for line in sql_content.splitlines():
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith("--") or line_stripped.startswith("/*"):
                continue
            stmt.append(line)
            if line_stripped.endswith(";"):
                statements.append("\n".join(stmt))
                stmt = []
                
        if stmt:
             statements.append("\n".join(stmt))

        # We must drop tables first to fix them
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        tables = ["inventory_adjustments", "inventory_lots", "price_rules", "products", "tax_categories", "transactions", "transaction_items", "users", "web_orders", "web_order_items"]
        for t in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {t}")
        
        views = ["vw_active_price", "vw_associate_sales_summary", "vw_fifo_lot_queue", "vw_financial_report", "vw_inventory_adjustment_log", "vw_low_stock_alerts", "vw_product_stock", "vw_web_orders_dashboard"]
        for v in views:
            cursor.execute(f"DROP VIEW IF EXISTS {v}")
            
        executed = 0
        for s in statements:
            s_clean = s.strip()
            if not s_clean: continue
            
            if "CREATE OR REPLACE VIEW" in s_clean:
                s_clean = re.sub(r'DEFINER=`.*?`@`.*?`', '', s_clean)
                
            try:
                cursor.execute(s_clean)
                executed += 1
            except Exception as ex:
                if "Duplicate key name" in str(ex) or "Multiple primary key defined" in str(ex):
                    pass
                else:    
                    print(f"Error on:\n{s_clean}\nException:\n{ex}\n---")
                    
        conn.commit()
        print(f"Executed {executed} statements successfully.")

    except Exception as e:
        print("Setup Error:", e)

if __name__ == "__main__":
    setup_db()
