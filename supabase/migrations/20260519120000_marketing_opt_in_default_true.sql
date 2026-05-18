-- Default marketing opt-in to true for new rows; backfill existing opted-out users.

ALTER TABLE public.job_seeker_profiles
ALTER COLUMN marketing_opt_in SET DEFAULT true;

ALTER TABLE public.recruiters
ALTER COLUMN marketing_opt_in SET DEFAULT true;

UPDATE public.job_seeker_profiles
SET
  marketing_opt_in = true,
  marketing_opt_in_at = COALESCE(marketing_opt_in_at, now())
WHERE marketing_opt_in = false;

UPDATE public.recruiters
SET
  marketing_opt_in = true,
  marketing_opt_in_at = COALESCE(marketing_opt_in_at, now())
WHERE marketing_opt_in = false;
