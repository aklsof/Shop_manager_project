-- ============================================================
-- Migration: Fix Category Integrity
-- NOTE: This migration is already incorporated into the v4 schema.
--       The v4 schema creates products.category_id with the FK directly.
--       This script is kept for backwards compatibility with older installs
--       that still have a text 'category' column.
-- ============================================================

-- Only run the migration if the old 'category' text column still exists.
-- If running against v4 schema, this entire migration is a no-op.
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'products'
    AND COLUMN_NAME = 'category'
    AND DATA_TYPE = 'varchar'
);

-- The rest only executes if the legacy column exists
SET @do_migrate = IF(@col_exists > 0, 'YES', 'NO');

-- If category_id column is missing, add it
SET @add_col = IF(@col_exists > 0,
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT(11)',
  'SELECT 1');
PREPARE stmt FROM @add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Populate category_id from the text category column
SET @update_ids = IF(@col_exists > 0,
  'UPDATE products p JOIN product_categories pc ON pc.name = p.category SET p.category_id = pc.category_id WHERE p.category_id IS NULL',
  'SELECT 1');
PREPARE stmt FROM @update_ids;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
