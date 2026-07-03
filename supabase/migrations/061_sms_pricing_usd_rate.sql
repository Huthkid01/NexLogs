-- SMS pricing keeps its own USD→NGN rate (SMS Pool is USD-only).

UPDATE site_content_blocks
SET value = jsonb_build_object(
  'usdNgnRate',
  COALESCE(
    NULLIF(value->>'usdNgnRate', '')::numeric,
    1500
  ),
  'markupPercent',
  COALESCE(
    NULLIF(value->>'markupPercent', '')::numeric,
    50
  )
)
WHERE key = 'smsPricing';

INSERT INTO site_content_blocks (key, value)
VALUES ('smsPricing', '{"usdNgnRate": 1500, "markupPercent": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;
