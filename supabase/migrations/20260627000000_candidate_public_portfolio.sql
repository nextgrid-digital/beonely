-- Candidate public portfolio: customizable handle + publish flag.
-- Public reads are served by service-role API endpoints (which strip email/phone),
-- so no anon RLS is opened here. The existing owner UPDATE policy lets a candidate
-- set these columns on their own row.

ALTER TABLE public.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portfolio_published_at timestamptz;

-- Handle format: 3-40 chars, lowercase alphanumeric + internal hyphens (no leading/trailing hyphen).
ALTER TABLE public.job_seeker_profiles
  DROP CONSTRAINT IF EXISTS job_seeker_profiles_public_slug_format;

ALTER TABLE public.job_seeker_profiles
  ADD CONSTRAINT job_seeker_profiles_public_slug_format
  CHECK (
    public_slug IS NULL
    OR public_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
  );

-- One handle per platform (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS job_seeker_profiles_public_slug_key
  ON public.job_seeker_profiles (lower(public_slug))
  WHERE public_slug IS NOT NULL;

-- Live availability check for the profile editor. SECURITY DEFINER so an authenticated
-- candidate (who can only SELECT their own row) can still test whether a handle is free.
-- Excludes the caller's own row so re-saving an unchanged handle reads as available.
CREATE OR REPLACE FUNCTION public.is_portfolio_slug_available (p_slug text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.job_seeker_profiles
    WHERE lower(public_slug) = lower(p_slug)
      AND user_id IS DISTINCT FROM (select auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_portfolio_slug_available (text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_portfolio_slug_available (text) TO authenticated;

-- Single source of truth for public portfolio reads: returns a sanitized JSON
-- payload (email/phone contacts removed) only for published profiles, or NULL.
-- SECURITY DEFINER so anon can read published portfolios without opening RLS on
-- the underlying owner-only table.
CREATE OR REPLACE FUNCTION public.get_public_portfolio (p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'slug', p.public_slug,
    'name', COALESCE(
      NULLIF(btrim(p.full_name), ''),
      NULLIF(btrim(p.resume_structured -> 'general' ->> 'name'), ''),
      'Candidate'
    ),
    'headline', COALESCE(p.resume_structured -> 'general' ->> 'jobTitle', ''),
    'avatar', COALESCE(p.resume_structured -> 'general' ->> 'avatar', ''),
    'about', COALESCE(p.resume_structured -> 'general' ->> 'about', ''),
    'resume', jsonb_build_object(
      'schemaVersion', 1,
      'general',
        (COALESCE(p.resume_structured -> 'general', '{}'::jsonb) - 'contacts')
        || jsonb_build_object('contacts', (
          SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
          FROM jsonb_array_elements(
            COALESCE(p.resume_structured -> 'general' -> 'contacts', '[]'::jsonb)
          ) AS c
          WHERE lower(COALESCE(c ->> 'href', '')) NOT LIKE 'mailto:%'
            AND lower(COALESCE(c ->> 'href', '')) NOT LIKE 'tel:%'
            AND COALESCE(c ->> 'value', '') NOT LIKE '%@%'
            AND lower(COALESCE(c ->> 'label', '')) NOT IN ('email', 'phone', 'mobile')
        )),
      'sections', COALESCE(p.resume_structured -> 'sections', '[]'::jsonb)
    )
  )
  FROM public.job_seeker_profiles p
  WHERE lower(p.public_slug) = lower(p_slug)
    AND p.is_public = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_portfolio (text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio (text) TO anon, authenticated;
