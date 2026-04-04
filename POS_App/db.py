"""
db.py — MySQL connection helper for AKLI POS App.
Now using PyMySQL for better compatibility in PyInstaller builds.
"""
import sys
import pymysql
import pymysql.cursors
from config import DB_CONFIG

# Persistent connection object
_connection = None

def get_connection():
    """Return an existing database connection or create a new one."""
    global _connection
    try:
        # Check if connection is still alive, reconnect if necessary
        if _connection:
            _connection.ping(reconnect=True) 
        else:
            _connection = pymysql.connect(
                **DB_CONFIG,
                cursorclass=pymysql.cursors.DictCursor,
                connect_timeout=10,
                autocommit=True
            )
        return _connection
    except Exception as e:
        print(f"[DB ERROR] Connection to SQL failed: {e}")
        _connection = None # Reset so we try again next time
        raise e
