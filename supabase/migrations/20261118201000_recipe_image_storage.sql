INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-images', 'recipe-images', true, 12582912, ARRAY['image/webp', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS recipe_images_public_read ON storage.objects;
CREATE POLICY recipe_images_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

DROP POLICY IF EXISTS recipe_images_admin_insert ON storage.objects;
CREATE POLICY recipe_images_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images' AND public.is_admin());

DROP POLICY IF EXISTS recipe_images_admin_update ON storage.objects;
CREATE POLICY recipe_images_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'recipe-images' AND public.is_admin());

DROP POLICY IF EXISTS recipe_images_admin_delete ON storage.objects;
CREATE POLICY recipe_images_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND public.is_admin());
