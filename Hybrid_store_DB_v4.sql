-- =============================================================================
-- Hybrid Store Database
-- Rewritten version (v4) - clean, idempotent script
--
-- Structure:
--   1. Create tables (PKs, indexes, FKs, AUTO_INCREMENT all inline)
--   2. Seed data
--   3. Views
--   4. Triggers
-- =============================================================================

SET SQL_MODE   = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone  = "+00:00";

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- Dependency order:
--   tax_categories → products → inventory_lots → inventory_adjustments
--                             → price_rules
--   users          → transactions → transaction_items
--                 → web_orders   → web_order_items
-- -----------------------------------------------------------------------------

-- --------------------------------------------------------
-- tax_categories  (no FK dependencies)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tax_categories` (
  `tax_category_id` int(11)      NOT NULL AUTO_INCREMENT,
  `name`            varchar(50)  NOT NULL,
  `rate`            decimal(5,2) NOT NULL CHECK (`rate` >= 0 AND `rate` <= 100),
  `created_at`      timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`tax_category_id`),
  UNIQUE KEY `uq_tax_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- product_categories  (no FK dependencies)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_categories` (
  `category_id` int(11)      NOT NULL AUTO_INCREMENT,
  `name`        varchar(100) NOT NULL,
  `created_at`  timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_category_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- users  (no FK dependencies)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id`        int(11)      NOT NULL AUTO_INCREMENT,
  `username`       varchar(50)  NOT NULL,
  `email`          varchar(255) NOT NULL,
  `user_firstName` varchar(100) NOT NULL,
  `user_lastName`  varchar(100) NOT NULL,
  `user_address1`  varchar(255) DEFAULT NULL,
  `city`           varchar(100) DEFAULT NULL,
  `province`       varchar(100) DEFAULT NULL,
  `password_hash`  varchar(255) NOT NULL,
  `pin_hash`       varchar(255) DEFAULT NULL,
  `role`           enum('Store Associate','Administrator') DEFAULT NULL,
  `user_type`      enum('staff','client')                 DEFAULT 'staff',
  `preferred_lang` varchar(10)  DEFAULT 'en',
  `is_active`      tinyint(1)   DEFAULT 1,
  `created_at`     timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- products  (FK → tax_categories)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `product_id`            int(11)       NOT NULL AUTO_INCREMENT,
  `name`                  varchar(100)  NOT NULL,
  `description`           text          DEFAULT NULL,
  `img_url`               varchar(512)  DEFAULT NULL,
  `category_id`           int(11)       NOT NULL,
  `default_selling_price` decimal(10,2) NOT NULL CHECK (`default_selling_price` >= 0),
  `store_location`        varchar(100)  DEFAULT NULL,
  `tax_category_id`       int(11)       NOT NULL,
  `min_stock_threshold`   int(11)       DEFAULT 0 CHECK (`min_stock_threshold` >= 0),
  `created_at`            timestamp     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `uq_product_name` (`name`),
  KEY `idx_products_tax_category` (`tax_category_id`),
  KEY `idx_products_category`     (`category_id`),
  CONSTRAINT `products_ibfk_1`
    FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories` (`tax_category_id`),
  CONSTRAINT `products_ibfk_2`
    FOREIGN KEY (`category_id`)     REFERENCES `product_categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- inventory_lots  (FK → products)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_lots` (
  `lot_id`        int(11)       NOT NULL AUTO_INCREMENT,
  `product_id`    int(11)       NOT NULL,
  `quantity`      int(11)       NOT NULL CHECK (`quantity` >= 0),
  `buying_price`  decimal(10,2) NOT NULL CHECK (`buying_price` >= 0),
  `date_received` timestamp     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`lot_id`),
  KEY `idx_inventory_lots_product` (`product_id`),
  CONSTRAINT `inventory_lots_ibfk_1`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- inventory_adjustments  (FK → inventory_lots, users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_adjustments` (
  `adjustment_id`    int(11)      NOT NULL AUTO_INCREMENT,
  `lot_id`           int(11)      NOT NULL,
  `user_id`          int(11)      NOT NULL,
  `quantity_adjusted` int(11)     NOT NULL CHECK (`quantity_adjusted` <> 0),
  `reason`           varchar(255) DEFAULT NULL,
  `adjustment_date`  timestamp    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`adjustment_id`),
  KEY `idx_inv_adj_lot`  (`lot_id`),
  KEY `idx_inv_adj_user` (`user_id`),
  CONSTRAINT `inventory_adjustments_ibfk_1`
    FOREIGN KEY (`lot_id`)  REFERENCES `inventory_lots` (`lot_id`),
  CONSTRAINT `inventory_adjustments_ibfk_2`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- price_rules  (FK → products)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `price_rules` (
  `rule_id`           int(11)       NOT NULL AUTO_INCREMENT,
  `product_id`        int(11)       NOT NULL,
  `rule_type`         enum('Deal','Rollback','Clearance','Holiday') NOT NULL,
  `promotional_price` decimal(10,2) NOT NULL CHECK (`promotional_price` >= 0),
  `start_date`        datetime      NOT NULL,
  `end_date`          datetime      NOT NULL,
  `is_active`         tinyint(1)    DEFAULT 1,
  `created_at`        timestamp     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`rule_id`),
  UNIQUE KEY `uq_active_rule` (`product_id`, `rule_type`, `start_date`),
  CONSTRAINT `price_rules_ibfk_1`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- transactions  (FK → users)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `transaction_id`   int(11)       NOT NULL AUTO_INCREMENT,
  `user_id`          int(11)       NOT NULL,
  `total_amount`     decimal(10,2) NOT NULL,
  `is_refund`        tinyint(1)    DEFAULT 0,
  `receipt_language` varchar(10)   DEFAULT 'en',
  `transaction_date` timestamp     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`transaction_id`),
  KEY `idx_transactions_user` (`user_id`),
  CONSTRAINT `transactions_ibfk_1`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- transaction_items  (FK → transactions, products, inventory_lots)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `transaction_item_id` int(11)       NOT NULL AUTO_INCREMENT,
  `transaction_id`      int(11)       NOT NULL,
  `product_id`          int(11)       NOT NULL,
  `lot_id`              int(11)       NOT NULL,
  `quantity`            int(11)       NOT NULL CHECK (`quantity` <> 0),
  `price_applied`       decimal(10,2) NOT NULL CHECK (`price_applied` >= 0),
  `tax_applied`         decimal(10,2) NOT NULL CHECK (`tax_applied` >= 0),
  PRIMARY KEY (`transaction_item_id`),
  KEY `idx_ti_transaction` (`transaction_id`),
  KEY `idx_ti_product`     (`product_id`),
  KEY `idx_ti_lot`         (`lot_id`),
  CONSTRAINT `transaction_items_ibfk_1`
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions`    (`transaction_id`),
  CONSTRAINT `transaction_items_ibfk_2`
    FOREIGN KEY (`product_id`)     REFERENCES `products`        (`product_id`),
  CONSTRAINT `transaction_items_ibfk_3`
    FOREIGN KEY (`lot_id`)         REFERENCES `inventory_lots`  (`lot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- web_orders  (FK → users × 2)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `web_orders` (
  `order_id`   int(11)  NOT NULL AUTO_INCREMENT,
  `client_id`  int(11)  NOT NULL,
  `handled_by` int(11)  DEFAULT NULL,
  `status`     enum('Pending','Ready for Pickup','Completed') DEFAULT 'Pending',
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`order_id`),
  KEY `idx_wo_client`     (`client_id`),
  KEY `idx_wo_handled_by` (`handled_by`),
  CONSTRAINT `web_orders_ibfk_1`
    FOREIGN KEY (`client_id`)  REFERENCES `users` (`user_id`),
  CONSTRAINT `web_orders_ibfk_2`
    FOREIGN KEY (`handled_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- web_order_items  (FK → web_orders, products)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `web_order_items` (
  `order_item_id`  int(11)       NOT NULL AUTO_INCREMENT,
  `order_id`       int(11)       NOT NULL,
  `product_id`     int(11)       NOT NULL,
  `quantity`       int(11)       NOT NULL CHECK (`quantity` > 0),
  `price_at_order` decimal(10,2) NOT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `idx_woi_order`   (`order_id`),
  KEY `idx_woi_product` (`product_id`),
  CONSTRAINT `web_order_items_ibfk_1`
    FOREIGN KEY (`order_id`)    REFERENCES `web_orders` (`order_id`),
  CONSTRAINT `web_order_items_ibfk_2`
    FOREIGN KEY (`product_id`)  REFERENCES `products`   (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. SEED DATA
-- -----------------------------------------------------------------------------

INSERT INTO `tax_categories` (`tax_category_id`, `name`, `rate`, `created_at`) VALUES
  (1, 'Standard', 19.00, '2026-03-16 19:29:48')
ON DUPLICATE KEY UPDATE
  `rate`       = VALUES(`rate`),
  `created_at` = VALUES(`created_at`);

-- -----------------------------------------------------------------------------
-- 4. VIEWS
-- (vw_product_stock must come before vw_low_stock_alerts)
-- -----------------------------------------------------------------------------

-- --------------------------------------------------------
-- vw_active_price
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_active_price` AS
SELECT
  p.product_id,
  p.name                    AS product_name,
  c.name                    AS category,
  p.category_id,
  p.default_selling_price,
  pr.promotional_price,
  pr.rule_type,
  pr.start_date             AS deal_start,
  pr.end_date               AS deal_end,
  COALESCE(pr.promotional_price, p.default_selling_price) AS effective_price,
  CASE WHEN pr.rule_id IS NOT NULL THEN 1 ELSE 0 END      AS has_active_deal
FROM `products` p
JOIN `product_categories` c ON c.category_id = p.category_id
LEFT JOIN `price_rules` pr
  ON  pr.product_id = p.product_id
  AND pr.is_active  = 1
  AND current_timestamp() BETWEEN pr.start_date AND pr.end_date;

-- --------------------------------------------------------
-- vw_associate_sales_summary
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_associate_sales_summary` AS
SELECT
  u.user_id,
  u.username,
  u.role,
  COUNT(CASE WHEN t.is_refund = 0 THEN 1 END)                        AS total_sales,
  COUNT(CASE WHEN t.is_refund = 1 THEN 1 END)                        AS total_refunds,
  COALESCE(SUM(CASE WHEN t.is_refund = 0 THEN t.total_amount END),0) AS total_revenue_processed,
  MIN(t.transaction_date)                                            AS first_transaction,
  MAX(t.transaction_date)                                            AS last_transaction
FROM `users` u
LEFT JOIN `transactions` t ON t.user_id = u.user_id
GROUP BY u.user_id, u.username, u.role;

-- --------------------------------------------------------
-- vw_fifo_lot_queue
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_fifo_lot_queue` AS
SELECT
  il.product_id,
  p.name                                              AS product_name,
  il.lot_id,
  il.buying_price,
  il.date_received,
  il.quantity                                         AS original_quantity,
  il.quantity + COALESCE(SUM(ia.quantity_adjusted),0) AS remaining_quantity,
  ROW_NUMBER() OVER (
    PARTITION BY il.product_id
    ORDER BY il.date_received
  )                                                   AS fifo_rank
FROM `inventory_lots` il
JOIN `products` p
  ON p.product_id = il.product_id
LEFT JOIN `inventory_adjustments` ia
  ON ia.lot_id = il.lot_id
GROUP BY
  il.lot_id, il.product_id, p.name,
  il.buying_price, il.date_received, il.quantity
HAVING remaining_quantity > 0;

-- --------------------------------------------------------
-- vw_financial_report
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_financial_report` AS
SELECT
  CAST(t.transaction_date AS date) AS sale_date,
  p.product_id,
  p.name                           AS product_name,
  p.category,
  SUM(CASE WHEN t.is_refund = 0 THEN ti.quantity          ELSE 0 END) AS units_sold,
  SUM(CASE WHEN t.is_refund = 1 THEN ABS(ti.quantity)     ELSE 0 END) AS units_refunded,
  SUM(CASE WHEN t.is_refund = 0
        THEN  ti.quantity * ti.price_applied
        ELSE -(ABS(ti.quantity) * ti.price_applied) END)               AS revenue,
  SUM(CASE WHEN t.is_refund = 0
        THEN  ti.quantity * il.buying_price
        ELSE -(ABS(ti.quantity) * il.buying_price) END)                AS cogs,
  SUM(CASE WHEN t.is_refund = 0
        THEN  ti.tax_applied
        ELSE -ti.tax_applied END)                                       AS tax_collected,
  SUM(CASE WHEN t.is_refund = 0
        THEN  ti.quantity * ti.price_applied - ti.quantity * il.buying_price
        ELSE -(ABS(ti.quantity) * ti.price_applied - ABS(ti.quantity) * il.buying_price)
       END)                                                             AS net_profit
FROM `transaction_items` ti
JOIN `transactions`    t  ON t.transaction_id = ti.transaction_id
JOIN `products`        p  ON p.product_id     = ti.product_id
JOIN `inventory_lots`  il ON il.lot_id        = ti.lot_id
GROUP BY CAST(t.transaction_date AS date), p.product_id, p.name, p.category_id;

-- --------------------------------------------------------
-- vw_inventory_adjustment_log
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_inventory_adjustment_log` AS
SELECT
  ia.adjustment_id,
  ia.adjustment_date,
  u.username                                            AS adjusted_by,
  u.role,
  p.name                                                AS product_name,
  c.name                                                AS category,
  il.lot_id,
  il.date_received                                      AS lot_received_date,
  il.buying_price                                       AS lot_buying_price,
  ia.quantity_adjusted,
  CASE WHEN ia.quantity_adjusted > 0 THEN 'Addition' ELSE 'Reduction' END AS adjustment_type,
  COALESCE(ia.reason, 'No reason provided')             AS reason
FROM `inventory_adjustments` ia
JOIN `users`          u  ON u.user_id    = ia.user_id
JOIN `inventory_lots` il ON il.lot_id   = ia.lot_id
JOIN `products`       p  ON p.product_id = il.product_id
JOIN `product_categories` c ON c.category_id = p.category_id;

-- --------------------------------------------------------
-- vw_product_stock  (referenced by vw_low_stock_alerts)
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_product_stock` AS
SELECT
  p.product_id,
  p.name                AS product_name,
  c.name                AS category,
  p.store_location,
  p.min_stock_threshold,
  COALESCE(SUM(il.quantity), 0)
    + COALESCE(SUM(COALESCE(adj.total_adjusted, 0)), 0) AS total_stock,
  CASE
    WHEN COALESCE(SUM(il.quantity), 0)
       + COALESCE(SUM(COALESCE(adj.total_adjusted, 0)), 0)
       <= p.min_stock_threshold
    THEN 1 ELSE 0
  END                   AS is_low_stock
FROM `products` p
JOIN `product_categories` c ON c.category_id = p.category_id
LEFT JOIN `inventory_lots` il
  ON il.product_id = p.product_id
LEFT JOIN (
  SELECT lot_id, SUM(quantity_adjusted) AS total_adjusted
  FROM   `inventory_adjustments`
  GROUP  BY lot_id
) adj ON adj.lot_id = il.lot_id
GROUP BY
  p.product_id, p.name, c.name,
  p.store_location, p.min_stock_threshold;

-- --------------------------------------------------------
-- vw_low_stock_alerts  (depends on vw_product_stock)
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_low_stock_alerts` AS
SELECT
  product_id,
  product_name,
  category,
  store_location,
  total_stock,
  min_stock_threshold,
  min_stock_threshold - total_stock AS units_below_threshold
FROM `vw_product_stock`
WHERE is_low_stock = 1;

-- --------------------------------------------------------
-- vw_web_orders_dashboard
-- --------------------------------------------------------
CREATE OR REPLACE VIEW `vw_web_orders_dashboard` AS
SELECT
  wo.order_id,
  wo.status,
  wo.order_date,
  wo.updated_at,
  c.user_id               AS client_id,
  c.username              AS client_username,
  c.preferred_lang        AS client_preferred_lang,
  u.username              AS handled_by_user,
  p.product_id,
  p.name                  AS product_name,
  p.store_location,
  woi.quantity,
  woi.price_at_order,
  woi.quantity * woi.price_at_order AS line_total
FROM `web_orders` wo
JOIN `users`           c   ON c.user_id    = wo.client_id AND c.user_type = 'client'
JOIN `web_order_items` woi ON woi.order_id = wo.order_id
JOIN `products`        p   ON p.product_id = woi.product_id
LEFT JOIN `users`      u   ON u.user_id    = wo.handled_by;

-- -----------------------------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------------------------

-- --------------------------------------------------------
-- inventory_adjustments: prevent negative lot quantity
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_adjustment_apply`;
DELIMITER $$
CREATE TRIGGER `trg_adjustment_apply`
AFTER INSERT ON `inventory_adjustments`
FOR EACH ROW
BEGIN
  DECLARE v_current_qty INT;

  SELECT quantity INTO v_current_qty
  FROM   inventory_lots
  WHERE  lot_id = NEW.lot_id;

  IF (v_current_qty + NEW.quantity_adjusted) < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Adjustment would result in negative lot quantity. Operation aborted.';
  END IF;

  UPDATE inventory_lots
  SET    quantity = quantity + NEW.quantity_adjusted
  WHERE  lot_id   = NEW.lot_id;
END$$
DELIMITER ;

-- --------------------------------------------------------
-- price_rules: reject overlapping active rules
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_validate_price_rule`;
DELIMITER $$
CREATE TRIGGER `trg_validate_price_rule`
BEFORE INSERT ON `price_rules`
FOR EACH ROW
BEGIN
  DECLARE v_conflict INT;

  SELECT COUNT(*) INTO v_conflict
  FROM   price_rules
  WHERE  product_id  = NEW.product_id
    AND  rule_type   = NEW.rule_type
    AND  is_active   = TRUE
    AND  NEW.start_date < end_date
    AND  NEW.end_date   > start_date;

  IF v_conflict > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'An overlapping active price rule of this type already exists for this product.';
  END IF;
END$$
DELIMITER ;

-- --------------------------------------------------------
-- transactions: default receipt language from user profile
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_default_receipt_language`;
DELIMITER $$
CREATE TRIGGER `trg_default_receipt_language`
BEFORE INSERT ON `transactions`
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
DELIMITER ;

-- --------------------------------------------------------
-- transactions: block inactive users
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_prevent_inactive_user_login`;
DELIMITER $$
CREATE TRIGGER `trg_prevent_inactive_user_login`
BEFORE INSERT ON `transactions`
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

-- --------------------------------------------------------
-- transactions: enforce positive total amount
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_transaction_total_verify`;
DELIMITER $$
CREATE TRIGGER `trg_transaction_total_verify`
BEFORE INSERT ON `transactions`
FOR EACH ROW
BEGIN
  IF NEW.total_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Transaction total_amount must be greater than zero.';
  END IF;
END$$
DELIMITER ;

-- --------------------------------------------------------
-- transaction_items: create new lot for refunded stock (FIFO return)
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_refund_create_lot`;
DELIMITER $$
CREATE TRIGGER `trg_refund_create_lot`
AFTER INSERT ON `transaction_items`
FOR EACH ROW
BEGIN
  DECLARE v_buying_price DECIMAL(10,2);

  IF NEW.quantity < 0 THEN
    SELECT buying_price INTO v_buying_price
    FROM   inventory_lots
    WHERE  lot_id = NEW.lot_id;

    INSERT INTO inventory_lots (product_id, quantity, buying_price)
    VALUES (NEW.product_id, ABS(NEW.quantity), v_buying_price);
  END IF;
END$$
DELIMITER ;

-- --------------------------------------------------------
-- transaction_items: deduct stock for sales (with row lock)
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_sale_deduct_stock`;
DELIMITER $$
CREATE TRIGGER `trg_sale_deduct_stock`
AFTER INSERT ON `transaction_items`
FOR EACH ROW
BEGIN
  IF NEW.quantity > 0 THEN
    IF (SELECT quantity FROM inventory_lots WHERE lot_id = NEW.lot_id FOR UPDATE) < NEW.quantity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient stock in the selected lot for this sale.';
    END IF;

    UPDATE inventory_lots
    SET    quantity = quantity - NEW.quantity
    WHERE  lot_id   = NEW.lot_id;
  END IF;
END$$
DELIMITER ;

-- --------------------------------------------------------
-- web_orders: enforce forward-only status transitions
-- --------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_order_status_workflow`;
DELIMITER $$
CREATE TRIGGER `trg_order_status_workflow`
BEFORE UPDATE ON `web_orders`
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    IF NOT (
      (OLD.status = 'Pending'          AND NEW.status = 'Ready for Pickup') OR
      (OLD.status = 'Ready for Pickup' AND NEW.status = 'Completed')
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid order status transition. Allowed: Pending→Ready for Pickup→Completed.';
    END IF;
  END IF;
END$$
DELIMITER ;

-- =============================================================================
-- End of script
-- =============================================================================