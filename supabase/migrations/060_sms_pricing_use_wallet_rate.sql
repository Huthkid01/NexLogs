-- SMS pricing uses wallet NGN exchange rate; keep markup only in smsPricing block.

UPDATE site_content_blocks
SET value = jsonb_build_object(
  'markupPercent',
  COALESCE(
    NULLIF(value->>'markupPercent', '')::numeric,
    NULLIF(value->>'markup_percent', '')::numeric,
    50
  )
)
WHERE key = 'smsPricing';

INSERT INTO site_content_blocks (key, value)
VALUES ('smsPricing', '{"markupPercent": 50}'::jsonb)
ON CONFLICT (key) DO NOTHING;
