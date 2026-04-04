"""
db.py — MySQL connection helper for AKLI POS App.
Now using PyMySQL for better compatibility in PyInstaller builds.
"""
import sys
import pymysql
import pymysql.cursors
from config import DB_CONFIG

def get_connection():
    """Return a new database connection (as a dictionary cursor)."""
    try:
        # Standardize connection params between mysql-connector and pymysql
        params = DB_CONFIG.copy()
        
        # If frozen, extra check for SSL settings compatibility
        return pymysql.connect(
            **params,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        # Debug trace for failed connections in frozen builds
        if getattr(sys, 'frozen', False):
            print(f"DB Error: {e}")
        raise e
