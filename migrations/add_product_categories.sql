-- ============================================================
-- Migration: Add product_categories table
-- NOTE: This migration is already incorporated into the v4 schema.
--       It is kept here for backwards compatibility with older installs.
--       All operations are idempotent (IF NOT EXISTS / INSERT IGNORE).
-- ============================================================

-- 1. Create the product_categories table (no-op if v4 schema already applied)
CREATE TABLE IF NOT EXISTS product_categories (
  category_id   INT(11)         NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
