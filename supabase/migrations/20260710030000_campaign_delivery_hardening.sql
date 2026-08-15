-- Stable recipient snapshots and provider idempotency require one row per
-- campaign/email pair. Preserve the oldest audit row when cleaning legacy data.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY campaign_id, lower(email)
      ORDER BY created_at, id
    ) AS row_number
  FROM public.email_campaign_recipients
)
DELETE FROM public.email_campaign_recipients AS recipient
USING ranked
WHERE recipient.id = ranked.id AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS email_campaign_recipients_campaign_email_key
ON public.email_campaign_recipients (campaign_id, email);

-- Keep the raw-column key above for PostgREST's onConflict target while also
-- preventing future case-only duplicates at the database boundary.
CREATE UNIQUE INDEX IF NOT EXISTS email_campaign_recipients_campaign_lower_email_key
ON public.email_campaign_recipients (campaign_id, lower(email));
