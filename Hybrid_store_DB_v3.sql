-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 26, 2026 at 05:00 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hybrid_store`
--

-- --------------------------------------------------------

--
-- Table structure for table `inventory_adjustments`
--

CREATE TABLE `inventory_adjustments` (
  `adjustment_id` int(11) NOT NULL,
  `lot_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `quantity_adjusted` int(11) NOT NULL CHECK (`quantity_adjusted` <> 0),
  `reason` varchar(255) DEFAULT NULL,
  `adjustment_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `inventory_adjustments`
--
DELIMITER $$
CREATE TRIGGER `trg_adjustment_apply` AFTER INSERT ON `inventory_adjustments` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_lots`
--

CREATE TABLE `inventory_lots` (
  `lot_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL CHECK (`quantity` >= 0),
  `buying_price` decimal(10,2) NOT NULL CHECK (`buying_price` >= 0),
  `date_received` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `price_rules`
--

CREATE TABLE `price_rules` (
  `rule_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `rule_type` enum('Deal','Rollback','Clearance','Holiday') NOT NULL,
  `promotional_price` decimal(10,2) NOT NULL CHECK (`promotional_price` >= 0),
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ;

--
-- Triggers `price_rules`
--
DELIMITER $$
CREATE TRIGGER `trg_validate_price_rule` BEFORE INSERT ON `price_rules` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `default_selling_price` decimal(10,2) NOT NULL CHECK (`default_selling_price` >= 0),
  `store_location` varchar(100) DEFAULT NULL,
  `tax_category_id` int(11) NOT NULL,
  `min_stock_threshold` int(11) DEFAULT 0 CHECK (`min_stock_threshold` >= 0),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tax_categories`
--

CREATE TABLE `tax_categories` (
  `tax_category_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `rate` decimal(5,2) NOT NULL CHECK (`rate` >= 0 and `rate` <= 100),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tax_categories`
--

INSERT INTO `tax_categories` (`tax_category_id`, `name`, `rate`, `created_at`) VALUES
(1, 'Standard', 19.00, '2026-03-16 19:29:48');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `is_refund` tinyint(1) DEFAULT 0,
  `receipt_language` varchar(10) DEFAULT 'en',
  `transaction_date` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `transactions`
--
DELIMITER $$
CREATE TRIGGER `trg_default_receipt_language` BEFORE INSERT ON `transactions` FOR EACH ROW BEGIN
    DECLARE v_lang VARCHAR(10);

    IF NEW.receipt_language IS NULL OR NEW.receipt_language = '' THEN
        SELECT preferred_lang INTO v_lang
        FROM   users
        WHERE  user_id = NEW.user_id;

        SET NEW.receipt_language = COALESCE(v_lang, 'en');
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_prevent_inactive_user_login` BEFORE INSERT ON `transactions` FOR EACH ROW BEGIN
    DECLARE v_active BOOLEAN;

    SELECT is_active INTO v_active
    FROM   users
    WHERE  user_id = NEW.user_id;

    IF v_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction rejected: the associated user account is inactive.';
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_transaction_total_verify` BEFORE INSERT ON `transactions` FOR EACH ROW BEGIN
    IF NEW.total_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction total_amount must be greater than zero.';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `transaction_item_id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `lot_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL CHECK (`quantity` <> 0),
  `price_applied` decimal(10,2) NOT NULL CHECK (`price_applied` >= 0),
  `tax_applied` decimal(10,2) NOT NULL CHECK (`tax_applied` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `transaction_items`
--
DELIMITER $$
CREATE TRIGGER `trg_refund_create_lot` AFTER INSERT ON `transaction_items` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_sale_deduct_stock` AFTER INSERT ON `transaction_items` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `pin_hash` varchar(255) DEFAULT NULL,
  `role` enum('Store Associate','Administrator') NOT NULL,
  `preferred_lang` varchar(10) DEFAULT 'en',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_type` varchar(20) NOT NULL DEFAULT 'client'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_active_price`
-- (See below for the actual view)
--
CREATE TABLE `vw_active_price` (
`product_id` int(11)
,`product_name` varchar(100)
,`category` varchar(50)
,`default_selling_price` decimal(10,2)
,`promotional_price` decimal(10,2)
,`rule_type` enum('Deal','Rollback','Clearance','Holiday')
,`deal_start` datetime
,`deal_end` datetime
,`effective_price` decimal(10,2)
,`has_active_deal` int(1)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_associate_sales_summary`
-- (See below for the actual view)
--
CREATE TABLE `vw_associate_sales_summary` (
`user_id` int(11)
,`username` varchar(50)
,`role` enum('Store Associate','Administrator')
,`total_sales` bigint(21)
,`total_refunds` bigint(21)
,`total_revenue_processed` decimal(32,2)
,`first_transaction` timestamp
,`last_transaction` timestamp
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_fifo_lot_queue`
-- (See below for the actual view)
--
CREATE TABLE `vw_fifo_lot_queue` (
`product_id` int(11)
,`product_name` varchar(100)
,`lot_id` int(11)
,`buying_price` decimal(10,2)
,`date_received` timestamp
,`original_quantity` int(11)
,`remaining_quantity` decimal(33,0)
,`fifo_rank` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_financial_report`
-- (See below for the actual view)
--
CREATE TABLE `vw_financial_report` (
`sale_date` date
,`product_id` int(11)
,`product_name` varchar(100)
,`category` varchar(50)
,`units_sold` decimal(32,0)
,`units_refunded` decimal(32,0)
,`revenue` decimal(42,2)
,`cogs` decimal(42,2)
,`tax_collected` decimal(32,2)
,`net_profit` decimal(43,2)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_inventory_adjustment_log`
-- (See below for the actual view)
--
CREATE TABLE `vw_inventory_adjustment_log` (
`adjustment_id` int(11)
,`adjustment_date` timestamp
,`adjusted_by` varchar(50)
,`role` enum('Store Associate','Administrator')
,`product_name` varchar(100)
,`category` varchar(50)
,`lot_id` int(11)
,`lot_received_date` timestamp
,`lot_buying_price` decimal(10,2)
,`quantity_adjusted` int(11)
,`adjustment_type` varchar(9)
,`reason` varchar(255)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_low_stock_alerts`
-- (See below for the actual view)
--
CREATE TABLE `vw_low_stock_alerts` (
`product_id` int(11)
,`product_name` varchar(100)
,`category` varchar(50)
,`store_location` varchar(100)
,`total_stock` decimal(55,0)
,`min_stock_threshold` int(11)
,`units_below_threshold` decimal(56,0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_product_stock`
-- (See below for the actual view)
--
CREATE TABLE `vw_product_stock` (
`product_id` int(11)
,`product_name` varchar(100)
,`category` varchar(50)
,`store_location` varchar(100)
,`min_stock_threshold` int(11)
,`total_stock` decimal(55,0)
,`is_low_stock` int(1)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `vw_web_orders_dashboard`
-- (See below for the actual view)
--
CREATE TABLE `vw_web_orders_dashboard` (
);

-- --------------------------------------------------------

--
-- Table structure for table `web_orders`
--

CREATE TABLE `web_orders` (
  `order_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `handled_by` int(11) DEFAULT NULL,
  `status` enum('Pending','Ready for Pickup','Completed') DEFAULT 'Pending',
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `web_orders`
--
DELIMITER $$
CREATE TRIGGER `trg_order_status_workflow` BEFORE UPDATE ON `web_orders` FOR EACH ROW BEGIN
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
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `web_order_items`
--

CREATE TABLE `web_order_items` (
  `order_item_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL CHECK (`quantity` > 0),
  `price_at_order` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure for view `vw_active_price`
--
DROP TABLE IF EXISTS `vw_active_price`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_active_price`  AS SELECT `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`category` AS `category`, `p`.`default_selling_price` AS `default_selling_price`, `pr`.`promotional_price` AS `promotional_price`, `pr`.`rule_type` AS `rule_type`, `pr`.`start_date` AS `deal_start`, `pr`.`end_date` AS `deal_end`, coalesce(`pr`.`promotional_price`,`p`.`default_selling_price`) AS `effective_price`, CASE WHEN `pr`.`rule_id` is not null THEN 1 ELSE 0 END AS `has_active_deal` FROM (`products` `p` left join `price_rules` `pr` on(`pr`.`product_id` = `p`.`product_id` and `pr`.`is_active` = 1 and current_timestamp() between `pr`.`start_date` and `pr`.`end_date`)) ;

-- --------------------------------------------------------

--
-- Structure for view `vw_associate_sales_summary`
--
DROP TABLE IF EXISTS `vw_associate_sales_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_associate_sales_summary`  AS SELECT `u`.`user_id` AS `user_id`, `u`.`username` AS `username`, `u`.`role` AS `role`, count(case when `t`.`is_refund` = 0 then 1 end) AS `total_sales`, count(case when `t`.`is_refund` = 1 then 1 end) AS `total_refunds`, coalesce(sum(case when `t`.`is_refund` = 0 then `t`.`total_amount` end),0) AS `total_revenue_processed`, min(`t`.`transaction_date`) AS `first_transaction`, max(`t`.`transaction_date`) AS `last_transaction` FROM (`users` `u` left join `transactions` `t` on(`t`.`user_id` = `u`.`user_id`)) GROUP BY `u`.`user_id`, `u`.`username`, `u`.`role` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_fifo_lot_queue`
--
DROP TABLE IF EXISTS `vw_fifo_lot_queue`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_fifo_lot_queue`  AS SELECT `il`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `il`.`lot_id` AS `lot_id`, `il`.`buying_price` AS `buying_price`, `il`.`date_received` AS `date_received`, `il`.`quantity` AS `original_quantity`, `il`.`quantity`+ coalesce(sum(`ia`.`quantity_adjusted`),0) AS `remaining_quantity`, row_number() over ( partition by `il`.`product_id` order by `il`.`date_received`) AS `fifo_rank` FROM ((`inventory_lots` `il` join `products` `p` on(`p`.`product_id` = `il`.`product_id`)) left join `inventory_adjustments` `ia` on(`ia`.`lot_id` = `il`.`lot_id`)) GROUP BY `il`.`lot_id`, `il`.`product_id`, `p`.`name`, `il`.`buying_price`, `il`.`date_received`, `il`.`quantity` HAVING `remaining_quantity` > 0 ;

-- --------------------------------------------------------

--
-- Structure for view `vw_financial_report`
--
DROP TABLE IF EXISTS `vw_financial_report`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_financial_report`  AS SELECT cast(`t`.`transaction_date` as date) AS `sale_date`, `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`category` AS `category`, sum(case when `t`.`is_refund` = 0 then `ti`.`quantity` else 0 end) AS `units_sold`, sum(case when `t`.`is_refund` = 1 then abs(`ti`.`quantity`) else 0 end) AS `units_refunded`, sum(case when `t`.`is_refund` = 0 then `ti`.`quantity` * `ti`.`price_applied` else -(abs(`ti`.`quantity`) * `ti`.`price_applied`) end) AS `revenue`, sum(case when `t`.`is_refund` = 0 then `ti`.`quantity` * `il`.`buying_price` else -(abs(`ti`.`quantity`) * `il`.`buying_price`) end) AS `cogs`, sum(case when `t`.`is_refund` = 0 then `ti`.`tax_applied` else -`ti`.`tax_applied` end) AS `tax_collected`, sum(case when `t`.`is_refund` = 0 then `ti`.`quantity` * `ti`.`price_applied` - `ti`.`quantity` * `il`.`buying_price` else -(abs(`ti`.`quantity`) * `ti`.`price_applied` - abs(`ti`.`quantity`) * `il`.`buying_price`) end) AS `net_profit` FROM (((`transaction_items` `ti` join `transactions` `t` on(`t`.`transaction_id` = `ti`.`transaction_id`)) join `products` `p` on(`p`.`product_id` = `ti`.`product_id`)) join `inventory_lots` `il` on(`il`.`lot_id` = `ti`.`lot_id`)) GROUP BY cast(`t`.`transaction_date` as date), `p`.`product_id`, `p`.`name`, `p`.`category` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_inventory_adjustment_log`
--
DROP TABLE IF EXISTS `vw_inventory_adjustment_log`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_inventory_adjustment_log`  AS SELECT `ia`.`adjustment_id` AS `adjustment_id`, `ia`.`adjustment_date` AS `adjustment_date`, `u`.`username` AS `adjusted_by`, `u`.`role` AS `role`, `p`.`name` AS `product_name`, `p`.`category` AS `category`, `il`.`lot_id` AS `lot_id`, `il`.`date_received` AS `lot_received_date`, `il`.`buying_price` AS `lot_buying_price`, `ia`.`quantity_adjusted` AS `quantity_adjusted`, CASE WHEN `ia`.`quantity_adjusted` > 0 THEN 'Addition' ELSE 'Reduction' END AS `adjustment_type`, coalesce(`ia`.`reason`,'No reason provided') AS `reason` FROM (((`inventory_adjustments` `ia` join `users` `u` on(`u`.`user_id` = `ia`.`user_id`)) join `inventory_lots` `il` on(`il`.`lot_id` = `ia`.`lot_id`)) join `products` `p` on(`p`.`product_id` = `il`.`product_id`)) ;

-- --------------------------------------------------------

--
-- Structure for view `vw_low_stock_alerts`
--
DROP TABLE IF EXISTS `vw_low_stock_alerts`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_low_stock_alerts`  AS SELECT `vw_product_stock`.`product_id` AS `product_id`, `vw_product_stock`.`product_name` AS `product_name`, `vw_product_stock`.`category` AS `category`, `vw_product_stock`.`store_location` AS `store_location`, `vw_product_stock`.`total_stock` AS `total_stock`, `vw_product_stock`.`min_stock_threshold` AS `min_stock_threshold`, `vw_product_stock`.`min_stock_threshold`- `vw_product_stock`.`total_stock` AS `units_below_threshold` FROM `vw_product_stock` WHERE `vw_product_stock`.`is_low_stock` = 1 ;

-- --------------------------------------------------------

--
-- Structure for view `vw_product_stock`
--
DROP TABLE IF EXISTS `vw_product_stock`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_product_stock`  AS SELECT `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`category` AS `category`, `p`.`store_location` AS `store_location`, `p`.`min_stock_threshold` AS `min_stock_threshold`, coalesce(sum(`il`.`quantity`),0) + coalesce(sum(coalesce(`adj`.`total_adjusted`,0)),0) AS `total_stock`, CASE WHEN coalesce(sum(`il`.`quantity`),0) + coalesce(sum(coalesce(`adj`.`total_adjusted`,0)),0) <= `p`.`min_stock_threshold` THEN 1 ELSE 0 END AS `is_low_stock` FROM ((`products` `p` left join `inventory_lots` `il` on(`il`.`product_id` = `p`.`product_id`)) left join (select `ia`.`lot_id` AS `lot_id`,sum(`ia`.`quantity_adjusted`) AS `total_adjusted` from `inventory_adjustments` `ia` group by `ia`.`lot_id`) `adj` on(`adj`.`lot_id` = `il`.`lot_id`)) GROUP BY `p`.`product_id`, `p`.`name`, `p`.`category`, `p`.`store_location`, `p`.`min_stock_threshold` ;

-- --------------------------------------------------------

--
-- Structure for view `vw_web_orders_dashboard`
--
DROP TABLE IF EXISTS `vw_web_orders_dashboard`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vw_web_orders_dashboard`  AS SELECT `wo`.`order_id` AS `order_id`, `wo`.`status` AS `status`, `wo`.`order_date` AS `order_date`, `wo`.`updated_at` AS `updated_at`, `c`.`user_id` AS `client_id`, `c`.`username` AS `client_username`, `c`.`preferred_lang` AS `client_preferred_lang`, `u`.`username` AS `handled_by_user`, `p`.`product_id` AS `product_id`, `p`.`name` AS `product_name`, `p`.`store_location` AS `store_location`, `woi`.`quantity` AS `quantity`, `woi`.`price_at_order` AS `price_at_order`, `woi`.`quantity`* `woi`.`price_at_order` AS `line_total` FROM ((((`web_orders` `wo` join `users` `c` on(`c`.`user_id` = `wo`.`client_id` AND `c`.`user_type` = 'client')) join `web_order_items` `woi` on(`woi`.`order_id` = `wo`.`order_id`)) join `products` `p` on(`p`.`product_id` = `woi`.`product_id`)) left join `users` `u` on(`u`.`user_id` = `wo`.`handled_by`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  ADD PRIMARY KEY (`adjustment_id`),
  ADD KEY `lot_id` (`lot_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `inventory_lots`
--
ALTER TABLE `inventory_lots`
  ADD PRIMARY KEY (`lot_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `price_rules`
--
ALTER TABLE `price_rules`
  ADD PRIMARY KEY (`rule_id`),
  ADD UNIQUE KEY `uq_active_rule` (`product_id`,`rule_type`,`start_date`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `tax_category_id` (`tax_category_id`);

--
-- Indexes for table `tax_categories`
--
ALTER TABLE `tax_categories`
  ADD PRIMARY KEY (`tax_category_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`transaction_item_id`),
  ADD KEY `transaction_id` (`transaction_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `lot_id` (`lot_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `web_orders`
--
ALTER TABLE `web_orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `handled_by` (`handled_by`);

--
-- Indexes for table `web_order_items`
--
ALTER TABLE `web_order_items`
  ADD PRIMARY KEY (`order_item_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `product_id` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  MODIFY `adjustment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_lots`
--
ALTER TABLE `inventory_lots`
  MODIFY `lot_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `price_rules`
--
ALTER TABLE `price_rules`
  MODIFY `rule_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_categories`
--
ALTER TABLE `tax_categories`
  MODIFY `tax_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `transaction_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `web_orders`
--
ALTER TABLE `web_orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `web_order_items`
--
ALTER TABLE `web_order_items`
  MODIFY `order_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `inventory_adjustments`
--
ALTER TABLE `inventory_adjustments`
  ADD CONSTRAINT `inventory_adjustments_ibfk_1` FOREIGN KEY (`lot_id`) REFERENCES `inventory_lots` (`lot_id`),
  ADD CONSTRAINT `inventory_adjustments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `inventory_lots`
--
ALTER TABLE `inventory_lots`
  ADD CONSTRAINT `inventory_lots_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `price_rules`
--
ALTER TABLE `price_rules`
  ADD CONSTRAINT `price_rules_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories` (`tax_category_id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`),
  ADD CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  ADD CONSTRAINT `transaction_items_ibfk_3` FOREIGN KEY (`lot_id`) REFERENCES `inventory_lots` (`lot_id`);

--
-- Constraints for table `web_orders`
--
ALTER TABLE `web_orders`
  ADD CONSTRAINT `web_orders_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `web_orders_ibfk_2` FOREIGN KEY (`handled_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `web_order_items`
--
ALTER TABLE `web_order_items`
  ADD CONSTRAINT `web_order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `web_orders` (`order_id`),
  ADD CONSTRAINT `web_order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
