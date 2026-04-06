-- Migration: Fix Category Integrity and Duplication Issues
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE products MODIFY category VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE product_categories MODIFY name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INT(11);

UPDATE products p
JOIN product_categories pc ON pc.name = p.category
SET p.category_id = pc.category_id;

INSERT IGNORE INTO product_categories (name)
SELECT DISTINCT category FROM products 
WHERE category NOT IN (SELECT name FROM product_categories);

UPDATE products p
JOIN product_categories pc ON pc.name = p.category
SET p.category_id = pc.category_id
WHERE p.category_id IS NULL;

ALTER TABLE products MODIFY COLUMN category_id INT(11) NOT NULL;
ALTER TABLE products ADD CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(category_id);

ALTER TABLE products DROP COLUMN IF EXISTS category;
-- Unique naming constraint (handles flip-flopping items by ensuring one canonical record per name)
-- If this fails, user has duplicates that they must resolve manually.
-- ALTER TABLE products ADD UNIQUE KEY IF NOT EXISTS uq_product_name (name);

SET FOREIGN_KEY_CHECKS=1;
