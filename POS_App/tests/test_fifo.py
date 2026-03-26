"""
tests/test_fifo.py — FIFO lot selection test. REQ-4.
Verifies that vw_fifo_lot_queue returns oldest lot first.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import pytest
from db import get_connection


def test_fifo_lot_order():
    """Oldest lot (by date_received) should appear first in vw_fifo_lot_queue."""
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    # Get first two lots for any product
    cur.execute("SELECT lot_id, product_id, quantity, date_received FROM vw_fifo_lot_queue LIMIT 10")
    rows = cur.fetchall()
    cur.close(); conn.close()

    if len(rows) < 2:
        pytest.skip("Need at least 2 lots with stock to test FIFO ordering.")

    # Collect rows by product_id
    by_product = {}
    for r in rows:
        by_product.setdefault(r['product_id'], []).append(r)

    for pid, lots in by_product.items():
        if len(lots) >= 2:
            assert lots[0]['date_received'] <= lots[1]['date_received'], (
                f"FIFO violated for product {pid}: "
                f"lot {lots[0]['lot_id']} ({lots[0]['date_received']}) "
                f"should be before lot {lots[1]['lot_id']} ({lots[1]['date_received']})"
            )
