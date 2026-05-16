-- Part 2: use new enum values + marketing consent columns (run after 20260518140000).

UPDATE public.email_campaigns
SET audience = 'newsletter'::public.campaign_audience
WHERE audience = 'subscribers'::public.campaign_audience;

UPDATE public.email_campaigns
SET audience = 'all_marketing'::public.campaign_audience
WHERE audience = 'both'::public.campaign_audience;

ALTER TABLE public.job_seeker_profiles
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.job_seeker_profiles
ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;

UPDATE public.job_seeker_profiles
SET
  marketing_opt_in = notification_opt_in,
  marketing_opt_in_at = COALESCE(updated_at, created_at)
WHERE marketing_opt_in_at IS NULL
  AND notification_opt_in = true;

ALTER TABLE public.recruiters
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.recruiters
ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMPTZ;

ALTER TABLE public.email_subscribers
ADD COLUMN IF NOT EXISTS audience public.subscriber_audience NOT NULL DEFAULT 'newsletter';

ALTER TABLE public.email_campaign_recipients
ADD COLUMN IF NOT EXISTS resend_message_id TEXT;

CREATE INDEX IF NOT EXISTS email_subscribers_audience_active_idx
ON public.email_subscribers (audience)
WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS job_seeker_profiles_marketing_opt_in_idx
ON public.job_seeker_profiles (marketing_opt_in)
WHERE marketing_opt_in = true;

CREATE INDEX IF NOT EXISTS recruiters_marketing_opt_in_idx
ON public.recruiters (marketing_opt_in)
WHERE marketing_opt_in = true AND disabled = false;
