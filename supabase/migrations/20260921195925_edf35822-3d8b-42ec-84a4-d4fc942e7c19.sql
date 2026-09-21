GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_locations TO authenticated;
GRANT ALL ON public.business_locations TO service_role;

DROP POLICY IF EXISTS "business_locations owner manage" ON public.business_locations;
CREATE POLICY "business_locations owner manage"
ON public.business_locations
FOR ALL
TO authenticated
USING (
  public.has_business_access(auth.uid(), business_id, 'editor')
  OR public.is_editor_or_admin(auth.uid())
)
WITH CHECK (
  public.has_business_access(auth.uid(), business_id, 'editor')
  OR public.is_editor_or_admin(auth.uid())
);