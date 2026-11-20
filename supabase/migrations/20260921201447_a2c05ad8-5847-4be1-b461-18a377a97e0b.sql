DROP POLICY IF EXISTS "businesses owner manage" ON public.businesses;
CREATE POLICY "businesses owner manage" ON public.businesses FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "business_hours owner manage" ON public.business_hours;
CREATE POLICY "business_hours owner manage" ON public.business_hours FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "business_contacts owner manage" ON public.business_contacts;
CREATE POLICY "business_contacts owner manage" ON public.business_contacts FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "business_social owner manage" ON public.business_social_links;
CREATE POLICY "business_social owner manage" ON public.business_social_links FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "business_media owner manage" ON public.business_media;
CREATE POLICY "business_media owner manage" ON public.business_media FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "business_category_links owner manage" ON public.business_category_links;
CREATE POLICY "business_category_links owner manage" ON public.business_category_links FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "products owner manage" ON public.products;
CREATE POLICY "products owner manage" ON public.products FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "product_media owner manage" ON public.product_media;
CREATE POLICY "product_media owner manage" ON public.product_media FOR ALL TO authenticated
USING (
  public.is_editor_or_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id
    AND public.has_business_access(auth.uid(), p.business_id, 'editor'))
)
WITH CHECK (
  public.is_editor_or_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id
    AND public.has_business_access(auth.uid(), p.business_id, 'editor'))
);