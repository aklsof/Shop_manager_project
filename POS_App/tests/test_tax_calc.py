"""
tests/test_tax_calc.py — Itemized tax calculation test. REQ-35.
Verifies tax_amount = tax_rate × price_applied, within floating-point tolerance.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import pytest
from db import get_connection


def test_tax_calculation():
    """Tax in transaction_items must equal price_applied × tax_rate / 100."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """SELECT ti.price_applied, ti.tax_applied, ti.quantity,
                  t.rate AS tax_rate
           FROM transaction_items ti
           JOIN transactions tx ON tx.transaction_id = ti.transaction_id
           JOIN products p ON p.product_id = ti.product_id
           JOIN tax_categories t ON t.tax_category_id = p.tax_category_id
           LIMIT 50"""
    )
    rows = cur.fetchall()
    cur.close(); conn.close()

    if not rows:
        pytest.skip("No transaction_items data to test tax calculation.")

    for row in rows:
        price = float(row['price_applied'])
        qty = abs(int(row['quantity']))
        rate = float(row['tax_rate'])
        expected_tax = round(price * qty * rate / 100, 2)
        actual_tax = round(float(row['tax_applied']), 2)
        assert abs(expected_tax - actual_tax) < 0.01, (
            f"Tax mismatch: expected {expected_tax}, got {actual_tax} "
            f"(price={price}, qty={qty}, rate={rate}%)"
        )
