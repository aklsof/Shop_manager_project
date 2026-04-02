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
}

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
