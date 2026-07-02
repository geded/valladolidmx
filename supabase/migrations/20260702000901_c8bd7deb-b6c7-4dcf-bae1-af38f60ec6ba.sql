
-- 1) Storage: excluir bucket "documents" de INSERT permisivo (dejar solo admin)
DROP POLICY IF EXISTS "phase1_authenticated_insert" ON storage.objects;
CREATE POLICY "phase1_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('logos','hero','destinations','companies','products','gallery','temporary')
    AND owner = auth.uid()
  );

-- 2) Storage: lectura pública solo si media_assets asociada está publicada y no borrada
DROP POLICY IF EXISTS "phase1_public_read_display_buckets" ON storage.objects;
CREATE POLICY "phase1_public_read_display_buckets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('logos','hero','destinations','companies','products','gallery')
    AND EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.storage_bucket = storage.objects.bucket_id
        AND ma.storage_path = storage.objects.name
        AND ma.status = 'published'
        AND ma.deleted_at IS NULL
    )
  );

-- Los owners autenticados siguen pudiendo leer sus propios archivos aunque
-- aún no estén registrados como published (por ejemplo, mientras suben).
CREATE POLICY "phase1_owner_read_display_buckets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('logos','hero','destinations','companies','products','gallery')
    AND owner = auth.uid()
  );

-- 3) Ocultar catálogo interno de roles/permisos a usuarios normales
DROP POLICY IF EXISTS "authenticated can read permissions" ON public.permissions;
CREATE POLICY "staff can read permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "authenticated can read roles_catalog" ON public.roles_catalog;
CREATE POLICY "staff can read roles_catalog"
  ON public.roles_catalog FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

DROP POLICY IF EXISTS "authenticated can read role_permissions" ON public.role_permissions;
CREATE POLICY "staff can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 4) Revocar EXECUTE de anon en todas las SECURITY DEFINER de public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
                   r.proname, r.args);
  END LOOP;
END $$;
