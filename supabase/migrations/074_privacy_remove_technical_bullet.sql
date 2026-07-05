-- Remove technical-information bullet from privacy policy site content.

UPDATE site_content_blocks
SET value = jsonb_set(
  value,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN section ? 'bullets' THEN
          jsonb_set(
            section,
            '{bullets}',
            COALESCE(
              (
                SELECT jsonb_agg(bullet)
                FROM jsonb_array_elements_text(section->'bullets') AS bullet
                WHERE bullet NOT ILIKE 'Technical information:%'
              ),
              '[]'::jsonb
            )
          )
        ELSE section
      END
    )
    FROM jsonb_array_elements(value->'sections') AS section
  )
)
WHERE key = 'privacy'
  AND value::text ILIKE '%Technical information:%';
