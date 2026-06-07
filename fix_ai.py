import mysql.connector, os, dotenv

dotenv.load_dotenv(r'c:\Users\sofiane\Documents\GitHub\aklsof\Shop_manager_project\POS_App\.env')
conn = mysql.connector.connect(
    host=os.environ['DB_HOST'], user=os.environ['DB_USER'], 
    password=os.environ['DB_PASSWORD'], database=os.environ['DB_NAME'],
    port=int(os.environ.get("DB_PORT", 4000))
)
cursor = conn.cursor()

tables_pk = {
    'users': 'user_id',
    'inventory_adjustments': 'adjustment_id',
    'inventory_lots': 'lot_id',
    'price_rules': 'rule_id',
    'products': 'product_id',
    'tax_categories': 'tax_category_id',
    'transactions': 'transaction_id',
    'transaction_items': 'transaction_item_id',
    'web_orders': 'order_id',
    'web_order_items': 'order_item_id'
}

cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
for table, pk in tables_pk.items():
    try:
        cursor.execute(f"ALTER TABLE {table} MODIFY {pk} INT NOT NULL AUTO_INCREMENT")
        print(f"Fixed {table}")
    except Exception as e:
        print(f"Error on {table}: {e}")
cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
conn.commit()
