-- G8-Q2A · Snapshot de políticas previas de public.points_of_interest
-- Capturado en HEAD 180df4ff15e6a4a3b689aa519996ad41c4bb6a06, antes de la migración.
-- Uso exclusivo: rollback reversible.

CREATE POLICY "geo editor manage poi" ON public.points_of_interest
  FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE POLICY "poi_perm_write" ON public.points_of_interest
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'poi.write'));

CREATE POLICY "poi_public_read" ON public.points_of_interest
  FOR SELECT TO anon, authenticated
  USING (status = 'published'::content_status AND deleted_at IS NULL);

-- Rollback aditivo e idempotente de la reconciliación:
--   DROP POLICY IF EXISTS "poi_staff_write" ON public.points_of_interest;
--   -- y volver a ejecutar las dos políticas de escritura anteriores.
-- El resto del cambio es puramente aditivo: DROP de las tablas place_* y de las
-- columnas añadidas restaura el estado previo sin tocar datos turísticos.
