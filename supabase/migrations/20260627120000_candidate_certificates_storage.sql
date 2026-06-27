-- Public candidate certificate files (images/PDF): readable via public URL; writes scoped to auth.uid() folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "certificates_select_public" ON storage.objects;

DROP POLICY IF EXISTS "certificates_insert_own" ON storage.objects;

DROP POLICY IF EXISTS "certificates_update_own" ON storage.objects;

DROP POLICY IF EXISTS "certificates_delete_own" ON storage.objects;

-- Public read (bucket is public; explicit policy keeps behavior clear if defaults change).
CREATE POLICY "certificates_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates');

CREATE POLICY "certificates_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "certificates_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "certificates_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);
