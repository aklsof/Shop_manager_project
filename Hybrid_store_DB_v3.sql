-- ============================================================
-- Hybrid Store Management System - Database Schema v3.0
-- Tables + Views + Triggers
-- Aligned with SRS v2.0 (Sofiane Akli, Dec 2025)
-- ============================================================

DROP DATABASE IF EXISTS hybrid_store;
CREATE DATABASE IF NOT EXISTS hybrid_store
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;     -- Required for REQ-23 multilingual support
USE hybrid_store;


-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users Table (Staff & Admins)
--    REQ-32: password OR PIN authentication
--    REQ-37: role-based access; accounts can be deactivated
CREATE TABLE users (
    user_id        INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    pin_hash       VARCHAR(255) NULL,                          -- REQ-32: optional PIN login
    role           ENUM('Store Associate', 'Administrator') NOT NULL,
    preferred_lang VARCHAR(10)  DEFAULT 'en',                  -- REQ-23/24: per-user language
    is_active      BOOLEAN      DEFAULT TRUE,                  -- REQ-37: disable without deleting
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 2. Clients Table (Web Portal Customers)
--    REQ-6: registration with password complexity enforced at app layer
CREATE TABLE clients (
    client_id      INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    email          VARCHAR(100) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    preferred_lang VARCHAR(10)  DEFAULT 'en',                  -- REQ-23/24
    is_active      BOOLEAN      DEFAULT TRUE,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tax Categories Table
--    REQ-36: admin-defined categories; default "Standard" at 19%
CREATE TABLE tax_categories (
    tax_category_id INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50)    NOT NULL UNIQUE,
    rate            DECIMAL(5, 2)  NOT NULL CHECK (rate >= 0 AND rate <= 100),
    created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tax_categories (name, rate) VALUES ('Standard', 19.00);  -- REQ-36

-- 4. Products Table
--    REQ-10: name, category, default price, location, tax, min threshold
CREATE TABLE products (
    product_id            INT AUTO_INCREMENT PRIMARY KEY,
    name                  VARCHAR(100)   NOT NULL,
    category              VARCHAR(50)    NOT NULL,
    default_selling_price DECIMAL(10, 2) NOT NULL CHECK (default_selling_price >= 0),
    store_location        VARCHAR(100),
    tax_category_id       INT            NOT NULL,
    min_stock_threshold   INT            DEFAULT 0 CHECK (min_stock_threshold >= 0),  -- REQ-39
    created_at            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tax_category_id) REFERENCES tax_categories(tax_category_id)
);

-- 5. Inventory Lots Table
--    REQ-4:  FIFO — consume earliest date_received lot first
--    REQ-11: stock receipt creates a new lot
--    REQ-12: unique lot_id stamped with current timestamp
CREATE TABLE inventory_lots (
    lot_id        INT AUTO_INCREMENT PRIMARY KEY,
    product_id    INT            NOT NULL,
    quantity      INT            NOT NULL CHECK (quantity >= 0),
    buying_price  DECIMAL(10, 2) NOT NULL CHECK (buying_price >= 0),
    date_received TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- 6. Inventory Adjustments Table
--    REQ-33: shrinkage / damage corrections by authorized users
CREATE TABLE inventory_adjustments (
    adjustment_id     INT AUTO_INCREMENT PRIMARY KEY,
    lot_id            INT  NOT NULL,
    user_id           INT  NOT NULL,
    quantity_adjusted INT  NOT NULL CHECK (quantity_adjusted != 0),
    reason            VARCHAR(255),
    adjustment_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lot_id)  REFERENCES inventory_lots(lot_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 7. Price Rules Table
--    REQ-3:  dynamic price from active rules at query time
--    REQ-16: rule types: Deal, Rollback, Clearance, Holiday
--    SRS 5.3: prices switch exactly at 00:00:00 on start_date
CREATE TABLE price_rules (
    rule_id            INT AUTO_INCREMENT PRIMARY KEY,
    product_id         INT            NOT NULL,
    rule_type          ENUM('Deal', 'Rollback', 'Clearance', 'Holiday') NOT NULL,
    promotional_price  DECIMAL(10, 2) NOT NULL CHECK (promotional_price >= 0),
    start_date         DATETIME       NOT NULL,
    end_date           DATETIME       NOT NULL,
    is_active          BOOLEAN        DEFAULT TRUE,
    created_at         TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    CHECK (end_date > start_date),
    UNIQUE KEY uq_active_rule (product_id, rule_type, start_date)
);

-- 8. Transactions Table (POS Sales & Refunds)
--    REQ-32: user_id recorded on every transaction
--    REQ-25: is_refund flag for Refund Mode
--    REQ-28: receipt generated using stored language
CREATE TABLE transactions (
    transaction_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT            NOT NULL,
    total_amount      DECIMAL(10, 2) NOT NULL,
    is_refund         BOOLEAN        DEFAULT FALSE,
    receipt_language  VARCHAR(10)    DEFAULT 'en',
    transaction_date  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 9. Transaction Items Table
--    REQ-4:  lot_id records which FIFO lot was consumed
--    REQ-35: tax_applied stored per line item for accurate reporting
--    REQ-26: refund inserts a new lot (handled at app layer)
CREATE TABLE transaction_items (
    transaction_item_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id      INT            NOT NULL,
    product_id          INT            NOT NULL,
    lot_id              INT            NOT NULL,
    quantity            INT            NOT NULL CHECK (quantity != 0),
    price_applied       DECIMAL(10, 2) NOT NULL CHECK (price_applied >= 0),
    tax_applied         DECIMAL(10, 2) NOT NULL CHECK (tax_applied >= 0),
    FOREIGN KEY (transaction_id) REFERENCES transactions(transaction_id),
    FOREIGN KEY (product_id)     REFERENCES products(product_id),
    FOREIGN KEY (lot_id)         REFERENCES inventory_lots(lot_id)
);

-- 10. Web Orders Table
--     REQ-34: POS polls every 30 s; status workflow tracked
CREATE TABLE web_orders (
    order_id     INT AUTO_INCREMENT PRIMARY KEY,
    client_id    INT  NOT NULL,
    handled_by   INT  NULL,
    status       ENUM('Pending', 'Ready for Pickup', 'Completed') DEFAULT 'Pending',
    order_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id)  REFERENCES clients(client_id),
    FOREIGN KEY (handled_by) REFERENCES users(user_id)
);

-- 11. Web Order Items Table
--     REQ-34: order details must be viewable on POS dashboard
CREATE TABLE web_order_items (
    order_item_id  INT            AUTO_INCREMENT PRIMARY KEY,
    order_id       INT            NOT NULL,
    product_id     INT            NOT NULL,
    quantity       INT            NOT NULL CHECK (quantity > 0),
    price_at_order DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES web_orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);


-- ============================================================
-- VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- V1. vw_product_stock
--     Aggregates total available stock per product across all
--     lots (net of adjustments). Used by REQ-8 (customer portal
--     stock display) and REQ-39 (low stock alert widget).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_product_stock AS
SELECT
    p.product_id,
    p.name                                       AS product_name,
    p.category,
    p.store_location,
    p.min_stock_threshold,
    COALESCE(SUM(il.quantity), 0)
        + COALESCE(SUM(COALESCE(adj.total_adjusted, 0)), 0) AS total_stock,
    CASE
        WHEN COALESCE(SUM(il.quantity), 0)
             + COALESCE(SUM(COALESCE(adj.total_adjusted, 0)), 0)
             <= p.min_stock_threshold
        THEN TRUE ELSE FALSE
    END                                          AS is_low_stock        -- REQ-39
FROM products p
LEFT JOIN inventory_lots il ON il.product_id = p.product_id
LEFT JOIN (
    SELECT ia.lot_id, SUM(ia.quantity_adjusted) AS total_adjusted
    FROM inventory_adjustments ia
    GROUP BY ia.lot_id
) adj ON adj.lot_id = il.lot_id
GROUP BY
    p.product_id, p.name, p.category,
    p.store_location, p.min_stock_threshold;


-- ------------------------------------------------------------
-- V2. vw_active_price
--     Returns the current effective selling price for every
--     product: promotional price if an active rule is running
--     right now, otherwise the default price. Powers REQ-3 and
--     the "active deals" highlight on the web portal (REQ-7).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_active_price AS
SELECT
    p.product_id,
    p.name                                               AS product_name,
    p.category,
    p.default_selling_price,
    pr.promotional_price,
    pr.rule_type,
    pr.start_date                                        AS deal_start,
    pr.end_date                                          AS deal_end,
    COALESCE(pr.promotional_price, p.default_selling_price) AS effective_price,
    CASE WHEN pr.rule_id IS NOT NULL THEN TRUE ELSE FALSE END AS has_active_deal  -- REQ-7
FROM products p
LEFT JOIN price_rules pr
    ON  pr.product_id = p.product_id
    AND pr.is_active  = TRUE
    AND NOW() BETWEEN pr.start_date AND pr.end_date;     -- SRS 5.3: exact datetime comparison


-- ------------------------------------------------------------
-- V3. vw_low_stock_alerts
--     Filtered subset of vw_product_stock showing only products
--     that have breached their minimum threshold. Feeds the
--     Admin Dashboard alert widget directly (REQ-39).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_low_stock_alerts AS
SELECT
    product_id,
    product_name,
    category,
    store_location,
    total_stock,
    min_stock_threshold,
    (min_stock_threshold - total_stock) AS units_below_threshold
FROM vw_product_stock
WHERE is_low_stock = TRUE;


-- ------------------------------------------------------------
-- V4. vw_fifo_lot_queue
--     Orders lots per product by date_received ASC so the
--     application always consumes the correct FIFO lot first
--     (REQ-4). Also shows the lot's remaining quantity so the
--     app knows whether to spill over to the next lot.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_fifo_lot_queue AS
SELECT
    il.product_id,
    p.name       AS product_name,
    il.lot_id,
    il.buying_price,
    il.date_received,
    il.quantity  AS original_quantity,
    il.quantity
        + COALESCE(SUM(ia.quantity_adjusted), 0) AS remaining_quantity,  -- net of adjustments
    ROW_NUMBER() OVER (
        PARTITION BY il.product_id
        ORDER BY il.date_received ASC
    )            AS fifo_rank                    -- rank 1 = consume this lot next
FROM inventory_lots il
JOIN products p ON p.product_id = il.product_id
LEFT JOIN inventory_adjustments ia ON ia.lot_id = il.lot_id
GROUP BY
    il.lot_id, il.product_id, p.name,
    il.buying_price, il.date_received, il.quantity
HAVING remaining_quantity > 0;                   -- hide fully depleted lots


-- ------------------------------------------------------------
-- V5. vw_financial_report
--     Daily revenue, COGS (FIFO cost), tax collected, and net
--     profit per product. Powers the Financial Reports section
--     (REQ-27): Revenue, COGS, Net Profit columns.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_financial_report AS
SELECT
    DATE(t.transaction_date)                         AS sale_date,
    p.product_id,
    p.name                                           AS product_name,
    p.category,
    SUM(CASE WHEN t.is_refund = FALSE
             THEN ti.quantity ELSE 0 END)            AS units_sold,
    SUM(CASE WHEN t.is_refund = TRUE
             THEN ABS(ti.quantity) ELSE 0 END)       AS units_refunded,
    SUM(CASE WHEN t.is_refund = FALSE
             THEN ti.quantity * ti.price_applied
             ELSE -(ABS(ti.quantity) * ti.price_applied) END) AS revenue,    -- REQ-27
    SUM(CASE WHEN t.is_refund = FALSE
             THEN ti.quantity * il.buying_price
             ELSE -(ABS(ti.quantity) * il.buying_price) END)  AS cogs,       -- REQ-27 FIFO cost
    SUM(CASE WHEN t.is_refund = FALSE
             THEN ti.tax_applied
             ELSE -ti.tax_applied END)               AS tax_collected,        -- REQ-35
    SUM(CASE WHEN t.is_refund = FALSE
             THEN (ti.quantity * ti.price_applied) - (ti.quantity * il.buying_price)
             ELSE -((ABS(ti.quantity) * ti.price_applied) - (ABS(ti.quantity) * il.buying_price))
             END)                                    AS net_profit             -- REQ-27
FROM transaction_items ti
JOIN transactions    t  ON t.transaction_id = ti.transaction_id
JOIN products        p  ON p.product_id     = ti.product_id
JOIN inventory_lots  il ON il.lot_id        = ti.lot_id
GROUP BY DATE(t.transaction_date), p.product_id, p.name, p.category;


-- ------------------------------------------------------------
-- V6. vw_web_orders_dashboard
--     Full order detail view for the POS Web Orders Dashboard.
--     Joins clients, items, and products into a single flat
--     result. Polled every 30 s by the register (REQ-34).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_web_orders_dashboard AS
SELECT
    wo.order_id,
    wo.status,
    wo.order_date,
    wo.updated_at,
    c.client_id,
    c.username                           AS client_username,
    c.email                              AS client_email,
    u.username                           AS handled_by_user,
    p.product_id,
    p.name                               AS product_name,
    p.store_location,
    woi.quantity,
    woi.price_at_order,
    (woi.quantity * woi.price_at_order)  AS line_total
FROM web_orders wo
JOIN clients        c   ON c.client_id   = wo.client_id
JOIN web_order_items woi ON woi.order_id = wo.order_id
JOIN products        p   ON p.product_id = woi.product_id
LEFT JOIN users      u   ON u.user_id    = wo.handled_by;


-- ------------------------------------------------------------
-- V7. vw_associate_sales_summary
--     Per-associate transaction count and total revenue.
--     Useful for staff performance review and audit trails
--     (REQ-32 requires user_id on every transaction).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_associate_sales_summary AS
SELECT
    u.user_id,
    u.username,
    u.role,
    COUNT(CASE WHEN t.is_refund = FALSE THEN 1 END) AS total_sales,
    COUNT(CASE WHEN t.is_refund = TRUE  THEN 1 END) AS total_refunds,
    COALESCE(SUM(CASE WHEN t.is_refund = FALSE
                      THEN t.total_amount END), 0)   AS total_revenue_processed,
    MIN(t.transaction_date)                          AS first_transaction,
    MAX(t.transaction_date)                          AS last_transaction
FROM users u
LEFT JOIN transactions t ON t.user_id = u.user_id
GROUP BY u.user_id, u.username, u.role;


-- ------------------------------------------------------------
-- V8. vw_inventory_adjustment_log
--     Human-readable audit log of all stock adjustments with
--     product name, lot info, user, reason, and impact.
--     Covers REQ-33 (Shrinkage / damage tracking).
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vw_inventory_adjustment_log AS
SELECT
    ia.adjustment_id,
    ia.adjustment_date,
    u.username                                       AS adjusted_by,
    u.role,
    p.name                                           AS product_name,
    p.category,
    il.lot_id,
    il.date_received                                 AS lot_received_date,
    il.buying_price                                  AS lot_buying_price,
    ia.quantity_adjusted,
    CASE
        WHEN ia.quantity_adjusted > 0 THEN 'Addition'
        ELSE 'Reduction'
    END                                              AS adjustment_type,
    COALESCE(ia.reason, 'No reason provided')        AS reason
FROM inventory_adjustments ia
JOIN users          u  ON u.user_id    = ia.user_id
JOIN inventory_lots il ON il.lot_id    = ia.lot_id
JOIN products       p  ON p.product_id = il.product_id;


-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$


-- ------------------------------------------------------------
-- T1. trg_sale_deduct_stock  (AFTER INSERT on transaction_items)
--     Deducts the sold quantity from the corresponding lot
--     immediately after a sale line item is recorded (REQ-4).
--     Prevents stock from going negative — raises an error
--     instead so the app layer can handle it gracefully.
-- ------------------------------------------------------------
CREATE TRIGGER trg_sale_deduct_stock
AFTER INSERT ON transaction_items
FOR EACH ROW
BEGIN
    -- Only deduct for sales (positive quantity); refunds are handled by T2
    IF NEW.quantity > 0 THEN
        -- Guard: ensure sufficient stock exists in this lot
        IF (SELECT quantity FROM inventory_lots WHERE lot_id = NEW.lot_id) < NEW.quantity THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Insufficient stock in the selected lot for this sale.';
        END IF;

        UPDATE inventory_lots
        SET    quantity = quantity - NEW.quantity
        WHERE  lot_id   = NEW.lot_id;
    END IF;
END$$


-- ------------------------------------------------------------
-- T2. trg_refund_create_lot  (AFTER INSERT on transaction_items)
--     When a refund line is inserted (negative quantity), a new
--     inventory lot is created for the returned goods (REQ-26).
--     The buying_price is copied from the original lot so COGS
--     remain accurate.
-- ------------------------------------------------------------
CREATE TRIGGER trg_refund_create_lot
AFTER INSERT ON transaction_items
FOR EACH ROW
BEGIN
    DECLARE v_buying_price DECIMAL(10, 2);

    IF NEW.quantity < 0 THEN
        -- Retrieve the original lot's cost for accurate FIFO bookkeeping
        SELECT buying_price INTO v_buying_price
        FROM   inventory_lots
        WHERE  lot_id = NEW.lot_id;

        -- Create a new lot stamped NOW() to represent the returned stock
        INSERT INTO inventory_lots (product_id, quantity, buying_price)
        VALUES (NEW.product_id, ABS(NEW.quantity), v_buying_price);
    END IF;
END$$


-- ------------------------------------------------------------
-- T3. trg_adjustment_apply  (AFTER INSERT on inventory_adjustments)
--     Applies an inventory adjustment (shrinkage, damage, count
--     correction) directly to the lot quantity (REQ-33).
--     Raises an error if a reduction would drive quantity below 0.
-- ------------------------------------------------------------
CREATE TRIGGER trg_adjustment_apply
AFTER INSERT ON inventory_adjustments
FOR EACH ROW
BEGIN
    DECLARE v_current_qty INT;

    SELECT quantity INTO v_current_qty
    FROM   inventory_lots
    WHERE  lot_id = NEW.lot_id;

    -- Prevent negative lot quantity from a reduction adjustment
    IF (v_current_qty + NEW.quantity_adjusted) < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Adjustment would result in negative lot quantity. Operation aborted.';
    END IF;

    UPDATE inventory_lots
    SET    quantity = quantity + NEW.quantity_adjusted
    WHERE  lot_id   = NEW.lot_id;
END$$


-- ------------------------------------------------------------
-- T4. trg_validate_price_rule  (BEFORE INSERT on price_rules)
--     Prevents an overlapping active rule of the same type for
--     the same product, which would cause ambiguous pricing.
--     Supplements the UNIQUE KEY which only catches exact
--     start_date duplicates (REQ-3).
-- ------------------------------------------------------------
CREATE TRIGGER trg_validate_price_rule
BEFORE INSERT ON price_rules
FOR EACH ROW
BEGIN
    DECLARE v_conflict INT;

    SELECT COUNT(*) INTO v_conflict
    FROM   price_rules
    WHERE  product_id = NEW.product_id
    AND    rule_type  = NEW.rule_type
    AND    is_active  = TRUE
    AND    NEW.start_date < end_date
    AND    NEW.end_date   > start_date;

    IF v_conflict > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'An overlapping active price rule of this type already exists for this product.';
    END IF;
END$$


-- ------------------------------------------------------------
-- T5. trg_order_status_workflow  (BEFORE UPDATE on web_orders)
--     Enforces the legal status transition sequence defined in
--     REQ-34: Pending → Ready for Pickup → Completed.
--     Backward transitions and illegal jumps are rejected.
-- ------------------------------------------------------------
CREATE TRIGGER trg_order_status_workflow
BEFORE UPDATE ON web_orders
FOR EACH ROW
BEGIN
    -- Only validate when the status column actually changes.
    -- LEAVE cannot exit a BEGIN..END block in MySQL (#1308),
    -- so the no-op check is folded into the ELSEIF chain below.
    IF OLD.status <> NEW.status THEN
        -- Enforce forward-only transitions: Pending → Ready for Pickup → Completed
        IF NOT (
            (OLD.status = 'Pending'          AND NEW.status = 'Ready for Pickup') OR
            (OLD.status = 'Ready for Pickup' AND NEW.status = 'Completed')
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Invalid order status transition. Allowed: Pending→Ready for Pickup→Completed.';
        END IF;
    END IF;
END$$


-- ------------------------------------------------------------
-- T6. trg_transaction_total_verify  (BEFORE INSERT on transactions)
--     Guards against inserting a transaction with a zero or
--     negative total (data quality, supports REQ-27 reporting).
-- ------------------------------------------------------------
CREATE TRIGGER trg_transaction_total_verify
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    IF NEW.total_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction total_amount must be greater than zero.';
    END IF;
END$$


-- ------------------------------------------------------------
-- T7. trg_default_receipt_language  (BEFORE INSERT on transactions)
--     If no receipt language is specified, inherit it from the
--     processing user's preferred_lang setting (REQ-28 / REQ-23).
-- ------------------------------------------------------------
CREATE TRIGGER trg_default_receipt_language
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_lang VARCHAR(10);

    IF NEW.receipt_language IS NULL OR NEW.receipt_language = '' THEN
        SELECT preferred_lang INTO v_lang
        FROM   users
        WHERE  user_id = NEW.user_id;

        SET NEW.receipt_language = COALESCE(v_lang, 'en');
    END IF;
END$$


-- ------------------------------------------------------------
-- T8. trg_prevent_inactive_user_login  (BEFORE INSERT on transactions)
--     Blocks deactivated staff from processing transactions even
--     if the application layer check is bypassed (REQ-37).
-- ------------------------------------------------------------
CREATE TRIGGER trg_prevent_inactive_user_login
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_active BOOLEAN;

    SELECT is_active INTO v_active
    FROM   users
    WHERE  user_id = NEW.user_id;

    IF v_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction rejected: the associated user account is inactive.';
    END IF;
END$$


DELIMITER ;
