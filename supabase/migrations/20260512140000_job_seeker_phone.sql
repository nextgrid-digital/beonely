-- Candidate phone on job seeker profile (required in app for candidates).
ALTER TABLE public.job_seeker_profiles
ADD COLUMN IF NOT EXISTS phone TEXT;
