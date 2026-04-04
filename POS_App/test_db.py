import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'hybrid_store'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'collation': 'utf8mb4_general_ci',
}

try:
    print("Trying without SSL params...")
    conn = mysql.connector.connect(**DB_CONFIG)
    print("Without SSL Connected!")
    conn.close()
except Exception as e:
    print("Failed without SSL params:", e)

if os.getenv('DB_SSL', 'false').lower() == 'true':
    ca_path_env = os.getenv('DB_SSL_CA', '')
    ca_path_default = os.path.join(os.path.dirname(__file__), 'ca.pem')
    
    if ca_path_env and os.path.exists(ca_path_env):
        DB_CONFIG['ssl_ca'] = ca_path_env
    elif os.path.exists(ca_path_default):
        DB_CONFIG['ssl_ca'] = ca_path_default
    else:
        DB_CONFIG['ssl_verify_cert'] = True
        DB_CONFIG['ssl_verify_identity'] = True

try:
    print("Trying with DB_CONFIG...")
    conn = mysql.connector.connect(**DB_CONFIG)
    print("With DB_CONFIG Connected!")
    conn.close()
except Exception as e:
    print("Failed with DB_CONFIG:", e)

DB_CONFIG_SSL = DB_CONFIG.copy()
if 'ssl_verify_cert' in DB_CONFIG_SSL:
    del DB_CONFIG_SSL['ssl_verify_cert']
if 'ssl_verify_identity' in DB_CONFIG_SSL:
    del DB_CONFIG_SSL['ssl_verify_identity']

DB_CONFIG_SSL['ssl_disabled'] = False
try:
    print("Trying with ssl_disabled=False...")
    conn = mysql.connector.connect(**DB_CONFIG_SSL)
    print("Connected with ssl_disabled=False!")
    conn.close()
except Exception as e:
    print("Failed with ssl_disabled=False:", e)
