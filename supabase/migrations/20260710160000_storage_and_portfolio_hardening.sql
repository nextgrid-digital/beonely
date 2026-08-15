-- Bound public upload surfaces and harden SECURITY DEFINER portfolio helpers.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::TEXT[]
WHERE id IN ('avatars', 'job-logos');

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]::TEXT[]
WHERE id = 'certificates';

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]::TEXT[]
WHERE id = 'resumes';

DROP POLICY IF EXISTS "job_logos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "job_logos_update_own" ON storage.objects;
DROP POLICY IF EXISTS "job_logos_delete_own" ON storage.objects;

CREATE POLICY job_logos_insert_active_owner
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1 FROM public.recruiters AS r
    WHERE r.id::TEXT = (storage.foldername(name))[1]
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE POLICY job_logos_update_active_owner
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1 FROM public.recruiters AS r
    WHERE r.id::TEXT = (storage.foldername(name))[1]
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
)
WITH CHECK (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1 FROM public.recruiters AS r
    WHERE r.id::TEXT = (storage.foldername(name))[1]
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE POLICY job_logos_delete_active_owner
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1 FROM public.recruiters AS r
    WHERE r.id::TEXT = (storage.foldername(name))[1]
      AND r.user_id = (SELECT auth.uid())
      AND r.disabled = false
  )
);

CREATE OR REPLACE FUNCTION public.is_portfolio_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN p_slug IS NULL
      OR p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$' THEN false
    ELSE NOT EXISTS (
      SELECT 1
      FROM public.job_seeker_profiles AS p
      WHERE LOWER(p.public_slug) = LOWER(p_slug)
        AND p.user_id IS DISTINCT FROM (SELECT auth.uid())
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_portfolio_slug_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portfolio_slug_available(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'slug', p.public_slug,
    'name', COALESCE(
      NULLIF(BTRIM(p.full_name), ''),
      NULLIF(BTRIM(p.resume_structured -> 'general' ->> 'name'), ''),
      'Candidate'
    ),
    'headline', COALESCE(p.resume_structured -> 'general' ->> 'jobTitle', ''),
    'avatar', safe.avatar_path,
    'about', COALESCE(p.resume_structured -> 'general' ->> 'about', ''),
    'resume', jsonb_build_object(
      'schemaVersion', 1,
      'general',
        (COALESCE(p.resume_structured -> 'general', '{}'::jsonb)
          - 'contacts' - 'avatar')
        || jsonb_build_object(
          'avatar', safe.avatar_path,
          'contacts', (
          SELECT COALESCE(jsonb_agg(contact), '[]'::jsonb)
          FROM jsonb_array_elements(
            COALESCE(p.resume_structured -> 'general' -> 'contacts', '[]'::jsonb)
          ) AS contact
          WHERE LOWER(COALESCE(contact ->> 'href', '')) NOT LIKE 'mailto:%'
            AND LOWER(COALESCE(contact ->> 'href', '')) NOT LIKE 'tel:%'
            AND COALESCE(contact ->> 'value', '') NOT LIKE '%@%'
            AND LOWER(COALESCE(contact ->> 'label', '')) !~
              '(email|phone|mobile|whatsapp|contact)'
          )
        ),
      'sections', COALESCE(p.resume_structured -> 'sections', '[]'::jsonb)
    )
  )
  FROM public.job_seeker_profiles AS p
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      substring(
        COALESCE(p.resume_structured -> 'general' ->> 'avatar', '')
        FROM '(/storage/v1/object/public/avatars/'
          || p.user_id::TEXT || '/avatar\.jpg)'
      ),
      ''
    ) AS avatar_path
  ) AS safe
  WHERE p_slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
    AND LOWER(p.public_slug) = LOWER(p_slug)
    AND p.is_public = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_portfolio(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(TEXT) TO anon, authenticated;
