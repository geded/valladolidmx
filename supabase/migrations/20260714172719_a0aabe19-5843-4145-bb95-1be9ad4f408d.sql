
-- Bucket media-original: sólo lectura para admins; escritura sólo service_role
DROP POLICY IF EXISTS "media-original admins read" ON storage.objects;
CREATE POLICY "media-original admins read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media-original'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'editor'::app_role)
    )
  );

-- Bucket media-derived: sólo lectura para admins; escritura sólo service_role
DROP POLICY IF EXISTS "media-derived admins read" ON storage.objects;
CREATE POLICY "media-derived admins read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'media-derived'
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'editor'::app_role)
    )
  );
-- Nota: no se crean policies de INSERT/UPDATE/DELETE para authenticated.
-- service_role bypassa RLS y es el único con capacidad de escritura durante M0.
