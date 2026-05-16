-- Beonely email platform enums (part 1 — commit before using new enum values).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriber_audience') THEN
    CREATE TYPE public.subscriber_audience AS ENUM (
      'newsletter',
      'candidate',
      'recruiter'
    );
  END IF;
END $$;

ALTER TYPE public.campaign_audience ADD VALUE IF NOT EXISTS 'candidates';
ALTER TYPE public.campaign_audience ADD VALUE IF NOT EXISTS 'newsletter';
ALTER TYPE public.campaign_audience ADD VALUE IF NOT EXISTS 'all_marketing';
