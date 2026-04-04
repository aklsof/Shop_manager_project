"""
config.py — Database and application configuration.
Reads from .env file in POS_App directory.
"""
import os
import sys
import ssl
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
    INTERNAL_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    INTERNAL_DIR = BASE_DIR

# Robust Environment Loader
env_path = os.path.join(BASE_DIR, '.env')
print(f"[CONFIG] Loading environment from: {env_path}")

if os.path.exists(env_path):
    try:
        # Read manually with utf-8-sig to handle Windows BOM/encoding issues
        with open(env_path, 'r', encoding='utf-8-sig') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()
        print("[CONFIG] .env file parsed successfully.")
    except Exception as e:
        print(f"[CONFIG ERROR] Manual parse failed: {e}")
else:
    print(f"[CONFIG WARNING] .env file not found at {env_path}!")

# Audit: Print exactly what was loaded
print("[CONFIG] Environment Audit:")
for key in ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PORT']:
    val = os.getenv(key)
    status = "FOUND!" if val else "NOT FOUND (defaults to standard)"
    print(f"  - {key}: {val if val else status}")

# Database configuration
DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'hybrid_store'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'charset':  'utf8mb4',
}

# SSL support 
def get_ssl_ctx():
    if os.getenv('DB_SSL', 'false').lower() == 'true':
        ca_path_default = os.path.join(INTERNAL_DIR, 'ca.pem')
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        if os.path.exists(ca_path_default):
            try:
                ctx.load_verify_locations(cafile=ca_path_default)
            except Exception: pass
        return ctx
    return None

if os.getenv('DB_SSL', 'false').lower() == 'true':
    DB_CONFIG['ssl'] = get_ssl_ctx()

APP_NAME = "AKLIShop"

# Brand palette (Tkinter color codes)
COLOR_RED    = "#C0392B"
COLOR_RED_DK = "#922B21"
COLOR_GREEN  = "#27AE60"
COLOR_WHITE  = "#FFFFFF"
COLOR_BG     = "#F8FAFC"
COLOR_TEXT   = "#0F172A"
COLOR_MUTED  = "#64748B"
COLOR_BORDER = "#CBD5E1"
