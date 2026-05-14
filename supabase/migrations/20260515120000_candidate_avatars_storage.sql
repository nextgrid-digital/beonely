-- Public candidate profile photos: readable via public URL for img tags; writes scoped to auth.uid() folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;

-- Public read (bucket is public; explicit policy keeps behavior clear if defaults change).
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername (name))[1] = (select auth.uid())::text
);
