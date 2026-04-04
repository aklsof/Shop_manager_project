import os
import sys
import ssl
from dotenv import load_dotenv
import pymysql
import pymysql.cursors

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    INTERNAL_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INTERNAL_DIR = BASE_DIR

print(f"TEST (PyMySQL + Context): BASE_DIR: {BASE_DIR}")
env_path = os.path.join(BASE_DIR, '.env')
load_dotenv(env_path)

DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'hybrid_store'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'charset':  'utf8mb4',
}

if os.getenv('DB_SSL', 'false').lower() == 'true':
    ca_path_default = os.path.join(INTERNAL_DIR, 'ca.pem')
    
    # Bypass verification for the expired cert issue
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    if os.path.exists(ca_path_default):
        print("TEST: Loading ca.pem into context")
        try:
            ctx.load_verify_locations(cafile=ca_path_default)
        except Exception as e:
            print(f"TEST: SSL load failed but continuing: {e}")
            
    DB_CONFIG['ssl'] = ctx

print(f"TEST: Connecting to {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
try:
    conn = pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)
    print("TEST: SUCCESS!")
    with conn.cursor() as cursor:
        cursor.execute("SELECT 1")
    conn.close()
except Exception as e:
    print(f"TEST: FAILED: {e}")
