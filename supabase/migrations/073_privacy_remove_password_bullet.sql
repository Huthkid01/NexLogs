-- Remove password from privacy policy account-information bullet stored in site content.

UPDATE site_content_blocks
SET value = replace(
  replace(
    value::text,
    'Account information: name, email address, and password (for email sign-up).',
    'Account information: name and email address.'
  ),
  'Account information: name, email address, and password',
  'Account information: name and email address.'
)::jsonb
WHERE key = 'privacy'
  AND value::text ILIKE '%account information%password%';
