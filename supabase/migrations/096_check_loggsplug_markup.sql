-- Check Loggsplug markup application
-- This query helps verify if 70% markup is applied correctly

-- 1. Check the default markup setting
SELECT key, value 
FROM site_content_blocks 
WHERE key = 'loggsplug';

-- 2. Check all Loggsplug products with their markup overrides and pricing
SELECT 
  id,
  title,
  supplier_cost_ngn,
  markup_percent_override,
  price,
  CASE 
    WHEN markup_percent_override IS NOT NULL THEN markup_percent_override
    ELSE (SELECT (value->>'defaultMarkupPercent')::numeric FROM site_content_blocks WHERE key = 'loggsplug')
  END as effective_markup_percent,
  CASE 
    WHEN markup_percent_override IS NOT NULL 
    THEN ROUND(supplier_cost_ngn * (1 + markup_percent_override / 100))
    ELSE ROUND(supplier_cost_ngn * (1 + (SELECT (value->>'defaultMarkupPercent')::numeric FROM site_content_blocks WHERE key = 'loggsplug') / 100))
  END as expected_price,
  CASE 
    WHEN price = CASE 
      WHEN markup_percent_override IS NOT NULL 
      THEN ROUND(supplier_cost_ngn * (1 + markup_percent_override / 100))
      ELSE ROUND(supplier_cost_ngn * (1 + (SELECT (value->>'defaultMarkupPercent')::numeric FROM site_content_blocks WHERE key = 'loggsplug') / 100))
    END THEN 'CORRECT'
    ELSE 'MISMATCH'
  END as price_status
FROM products 
WHERE supplier = 'loggsplug'
ORDER BY created_at DESC
LIMIT 50;
