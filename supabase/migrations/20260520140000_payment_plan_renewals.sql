-- Renewal listing plans (60% of initial base; see src/lib/payments/plans.ts)

ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_week_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'standard_month_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_week_renew';
ALTER TYPE public.payment_plan ADD VALUE IF NOT EXISTS 'featured_month_renew';

INSERT INTO public.email_automation_rules (trigger_key, enabled)
VALUES ('listing_expiry_reminder', true)
ON CONFLICT (trigger_key) DO NOTHING;
