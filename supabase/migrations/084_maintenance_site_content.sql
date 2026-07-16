-- Optional seed for maintenance notice settings (defaults also live in client mergeSiteContent).
INSERT INTO site_content_blocks (key, value)
VALUES (
  'maintenance',
  jsonb_build_object(
    'enabled', false,
    'title', 'Scheduled maintenance',
    'message', 'Nexlogs is undergoing scheduled maintenance. Some features may be temporarily unavailable. Please check back shortly — thank you for your patience.'
  )
)
ON CONFLICT (key) DO NOTHING;
