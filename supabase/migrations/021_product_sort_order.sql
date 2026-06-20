-- Keep a stable catalog order that does not change when products are edited
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC, id ASC) - 1 AS rank
  FROM products
)
UPDATE products p
SET sort_order = ranked.rank
FROM ranked
WHERE p.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
