"""
config.py — Database and application configuration.
Reads from .env file in POS_App directory.
"""
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
