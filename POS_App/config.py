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

load_dotenv(os.path.join(BASE_DIR, '.env'))

DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'hybrid_store'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'port':     int(os.getenv('DB_PORT', '3306')),
    'charset':  'utf8mb4',
}

# SSL support for PyMySQL or mysql-connector
if os.getenv('DB_SSL', 'false').lower() == 'true':
    ca_path_default = os.path.join(INTERNAL_DIR, 'ca.pem')
    
    # Create an SSL context that allows expired certificates (Error 2003 bypass)
    # This is often needed for free database hosting with rotating/expired certs.
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # Bypass verification while keeping encryption
    
    if os.path.exists(ca_path_default):
        try:
            ctx.load_verify_locations(cafile=ca_path_default)
        except Exception:
            pass # Continue if ca.pem is invalid but we still want SSL context
            
    DB_CONFIG['ssl'] = ctx

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
