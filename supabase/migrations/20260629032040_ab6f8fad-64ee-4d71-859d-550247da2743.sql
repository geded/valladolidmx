
-- =========================================================
-- BLOQUE C — IDENTITY & PERMISSIONS (13.3)
-- =========================================================

-- 1. ENUMS ------------------------------------------------
CREATE TYPE public.app_role AS ENUM (
  'traveler','business_owner','concierge','editor','admin','super_admin'
);

CREATE TYPE public.business_user_role AS ENUM (
  'owner','manager','editor','viewer'
);

CREATE TYPE public.invitation_status AS ENUM (
  'pending','accepted','revoked','expired'
);

CREATE TYPE public.membership_status AS ENUM (
  'active','suspended','removed'
);

-- 2. PROFILES ---------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  country TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'es',
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. USER_ROLES -------------------------------------------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  scope_type TEXT,             -- 'business','destination', NULL = global
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, role, scope_type, scope_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 4. SECURITY DEFINER FUNCTIONS ---------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_editor_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('editor','admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_concierge(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('concierge','admin','super_admin')
  );
$$;

-- 5. TRAVELER PROFILES ------------------------------------
CREATE TABLE public.traveler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_style TEXT,
  budget_range TEXT,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_language TEXT DEFAULT 'es',
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  trip_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.traveler_profiles TO authenticated;
GRANT ALL ON public.traveler_profiles TO service_role;
ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_traveler_profiles_updated_at BEFORE UPDATE ON public.traveler_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. BUSINESS_USERS ---------------------------------------
CREATE TABLE public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.business_user_role NOT NULL DEFAULT 'viewer',
  status public.membership_status NOT NULL DEFAULT 'active',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_users TO authenticated;
GRANT ALL ON public.business_users TO service_role;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_business_users_user ON public.business_users(user_id);
CREATE INDEX idx_business_users_business ON public.business_users(business_id);
CREATE TRIGGER trg_business_users_updated_at BEFORE UPDATE ON public.business_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.has_business_access(
  _user_id UUID, _business_id UUID, _min_role public.business_user_role DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND status = 'active'
      AND CASE _min_role
        WHEN 'viewer' THEN role IN ('viewer','editor','manager','owner')
        WHEN 'editor' THEN role IN ('editor','manager','owner')
        WHEN 'manager' THEN role IN ('manager','owner')
        WHEN 'owner' THEN role = 'owner'
      END
  ) OR public.is_admin(_user_id);
$$;

-- 7. CONCIERGE PROFILES -----------------------------------
CREATE TABLE public.concierge_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  languages JSONB NOT NULL DEFAULT '["es"]'::jsonb,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  max_active_requests INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.concierge_profiles TO authenticated;
GRANT ALL ON public.concierge_profiles TO service_role;
ALTER TABLE public.concierge_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_concierge_profiles_updated_at BEFORE UPDATE ON public.concierge_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stub para is_concierge_assigned: tabla de asignaciones real llega en Bloque D/E.
-- Por ahora valida que el usuario tenga rol 'concierge' y _request_id no sea NULL.
CREATE OR REPLACE FUNCTION public.is_concierge_assigned(_user_id UUID, _request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_concierge(_user_id) AND _request_id IS NOT NULL;
$$;

-- 8. ADMIN PROFILES ---------------------------------------
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT,
  permission_level TEXT NOT NULL DEFAULT 'standard',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. INVITATIONS ------------------------------------------
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role public.app_role NOT NULL,
  scope_type TEXT,
  scope_id UUID,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. PERMISSIONS AUDIT LOG -------------------------------
CREATE TABLE public.permissions_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  role public.app_role,
  scope_type TEXT,
  scope_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions_audit_log TO authenticated;
GRANT ALL ON public.permissions_audit_log TO service_role;
ALTER TABLE public.permissions_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_perm_audit_target ON public.permissions_audit_log(target_user_id);
CREATE INDEX idx_perm_audit_actor ON public.permissions_audit_log(actor_user_id);

-- Trigger de auditoría sobre user_roles
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.permissions_audit_log(actor_user_id, target_user_id, action, role, scope_type, scope_id)
    VALUES (NEW.created_by, NEW.user_id, 'role_granted', NEW.role, NEW.scope_type, NEW.scope_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.permissions_audit_log(actor_user_id, target_user_id, action, role, scope_type, scope_id)
    VALUES (auth.uid(), OLD.user_id, 'role_revoked', OLD.role, OLD.scope_type, OLD.scope_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

-- 11. AUTO-CREATE PROFILE + TRAVELER ROLE -----------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.traveler_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'traveler')
  ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 12. RLS POLICIES — Identity tables
-- =========================================================

-- profiles
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles self insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles admin manage" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "user_roles self read" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles admin manage" ON public.user_roles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- traveler_profiles
CREATE POLICY "traveler self read" ON public.traveler_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "traveler self upsert" ON public.traveler_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "traveler self update" ON public.traveler_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- business_users
CREATE POLICY "business_users member read" ON public.business_users
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_business_access(auth.uid(), business_id, 'manager') OR public.is_admin(auth.uid()));
CREATE POLICY "business_users owner manage" ON public.business_users
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'owner') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'owner') OR public.is_admin(auth.uid()));

-- concierge_profiles
CREATE POLICY "concierge self read" ON public.concierge_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "concierge self update" ON public.concierge_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "concierge admin manage" ON public.concierge_profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- admin_profiles
CREATE POLICY "admin_profiles self read" ON public.admin_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "admin_profiles admin manage" ON public.admin_profiles
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- invitations
CREATE POLICY "invitations admin manage" ON public.invitations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "invitations business owner manage" ON public.invitations
  FOR ALL TO authenticated
  USING (scope_type = 'business' AND public.has_business_access(auth.uid(), scope_id, 'owner'))
  WITH CHECK (scope_type = 'business' AND public.has_business_access(auth.uid(), scope_id, 'owner'));

-- permissions_audit_log
CREATE POLICY "audit admin read" ON public.permissions_audit_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- =========================================================
-- 13. WIRE BLOQUE B — FKs y políticas de escritura
-- =========================================================

-- FKs hacia auth.users sobre campos editoriales (sin enforcement estricto: SET NULL).
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_author_user_id_fk
  FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Helper para políticas de escritura editorial (geo + editorial)
-- editores/admins pueden gestionar todo el contenido editorial geográfico.

-- countries / states / tourism_regions / destinations / destination_zones / points_of_interest
CREATE POLICY "geo editor manage countries" ON public.countries
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "geo editor manage states" ON public.states
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "geo editor manage regions" ON public.tourism_regions
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "geo editor manage destinations" ON public.destinations
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "geo editor manage zones" ON public.destination_zones
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "geo editor manage poi" ON public.points_of_interest
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- business_categories
CREATE POLICY "categories editor manage" ON public.business_categories
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- businesses + relacionadas: dueños/managers de la empresa + admins
CREATE POLICY "businesses owner manage" ON public.businesses
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_locations owner manage" ON public.business_locations
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_contacts owner manage" ON public.business_contacts
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_hours owner manage" ON public.business_hours
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_social owner manage" ON public.business_social_links
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_media owner manage" ON public.business_media
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "business_category_links owner manage" ON public.business_category_links
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

-- products + product_media
CREATE POLICY "products owner manage" ON public.products
  FOR ALL TO authenticated
  USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_admin(auth.uid()));

CREATE POLICY "product_media owner manage" ON public.product_media
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
      AND (public.has_business_access(auth.uid(), p.business_id, 'editor') OR public.is_admin(auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
      AND (public.has_business_access(auth.uid(), p.business_id, 'editor') OR public.is_admin(auth.uid()))
  ));

-- media_assets: editores/admins + dueños del scope business
CREATE POLICY "media_assets editor manage" ON public.media_assets
  FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- reviews: el autor gestiona la suya, admins moderan.
CREATE POLICY "reviews author insert" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_user_id);
CREATE POLICY "reviews author update" ON public.reviews
  FOR UPDATE TO authenticated USING (auth.uid() = author_user_id) WITH CHECK (auth.uid() = author_user_id);
CREATE POLICY "reviews admin manage" ON public.reviews
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- translations: editores/admins
CREATE POLICY "translations editor manage" ON public.translations
  FOR ALL TO authenticated USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- =========================================================
-- 14. STORAGE POLICIES por rol/bucket
-- =========================================================

-- Admins/editores escriben en buckets editoriales globales
CREATE POLICY "storage editor write editorial"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('logos','hero','destinations','gallery')
    AND public.is_editor_or_admin(auth.uid())
  );
CREATE POLICY "storage editor update editorial"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('logos','hero','destinations','gallery') AND public.is_editor_or_admin(auth.uid()))
  WITH CHECK (bucket_id IN ('logos','hero','destinations','gallery') AND public.is_editor_or_admin(auth.uid()));
CREATE POLICY "storage editor delete editorial"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('logos','hero','destinations','gallery') AND public.is_editor_or_admin(auth.uid()));

-- Companies / products: dueños de la empresa escriben a su prefijo {business_id}/...
CREATE POLICY "storage business write companies"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('companies','products')
    AND (
      public.is_admin(auth.uid())
      OR public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid, 'editor')
    )
  );
CREATE POLICY "storage business update companies"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('companies','products')
    AND (
      public.is_admin(auth.uid())
      OR public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid, 'editor')
    )
  )
  WITH CHECK (
    bucket_id IN ('companies','products')
    AND (
      public.is_admin(auth.uid())
      OR public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid, 'editor')
    )
  );
CREATE POLICY "storage business delete companies"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('companies','products')
    AND (
      public.is_admin(auth.uid())
      OR public.has_business_access(auth.uid(), ((storage.foldername(name))[1])::uuid, 'manager')
    )
  );

-- documents: solo admins
CREATE POLICY "storage admin write documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.is_admin(auth.uid()));
CREATE POLICY "storage admin read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));
CREATE POLICY "storage admin manage documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'documents' AND public.is_admin(auth.uid()));
CREATE POLICY "storage admin delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.is_admin(auth.uid()));

-- temporary: cada usuario escribe en su carpeta {auth.uid}/...
CREATE POLICY "storage user write temporary"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'temporary' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "storage user read temporary"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'temporary' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
CREATE POLICY "storage user delete temporary"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'temporary' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
