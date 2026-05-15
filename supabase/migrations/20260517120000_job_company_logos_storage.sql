-- Company logos on recruiter job listings: public read; writes scoped to owning recruiter folder.

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS company_logo TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-logos', 'job-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "job_logos_select_public" ON storage.objects;

DROP POLICY IF EXISTS "job_logos_insert_own" ON storage.objects;

DROP POLICY IF EXISTS "job_logos_update_own" ON storage.objects;

DROP POLICY IF EXISTS "job_logos_delete_own" ON storage.objects;

CREATE POLICY "job_logos_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-logos');

CREATE POLICY "job_logos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id::text = (storage.foldername (name))[1]
      AND r.user_id = auth.uid ()
  )
);

CREATE POLICY "job_logos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id::text = (storage.foldername (name))[1]
      AND r.user_id = auth.uid ()
  )
);

CREATE POLICY "job_logos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-logos'
  AND EXISTS (
    SELECT 1
    FROM public.recruiters r
    WHERE
      r.id::text = (storage.foldername (name))[1]
      AND r.user_id = auth.uid ()
  )
);
