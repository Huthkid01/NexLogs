-- Fix LOGGSPLUG products where an image URL was saved as description text.
-- Safe to re-run. Keeps product_images (icons) — only fixes description/login_instructions text.
-- After this, run Admin → LOGGSPLUG → Sync catalog to refresh real LOGGSPLUG icons.

UPDATE products
SET
  description = CASE
    WHEN niche IS NOT NULL
      AND btrim(niche) <> ''
      AND lower(btrim(title)) NOT LIKE '%' || lower(btrim(niche)) || '%'
      THEN btrim(title) || ' — ' || btrim(niche)
    ELSE btrim(title)
  END,
  login_instructions = NULL
WHERE supplier = 'loggsplug'
  AND (
    description ~* 'loggsplug\.(online|com)/assets/images/product/'
    OR description ~* '^https?://[^[:space:]]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$'
    OR login_instructions ~* 'loggsplug\.(online|com)/assets/images/product/'
    OR login_instructions ~* '^https?://[^[:space:]]+\.(png|jpe?g|webp|gif|svg)(\?.*)?$'
  );

-- Preview before running (optional):
-- SELECT id, title, description, login_instructions
-- FROM products
-- WHERE supplier = 'loggsplug'
--   AND description ~* 'loggsplug\.(online|com)/assets/images/product/';
