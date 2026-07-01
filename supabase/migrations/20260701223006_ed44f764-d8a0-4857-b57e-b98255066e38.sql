
-- 1) Añadir role_id a user_roles para soportar roles personalizados
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles_catalog(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON public.user_roles(role_id);

-- 2) Actualizar has_permission para reconocer roles personalizados vía role_id
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles_catalog rc
        ON rc.id = ur.role_id
        OR rc.system_role = ur.role
      JOIN public.role_permissions rp ON rp.role_id = rc.id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id
        AND p.key = _permission_key
    );
$$;

-- 3) has_any_permission
CREATE OR REPLACE FUNCTION public.has_any_permission(_user_id uuid, _keys text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles_catalog rc
        ON rc.id = ur.role_id
        OR rc.system_role = ur.role
      JOIN public.role_permissions rp ON rp.role_id = rc.id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id
        AND p.key = ANY(_keys)
    );
$$;

-- ============ DESTINOS Y TERRITORIO ============
CREATE POLICY "destinations_perm_write" ON public.destinations
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'destinations.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'destinations.write'));

CREATE POLICY "destination_zones_perm_write" ON public.destination_zones
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'destinations.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'destinations.write'));

CREATE POLICY "poi_perm_write" ON public.points_of_interest
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'poi.write'));

CREATE POLICY "countries_perm_write" ON public.countries
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'destinations.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'destinations.write'));

CREATE POLICY "states_perm_write" ON public.states
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'destinations.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'destinations.write'));

CREATE POLICY "tourism_regions_perm_write" ON public.tourism_regions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'destinations.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'destinations.write'));

-- ============ EDITORIAL ============
CREATE POLICY "articles_perm_write" ON public.articles
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.articles.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.articles.write'));

CREATE POLICY "banners_perm_write" ON public.banners
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.banners.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.banners.write'));

CREATE POLICY "faqs_perm_write" ON public.faqs
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.faqs.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.faqs.write'));

CREATE POLICY "editorial_routes_perm_write" ON public.editorial_routes
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.routes.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.routes.write'));

CREATE POLICY "events_perm_write" ON public.events
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.articles.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.articles.write'));

CREATE POLICY "page_compositions_perm_write" ON public.page_compositions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.pages.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.pages.write'));

CREATE POLICY "page_revisions_perm_write" ON public.page_revisions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.pages.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.pages.write'));

CREATE POLICY "media_assets_perm_write" ON public.media_assets
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.media.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.media.write'));

-- ============ EMPRESAS Y CATALOGO ============
CREATE POLICY "businesses_perm_write" ON public.businesses
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'businesses.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'businesses.write'));

CREATE POLICY "products_perm_write" ON public.products
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'products.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'products.write'));

CREATE POLICY "promotions_perm_write" ON public.promotions
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'businesses.write'))
  WITH CHECK (public.has_permission(auth.uid(), 'businesses.write'));

-- ============ RESEÑAS ============
CREATE POLICY "reviews_perm_moderate" ON public.reviews
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'reviews.moderate'))
  WITH CHECK (public.has_permission(auth.uid(), 'reviews.moderate'));

-- ============ FINANZAS (sólo lectura) ============
CREATE POLICY "orders_perm_finance_read" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.orders.read'));

CREATE POLICY "order_items_perm_finance_read" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.orders.read'));

CREATE POLICY "order_events_perm_finance_read" ON public.order_events
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.orders.read'));

CREATE POLICY "payment_events_perm_finance_read" ON public.payment_events
  FOR SELECT TO authenticated
  USING (public.has_permission(auth.uid(), 'finance.payments.read'));
