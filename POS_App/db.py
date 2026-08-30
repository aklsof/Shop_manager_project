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

def initialize_database(host, port, user, password):
    """
    Invokes the setup-database.ps1 script to initialize the database
    and apply migrations safely (no data loss).
    """
    import subprocess
    import os
    import sys
    from config import BASE_DIR
    
    # Determine where the scripts are
    if getattr(sys, 'frozen', False):
        # Installed via MSI: BASE_DIR is .../POSApp
        install_dir = os.path.dirname(BASE_DIR)
        script_path = os.path.join(install_dir, 'scripts', 'setup-database.ps1')
    else:
        # Dev environment
        install_dir = os.path.dirname(BASE_DIR)
        script_path = os.path.join(install_dir, 'installer', 'scripts', 'setup-database.ps1')
        
    if not os.path.exists(script_path):
        raise FileNotFoundError(f"Database setup script not found at {script_path}")
        
    cmd = [
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", script_path,
        "-InstallDir", install_dir,
        "-DbHost", str(host),
        "-DbPort", str(port),
        "-DbUser", str(user),
        "-DbPassword", str(password)
    ]
    
    print(f"[DB INIT] Running setup script: {script_path}")
    # Use CREATE_NO_WINDOW so a console doesn't pop up for the user
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    result = subprocess.run(cmd, capture_output=True, text=True, creationflags=creationflags)
    
    if result.returncode != 0:
        print(f"[DB INIT ERROR] stdout: {result.stdout}")
        print(f"[DB INIT ERROR] stderr: {result.stderr}")
        raise Exception(f"Database initialization failed:\n{result.stderr or result.stdout}")
        
    print(f"[DB INIT SUCCESS] Database initialized and migrated successfully.")
    return True
