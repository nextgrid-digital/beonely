-- Keep candidate assets private, make public portfolio data revocable, and
-- derive application snapshots from the authenticated candidate's profile.

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]::TEXT[]
WHERE id = 'certificates';

CREATE OR REPLACE FUNCTION public.is_safe_https_url(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    p_value ~ '^https://[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?(?::[0-9]{1,5})?(?:[/?#][^[:space:][:cntrl:]]*)?$',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_safe_linkedin_profile_url(p_value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT COALESCE(
    p_value ~* '^https://(www\.)?linkedin\.com/in/[A-Za-z0-9%._~-]+/?(?:[?#][^[:space:][:cntrl:]]*)?$',
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_safe_https_url(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_safe_linkedin_profile_url(TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.can_upload_candidate_certificate(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND p_name ~ (
      '^' || (SELECT auth.uid())::TEXT
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      || '\.(jpg|png|webp|pdf)$'
    )
    AND (
      SELECT COUNT(*)
      FROM storage.objects AS o
      WHERE o.bucket_id = 'certificates'
        AND (storage.foldername(o.name))[1] = (SELECT auth.uid())::TEXT
    ) < 20;
$$;

REVOKE ALL ON FUNCTION public.can_upload_candidate_certificate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_upload_candidate_certificate(TEXT) TO authenticated;

DROP POLICY IF EXISTS "certificates_select_public" ON storage.objects;
DROP POLICY IF EXISTS "certificates_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "certificates_update_own" ON storage.objects;
DROP POLICY IF EXISTS "certificates_delete_own" ON storage.objects;
DROP POLICY IF EXISTS certificates_select_own_exact ON storage.objects;
DROP POLICY IF EXISTS certificates_insert_own_bounded ON storage.objects;
DROP POLICY IF EXISTS certificates_update_own_exact ON storage.objects;
DROP POLICY IF EXISTS certificates_delete_own_exact ON storage.objects;

CREATE POLICY certificates_select_own_exact
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'certificates'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|png|webp|pdf)$'
  )
);

CREATE POLICY certificates_insert_own_bounded
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND public.can_upload_candidate_certificate(name)
);

CREATE POLICY certificates_update_own_exact
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificates'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|png|webp|pdf)$'
  )
)
WITH CHECK (
  bucket_id = 'certificates'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|png|webp|pdf)$'
  )
);

CREATE POLICY certificates_delete_own_exact
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(jpg|png|webp|pdf)$'
  )
);

-- A profile has one fixed avatar object. This prevents the public bucket from
-- becoming a general-purpose authenticated upload host.
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS avatars_insert_own_exact ON storage.objects;
DROP POLICY IF EXISTS avatars_update_own_exact ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_own_exact ON storage.objects;

CREATE POLICY avatars_insert_own_exact
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid())::TEXT || '/avatar.jpg'
);

CREATE POLICY avatars_update_own_exact
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid())::TEXT || '/avatar.jpg'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid())::TEXT || '/avatar.jpg'
);

CREATE POLICY avatars_delete_own_exact
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name = (SELECT auth.uid())::TEXT || '/avatar.jpg'
);

-- A recruiter can write only the fixed logo object for a job they own.
DROP POLICY IF EXISTS job_logos_insert_active_owner ON storage.objects;
DROP POLICY IF EXISTS job_logos_update_active_owner ON storage.objects;
DROP POLICY IF EXISTS job_logos_delete_active_owner ON storage.objects;
DROP POLICY IF EXISTS job_logos_insert_active_job_owner ON storage.objects;
DROP POLICY IF EXISTS job_logos_update_active_job_owner ON storage.objects;
DROP POLICY IF EXISTS job_logos_delete_active_job_owner ON storage.objects;

CREATE POLICY job_logos_insert_active_job_owner
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    JOIN public.jobs AS j ON j.recruiter_id = r.id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.disabled = false
      AND name = r.id::TEXT || '/' || j.id::TEXT || '/logo.jpg'
  )
);

CREATE POLICY job_logos_update_active_job_owner
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    JOIN public.jobs AS j ON j.recruiter_id = r.id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.disabled = false
      AND name = r.id::TEXT || '/' || j.id::TEXT || '/logo.jpg'
  )
)
WITH CHECK (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    JOIN public.jobs AS j ON j.recruiter_id = r.id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.disabled = false
      AND name = r.id::TEXT || '/' || j.id::TEXT || '/logo.jpg'
  )
);

CREATE POLICY job_logos_delete_active_job_owner
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters AS r
    JOIN public.jobs AS j ON j.recruiter_id = r.id
    WHERE r.user_id = (SELECT auth.uid())
      AND r.disabled = false
      AND name = r.id::TEXT || '/' || j.id::TEXT || '/logo.jpg'
  )
);

-- Resume uploads are private and limited to a single predictable object name
-- per supported type. Recruiters receive a short-lived URL from the API only
-- after application ownership is checked.
DROP POLICY IF EXISTS "resumes_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_update_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "resumes_select_own" ON storage.objects;
DROP POLICY IF EXISTS resumes_select_own_exact ON storage.objects;
DROP POLICY IF EXISTS resumes_insert_own_exact ON storage.objects;
DROP POLICY IF EXISTS resumes_update_own_exact ON storage.objects;
DROP POLICY IF EXISTS resumes_delete_own_exact ON storage.objects;

CREATE POLICY resumes_select_own_exact
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'resumes'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
  )
);

CREATE POLICY resumes_insert_own_exact
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
  )
);

CREATE POLICY resumes_update_own_exact
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
  )
)
WITH CHECK (
  bucket_id = 'resumes'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
  )
);

CREATE POLICY resumes_delete_own_exact
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes'
  AND name ~ (
    '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
  )
);

CREATE OR REPLACE FUNCTION public.sanitize_public_portfolio_resume(
  p_resume JSONB,
  p_user_id UUID,
  p_avatar_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_general JSONB := COALESCE(p_resume -> 'general', '{}'::JSONB);
  v_contacts JSONB := '[]'::JSONB;
  v_sections JSONB := '[]'::JSONB;
  v_items JSONB;
  v_contact JSONB;
  v_section JSONB;
  v_item JSONB;
  v_clean_item JSONB;
  v_href TEXT;
  v_path TEXT;
  v_match TEXT[];
  v_is_certificate BOOLEAN;
BEGIN
  FOR v_contact IN
    SELECT value FROM jsonb_array_elements(
      COALESCE(v_general -> 'contacts', '[]'::JSONB)
    )
  LOOP
    v_href := BTRIM(COALESCE(v_contact ->> 'href', ''));
    IF public.is_safe_https_url(v_href)
      AND COALESCE(v_contact ->> 'value', '') NOT LIKE '%@%'
      AND LOWER(COALESCE(v_contact ->> 'label', '')) !~
        '(email|phone|mobile|whatsapp|contact)'
    THEN
      v_contacts := v_contacts || jsonb_build_array(v_contact);
    END IF;
  END LOOP;

  v_general := (v_general - 'contacts' - 'avatar' - 'website')
    || jsonb_build_object(
      'avatar', p_avatar_path,
      'contacts', v_contacts,
      'website', CASE
        WHEN public.is_safe_https_url(v_general ->> 'website')
          THEN v_general ->> 'website'
        ELSE ''
      END
    );

  FOR v_section IN
    SELECT value FROM jsonb_array_elements(
      COALESCE(p_resume -> 'sections', '[]'::JSONB)
    )
  LOOP
    v_items := '[]'::JSONB;
    v_is_certificate := LOWER(COALESCE(v_section ->> 'title', '')) LIKE '%certificat%';

    FOR v_item IN
      SELECT value FROM jsonb_array_elements(
        COALESCE(v_section -> 'items', '[]'::JSONB)
      )
    LOOP
      v_clean_item := v_item - 'fileUrl' - 'filePath';
      v_path := NULLIF(BTRIM(COALESCE(v_item ->> 'filePath', '')), '');
      IF v_path IS NULL THEN
        v_match := regexp_match(
          COALESCE(v_item ->> 'fileUrl', ''),
          '/storage/v1/object/public/certificates/([^?#]+)'
        );
        v_path := v_match[1];
      END IF;

      IF v_is_certificate
        AND v_path ~ (
          '^' || p_user_id::TEXT
          || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
          || '\.(jpg|png|webp|pdf)$'
        )
      THEN
        v_clean_item := v_clean_item || jsonb_build_object('filePath', v_path);
      END IF;

      v_items := v_items || jsonb_build_array(v_clean_item);
    END LOOP;

    v_sections := v_sections || jsonb_build_array(
      (v_section - 'items') || jsonb_build_object('items', v_items)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'schemaVersion', 1,
    'general', v_general,
    'sections', v_sections
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sanitize_public_portfolio_resume(JSONB, UUID, TEXT)
FROM PUBLIC;

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
    'resume', public.sanitize_public_portfolio_resume(
      p.resume_structured,
      p.user_id,
      safe.avatar_path
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

CREATE OR REPLACE FUNCTION public.enforce_application_candidate_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  authenticated_email TEXT;
  candidate_profile public.job_seeker_profiles%ROWTYPE;
  derived_recruiter_id UUID;
  derived_company TEXT;
  candidate_name TEXT;
BEGIN
  IF (SELECT auth.role()) = 'authenticated' THEN
    authenticated_email := NULLIF(BTRIM((SELECT auth.jwt()) ->> 'email'), '');
    IF authenticated_email IS NULL THEN
      RAISE EXCEPTION 'authenticated_email_required';
    END IF;

    SELECT * INTO candidate_profile
    FROM public.job_seeker_profiles AS p
    WHERE p.user_id = (SELECT auth.uid())
    LIMIT 1;
    IF candidate_profile.id IS NULL THEN
      RAISE EXCEPTION 'candidate_profile_required';
    END IF;

    SELECT j.recruiter_id INTO derived_recruiter_id
    FROM public.jobs AS j
    WHERE j.id = NEW.job_id;
    IF derived_recruiter_id IS NULL THEN
      RAISE EXCEPTION 'application_job_required';
    END IF;

    SELECT NULLIF(BTRIM(item.value ->> 'company'), '') INTO derived_company
    FROM jsonb_array_elements(
      COALESCE(candidate_profile.resume_structured -> 'sections', '[]'::JSONB)
    ) AS section(value)
    CROSS JOIN LATERAL jsonb_array_elements(
      COALESCE(section.value -> 'items', '[]'::JSONB)
    ) AS item(value)
    WHERE LOWER(COALESCE(section.value ->> 'title', '')) ~
      '(work|experience|employment)'
    LIMIT 1;

    candidate_name := COALESCE(
      NULLIF(BTRIM(candidate_profile.full_name), ''),
      NULLIF(BTRIM(candidate_profile.resume_structured -> 'general' ->> 'name'), ''),
      split_part(authenticated_email, '@', 1),
      'Candidate'
    );

    NEW.candidate_user_id := (SELECT auth.uid());
    NEW.recruiter_id := derived_recruiter_id;
    NEW.candidate_email := authenticated_email;
    NEW.candidate_name := candidate_name;
    NEW.candidate_phone := NULLIF(BTRIM(candidate_profile.phone), '');
    NEW.linkedin_url := CASE
      WHEN public.is_safe_linkedin_profile_url(candidate_profile.linkedin_url)
        THEN BTRIM(candidate_profile.linkedin_url)
      ELSE NULL
    END;
    NEW.current_company := derived_company;
    NEW.resume_url := CASE
      WHEN public.is_safe_https_url(candidate_profile.portfolio_url)
        THEN BTRIM(candidate_profile.portfolio_url)
      ELSE NULL
    END;
    NEW.resume_storage_path := CASE
      WHEN candidate_profile.resume_storage_path ~ (
        '^' || (SELECT auth.uid())::TEXT || '/resume\.(pdf|doc|docx)$'
      ) THEN candidate_profile.resume_storage_path
      ELSE NULL
    END;
    NEW.resume_structured_snapshot := candidate_profile.resume_structured;
    NEW.status := 'new';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_application_candidate_identity()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS applications_enforce_candidate_identity ON public.applications;
CREATE TRIGGER applications_enforce_candidate_identity
BEFORE INSERT ON public.applications FOR EACH ROW
EXECUTE FUNCTION public.enforce_application_candidate_identity();
