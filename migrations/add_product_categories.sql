-- ============================================================
-- Migration: Add product_categories table
-- Run this against your hybrid_store database.
-- ============================================================

-- 1. Create the product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
  category_id   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Seed the table with the distinct category values already in the products table
--    (this is safe to run even if the table already has rows — INSERT IGNORE skips duplicates)
INSERT IGNORE INTO product_categories (name)
SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category;

-- 3. (Optional) If you want a FK so the DB enforces valid categories, run:
--    ALTER TABLE products
--      ADD CONSTRAINT fk_products_category
--      FOREIGN KEY (category) REFERENCES product_categories (name)
--      ON UPDATE CASCADE ON DELETE RESTRICT;
--
-- Note: the FK is commented out because it requires the category column
-- to always contain a value that exists in product_categories.
-- Make sure all existing product rows have valid categories before enabling it.
