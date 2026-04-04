import json
import os
import decimal
from datetime import datetime
from config import BASE_DIR

CACHE_FILE = os.path.join(BASE_DIR, 'store_cache.json')

class StoreEncoder(json.JSONEncoder):
    """Custom JSON encoder for MySQL types like Decimal and datetime."""
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(StoreEncoder, self).default(obj)

def get_cache_data():
    """Load the entire JSON cache."""
    if not os.path.exists(CACHE_FILE):
        return {}
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content: return {}
            return json.loads(content)
    except Exception as e:
        print(f"[CACHE ERROR] Failed to load JSON: {e}")
        return {}

def save_cache_data(data):
    """Save the entire dictionary to JSON cache with custom encoding."""
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False, cls=StoreEncoder)
    except Exception as e:
        print(f"[CACHE ERROR] Failed to save JSON: {e}")

def get_table(table_name):
    """Retrieve a specific table from cache."""
    data = get_cache_data()
    return data.get(table_name, [])

def update_table(table_name, rows):
    """Update a specific table in the cache."""
    data = get_cache_data()
    data[table_name] = rows
    save_cache_data(data)
