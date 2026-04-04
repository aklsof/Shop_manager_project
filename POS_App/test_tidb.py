import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(r"c:\Users\sofiane\Documents\GitHub\aklsof\Shop_manager_project\POS_App\.env")

try:
    conn = mysql.connector.connect(
        host=os.environ.get("DB_HOST", "gateway01.ap-northeast-1.prod.aws.tidbcloud.com"),
        user=os.environ.get("DB_USER", "4Y4yLhuFFu1FGJF.root"),
        password=os.environ.get("DB_PASSWORD", "oEliZdkZduliWvY7"),
        port=int(os.environ.get("DB_PORT", 4000)),
        database=os.environ.get("DB_NAME", "test"),
        ssl_disabled=False
    )
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS test_trigger_tbl (id INT)")
    try:
        cursor.execute("CREATE TRIGGER test_trig BEFORE INSERT ON test_trigger_tbl FOR EACH ROW SET NEW.id = NEW.id")
        print("Trigger created successfully.")
        cursor.execute("DROP TRIGGER test_trig")
    except Exception as e:
        print("Trigger creation failed:", e)
    cursor.execute("DROP TABLE test_trigger_tbl")
except Exception as e:
    print("Error:", e)
