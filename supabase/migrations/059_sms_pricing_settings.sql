-- Default global SMS pricing settings (Option 3: markup + admin view).

INSERT INTO site_content_blocks (key, value)
VALUES (
  'smsPricing',
  '{"usdNgnRate": 1500, "markupPercent": 50}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
