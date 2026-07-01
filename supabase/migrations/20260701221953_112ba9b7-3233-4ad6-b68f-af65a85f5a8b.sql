
-- Asegurar función util (por si no existe con esa firma)
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. permissions
CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  resource text NOT NULL,
  action text NOT NULL,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  is_dangerous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin manages permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "authenticated can read permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

-- 2. roles_catalog
CREATE TABLE public.roles_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#64748b',
  icon text,
  is_system boolean NOT NULL DEFAULT false,
  system_role app_role,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.roles_catalog TO authenticated;
GRANT ALL ON public.roles_catalog TO service_role;
ALTER TABLE public.roles_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin manages roles_catalog"
  ON public.roles_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "authenticated can read roles_catalog"
  ON public.roles_catalog FOR SELECT TO authenticated
  USING (true);

-- 3. role_permissions
CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles_catalog(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (role_id, permission_id)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin manages role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "authenticated can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- 4. updated_at trigger
CREATE TRIGGER roles_catalog_updated_at
  BEFORE UPDATE ON public.roles_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 5. Protección de roles de sistema
CREATE OR REPLACE FUNCTION public.protect_system_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system THEN
    RAISE EXCEPTION 'No se puede eliminar un rol de sistema (%).', OLD.slug;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_system THEN
    IF NEW.slug IS DISTINCT FROM OLD.slug
       OR NEW.is_system IS DISTINCT FROM OLD.is_system
       OR NEW.system_role IS DISTINCT FROM OLD.system_role THEN
      RAISE EXCEPTION 'No se pueden modificar slug/is_system/system_role de un rol de sistema.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER protect_system_roles_trg
  BEFORE UPDATE OR DELETE ON public.roles_catalog
  FOR EACH ROW EXECUTE FUNCTION public.protect_system_roles();

-- 6. has_permission
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
      JOIN public.roles_catalog rc ON rc.system_role = ur.role
      JOIN public.role_permissions rp ON rp.role_id = rc.id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = _user_id
        AND p.key = _permission_key
    );
$$;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated, anon;

-- 7. Seed permisos
INSERT INTO public.permissions (key, resource, action, category, label, description, is_dangerous) VALUES
  ('destinations.read',        'destinations',       'read',    'Destinos y territorio', 'Ver destinos',                     'Ver el catálogo de destinos, zonas y regiones', false),
  ('destinations.write',       'destinations',       'write',   'Destinos y territorio', 'Editar destinos',                  'Crear y editar destinos, zonas turísticas, estados, países', false),
  ('destinations.publish',     'destinations',       'publish', 'Destinos y territorio', 'Publicar destinos',                'Cambiar el estado de publicación de destinos', false),
  ('destinations.delete',      'destinations',       'delete',  'Destinos y territorio', 'Eliminar destinos',                'Eliminar destinos del catálogo', true),
  ('poi.write',                'points_of_interest', 'write',   'Destinos y territorio', 'Editar puntos de interés',         'Crear y editar puntos de interés turísticos', false),
  ('businesses.read',          'businesses',         'read',    'Empresas y catálogo',   'Ver empresas',                     'Ver el listado de empresas registradas', false),
  ('businesses.write',         'businesses',         'write',   'Empresas y catálogo',   'Editar empresas',                  'Crear y editar fichas de empresas', false),
  ('businesses.approve',       'businesses',         'approve', 'Empresas y catálogo',   'Aprobar empresas',                 'Aprobar o rechazar solicitudes de alta', false),
  ('businesses.delete',        'businesses',         'delete',  'Empresas y catálogo',   'Eliminar empresas',                'Eliminar empresas del sistema', true),
  ('products.read',            'products',           'read',    'Empresas y catálogo',   'Ver productos',                    'Ver el catálogo de productos y experiencias', false),
  ('products.write',           'products',           'write',   'Empresas y catálogo',   'Editar productos',                 'Crear y editar productos y experiencias', false),
  ('products.publish',         'products',           'publish', 'Empresas y catálogo',   'Publicar productos',               'Publicar o despublicar productos', false),
  ('content.articles.write',   'articles',           'write',   'Editorial',             'Editar artículos',                 'Crear y editar artículos del blog editorial', false),
  ('content.articles.publish', 'articles',           'publish', 'Editorial',             'Publicar artículos',               'Publicar o despublicar artículos editoriales', false),
  ('content.faqs.write',       'faqs',               'write',   'Editorial',             'Editar preguntas frecuentes',      'Crear y editar el catálogo de FAQs', false),
  ('content.banners.write',    'banners',            'write',   'Editorial',             'Editar banners',                   'Crear y editar banners y anuncios del sitio', false),
  ('content.routes.write',     'editorial_routes',   'write',   'Editorial',             'Editar rutas editoriales',         'Crear y editar rutas editoriales curadas', false),
  ('content.pages.write',      'pages',              'write',   'Editorial',             'Editar páginas',                   'Editar páginas del sitio (Experience Builder)', false),
  ('content.pages.publish',    'pages',              'publish', 'Editorial',             'Publicar páginas',                 'Publicar páginas al sitio en vivo', false),
  ('content.media.write',      'media_assets',       'write',   'Editorial',             'Gestionar biblioteca de medios',   'Subir y gestionar imágenes y archivos', false),
  ('reviews.moderate',         'reviews',            'moderate','Reseñas y moderación',  'Moderar reseñas',                  'Aprobar, ocultar o eliminar reseñas', false),
  ('reviews.delete',           'reviews',            'delete',  'Reseñas y moderación',  'Eliminar reseñas',                 'Eliminar reseñas permanentemente', true),
  ('finance.orders.read',      'orders',             'read',    'Finanzas',              'Ver pedidos',                      'Ver el listado y detalle de pedidos', false),
  ('finance.payments.read',    'payment_events',     'read',    'Finanzas',              'Ver pagos',                        'Ver el historial de eventos de pago', false),
  ('finance.reports.read',     'finance',            'read',    'Finanzas',              'Ver reportes financieros',         'Acceso a dashboards y reportes de ingresos', false),
  ('finance.export',           'finance',            'export',  'Finanzas',              'Exportar datos financieros',       'Descargar reportes contables en CSV/Excel', false),
  ('concierge.cases.read',     'concierge_cases',    'read',    'Concierge',             'Ver casos de concierge',           'Ver casos asignados y del equipo', false),
  ('concierge.cases.write',    'concierge_cases',    'write',   'Concierge',             'Gestionar casos de concierge',     'Crear, editar y responder casos', false),
  ('concierge.cases.assign',   'concierge_cases',    'assign',  'Concierge',             'Asignar casos',                    'Reasignar casos entre agentes', false),
  ('users.read',               'users',              'read',    'Sistema',               'Ver usuarios',                     'Ver el listado de usuarios de la plataforma', false),
  ('users.invite',             'users',              'invite',  'Sistema',               'Invitar usuarios',                 'Enviar invitaciones a nuevos usuarios', false),
  ('users.edit',               'users',              'edit',    'Sistema',               'Editar usuarios',                  'Modificar email, contraseña y perfil de usuarios', true),
  ('users.delete',             'users',              'delete',  'Sistema',               'Eliminar usuarios',                'Eliminar cuentas de usuario', true),
  ('roles.assign',             'roles',              'assign',  'Sistema',               'Asignar roles a usuarios',         'Añadir o quitar roles a usuarios existentes', false),
  ('roles.manage',             'roles',              'manage',  'Sistema',               'Gestionar catálogo de roles',      'Crear, editar y eliminar roles y sus permisos', true),
  ('audit.read',               'audit',              'read',    'Sistema',               'Ver auditoría',                    'Ver el historial de acciones administrativas', false);

-- 8. Seed roles
INSERT INTO public.roles_catalog (slug, name, description, color, icon, is_system, system_role, sort_order) VALUES
  ('super_admin',    'Super administrador', 'Acceso total a la plataforma. No se puede eliminar.',           '#dc2626', 'shield-check',  true, 'super_admin',    10),
  ('admin',          'Administrador',       'Gestión operativa completa salvo configuración crítica.',       '#ea580c', 'shield',        true, 'admin',          20),
  ('editor',         'Editor',              'Edición de contenido editorial, destinos y catálogo.',          '#0284c7', 'edit-3',        true, 'editor',         30),
  ('concierge_lead', 'Líder de concierge',  'Coordina al equipo de concierge y reasigna casos.',             '#7c3aed', 'headphones',    true, 'concierge_lead', 40),
  ('concierge',      'Concierge',           'Atiende y gestiona casos de viajeros.',                          '#8b5cf6', 'headset',       true, 'concierge',      50),
  ('business_owner', 'Empresa',             'Propietario o representante de una ficha de empresa.',           '#059669', 'store',         true, 'business_owner', 60),
  ('traveler',       'Viajero',             'Usuario final de la plataforma. Rol asignado automáticamente.', '#64748b', 'user',          true, 'traveler',       70);

-- 9. Seed role_permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rc.id, p.id FROM public.roles_catalog rc CROSS JOIN public.permissions p
WHERE rc.slug = 'admin' AND p.key <> 'roles.manage';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rc.id, p.id FROM public.roles_catalog rc
JOIN public.permissions p ON p.key IN (
  'destinations.read','destinations.write','destinations.publish','poi.write',
  'businesses.read','businesses.write',
  'products.read','products.write','products.publish',
  'content.articles.write','content.articles.publish',
  'content.faqs.write','content.banners.write','content.routes.write',
  'content.pages.write','content.pages.publish','content.media.write'
) WHERE rc.slug = 'editor';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rc.id, p.id FROM public.roles_catalog rc
JOIN public.permissions p ON p.key IN (
  'concierge.cases.read','concierge.cases.write','concierge.cases.assign',
  'businesses.read','destinations.read','products.read'
) WHERE rc.slug = 'concierge_lead';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rc.id, p.id FROM public.roles_catalog rc
JOIN public.permissions p ON p.key IN (
  'concierge.cases.read','concierge.cases.write',
  'businesses.read','destinations.read','products.read'
) WHERE rc.slug = 'concierge';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT rc.id, p.id FROM public.roles_catalog rc
JOIN public.permissions p ON p.key IN (
  'businesses.read','businesses.write','products.read','products.write'
) WHERE rc.slug = 'business_owner';
