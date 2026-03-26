"""
db.py — MySQL connection helper for AKLI POS App.
Returns a mysql.connector connection using config.DB_CONFIG.
"""
import mysql.connector
from config import DB_CONFIG


def get_connection():
    """Return a new MySQL connection to hybrid_store."""
    return mysql.connector.connect(**DB_CONFIG)
