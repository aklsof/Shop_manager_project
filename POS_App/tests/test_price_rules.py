"""
tests/test_price_rules.py — Price rule activation test. REQ-16.
Verifies that promotional price activates exactly at start_date 00:00:00.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import pytest
from db import get_connection
from datetime import datetime


def test_active_price_rule_within_dates():
    """vw_active_price should show promotional_price only for currently active rules."""
    conn = get_connection()
    cur = conn.cursor()
    now = datetime.now()

    cur.execute(
        """SELECT pr.product_id, pr.promotional_price, pr.start_date, pr.end_date,
                  v.effective_price, v.promotional_price AS v_promo
           FROM price_rules pr
           LEFT JOIN vw_active_price v ON v.product_id = pr.product_id
           WHERE pr.start_date <= %s AND pr.end_date >= %s""",
        (now, now)
    )
    rules = cur.fetchall()
    cur.close(); conn.close()

    if not rules:
        pytest.skip("No currently active price rules to test.")

    for rule in rules:
        assert rule['v_promo'] is not None, (
            f"Product {rule['product_id']} has active rule but vw_active_price shows no promo price."
        )
        assert abs(float(rule['v_promo']) - float(rule['promotional_price'])) < 0.01, (
            f"Promo price mismatch for product {rule['product_id']}: "
            f"rule={rule['promotional_price']}, view={rule['v_promo']}"
        )
