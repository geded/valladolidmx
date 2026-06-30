
-- =========================================================================
-- Etapa 15.10.4b · Fase 1 — Experience Builder editorial (fix: super_admin)
-- =========================================================================

DO $$ BEGIN
  CREATE TYPE public.eb_scope AS ENUM ('global', 'tenant', 'marketplace');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.eb_page_kind AS ENUM ('landing','institutional','campaign','site_section');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.eb_publish_status AS ENUM ('draft','in_review','published','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.eb_audit_action AS ENUM (
    'create','update','clone','publish','unpublish','restore','delete','preview_issue'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.eb_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.eb_can_edit_scope(
  _scope public.eb_scope, _tenant_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.has_role(uid, 'super_admin'::public.app_role) THEN RETURN true; END IF;
  IF public.has_role(uid, 'admin'::public.app_role) THEN RETURN true; END IF;
  IF _scope = 'tenant' AND _tenant_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.user_id = uid AND bu.business_id = _tenant_id
    );
  END IF;
  RETURN false;
END $$;

-- THEMES ------------------------------------------------------------------
CREATE TABLE public.eb_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.eb_scope NOT NULL DEFAULT 'tenant',
  tenant_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  tokens jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eb_themes_scope_tenant_chk CHECK (
    (scope = 'tenant' AND tenant_id IS NOT NULL) OR
    (scope <> 'tenant' AND tenant_id IS NULL)
  ),
  UNIQUE (scope, tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_themes TO authenticated;
GRANT ALL ON public.eb_themes TO service_role;
GRANT SELECT ON public.eb_themes TO anon;
ALTER TABLE public.eb_themes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER eb_themes_touch BEFORE UPDATE ON public.eb_themes
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_updated_at();
CREATE POLICY eb_themes_read_public ON public.eb_themes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY eb_themes_write_editor ON public.eb_themes
  FOR ALL TO authenticated
  USING (public.eb_can_edit_scope(scope, tenant_id))
  WITH CHECK (public.eb_can_edit_scope(scope, tenant_id));

-- TEMPLATES ---------------------------------------------------------------
CREATE TABLE public.eb_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.eb_scope NOT NULL DEFAULT 'global',
  tenant_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category text,
  cover_url text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  navigation jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme_id uuid REFERENCES public.eb_themes(id) ON DELETE SET NULL,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  version text NOT NULL DEFAULT '1.0.0',
  status public.eb_publish_status NOT NULL DEFAULT 'draft',
  is_listed boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eb_templates_scope_tenant_chk CHECK (
    (scope = 'tenant' AND tenant_id IS NOT NULL) OR
    (scope <> 'tenant' AND tenant_id IS NULL)
  ),
  UNIQUE (scope, tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_templates TO authenticated;
GRANT ALL ON public.eb_templates TO service_role;
GRANT SELECT ON public.eb_templates TO anon;
ALTER TABLE public.eb_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER eb_templates_touch BEFORE UPDATE ON public.eb_templates
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_updated_at();
CREATE POLICY eb_templates_read_public ON public.eb_templates
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.eb_can_edit_scope(scope, tenant_id));
CREATE POLICY eb_templates_write_editor ON public.eb_templates
  FOR ALL TO authenticated
  USING (public.eb_can_edit_scope(scope, tenant_id))
  WITH CHECK (public.eb_can_edit_scope(scope, tenant_id));

-- SECTIONS ----------------------------------------------------------------
CREATE TABLE public.eb_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.eb_scope NOT NULL DEFAULT 'tenant',
  tenant_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  tree jsonb NOT NULL DEFAULT '{"root":{"children":[]}}'::jsonb,
  current_version_id uuid,
  status public.eb_publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eb_sections_scope_tenant_chk CHECK (
    (scope = 'tenant' AND tenant_id IS NOT NULL) OR
    (scope <> 'tenant' AND tenant_id IS NULL)
  ),
  UNIQUE (scope, tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_sections TO authenticated;
GRANT ALL ON public.eb_sections TO service_role;
GRANT SELECT ON public.eb_sections TO anon;
ALTER TABLE public.eb_sections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER eb_sections_touch BEFORE UPDATE ON public.eb_sections
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_updated_at();
CREATE POLICY eb_sections_read_public ON public.eb_sections
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.eb_can_edit_scope(scope, tenant_id));
CREATE POLICY eb_sections_write_editor ON public.eb_sections
  FOR ALL TO authenticated
  USING (public.eb_can_edit_scope(scope, tenant_id))
  WITH CHECK (public.eb_can_edit_scope(scope, tenant_id));

CREATE TABLE public.eb_section_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.eb_sections(id) ON DELETE CASCADE,
  tree jsonb NOT NULL,
  note text,
  parent_version_id uuid REFERENCES public.eb_section_versions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eb_section_versions TO authenticated;
GRANT ALL ON public.eb_section_versions TO service_role;
ALTER TABLE public.eb_section_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb_section_versions_read ON public.eb_section_versions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.eb_sections s
      WHERE s.id = section_id AND public.eb_can_edit_scope(s.scope, s.tenant_id))
  );

-- PAGES -------------------------------------------------------------------
CREATE TABLE public.eb_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.eb_scope NOT NULL DEFAULT 'tenant',
  tenant_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.eb_page_kind NOT NULL DEFAULT 'landing',
  name text NOT NULL,
  slug text NOT NULL,
  theme_id uuid REFERENCES public.eb_themes(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.eb_templates(id) ON DELETE SET NULL,
  tree jsonb NOT NULL DEFAULT '{"root":{"children":[]}}'::jsonb,
  current_version_id uuid,
  published_version_id uuid,
  status public.eb_publish_status NOT NULL DEFAULT 'draft',
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  open_graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  schema_org jsonb NOT NULL DEFAULT '{}'::jsonb,
  marketing jsonb NOT NULL DEFAULT '{}'::jsonb,
  conversion jsonb NOT NULL DEFAULT '{}'::jsonb,
  experiments jsonb NOT NULL DEFAULT '{}'::jsonb,
  cache jsonb NOT NULL DEFAULT '{"strategy":"swr","ttl":300}'::jsonb,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eb_pages_scope_tenant_chk CHECK (
    (scope = 'tenant' AND tenant_id IS NOT NULL) OR
    (scope <> 'tenant' AND tenant_id IS NULL)
  ),
  UNIQUE (scope, tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_pages TO authenticated;
GRANT ALL ON public.eb_pages TO service_role;
GRANT SELECT ON public.eb_pages TO anon;
ALTER TABLE public.eb_pages ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER eb_pages_touch BEFORE UPDATE ON public.eb_pages
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_updated_at();
CREATE POLICY eb_pages_read_public ON public.eb_pages
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.eb_can_edit_scope(scope, tenant_id));
CREATE POLICY eb_pages_write_editor ON public.eb_pages
  FOR ALL TO authenticated
  USING (public.eb_can_edit_scope(scope, tenant_id))
  WITH CHECK (public.eb_can_edit_scope(scope, tenant_id));
CREATE INDEX eb_pages_tenant_idx ON public.eb_pages (tenant_id, kind, status);
CREATE INDEX eb_pages_slug_idx ON public.eb_pages (slug);

CREATE TABLE public.eb_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.eb_pages(id) ON DELETE CASCADE,
  tree jsonb NOT NULL,
  seo jsonb,
  open_graph jsonb,
  schema_org jsonb,
  marketing jsonb,
  note text,
  parent_version_id uuid REFERENCES public.eb_page_versions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eb_page_versions TO authenticated;
GRANT ALL ON public.eb_page_versions TO service_role;
ALTER TABLE public.eb_page_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb_page_versions_read ON public.eb_page_versions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.eb_pages p
      WHERE p.id = page_id AND public.eb_can_edit_scope(p.scope, p.tenant_id))
  );
CREATE INDEX eb_page_versions_page_idx ON public.eb_page_versions (page_id, created_at DESC);

-- VARIANTS ----------------------------------------------------------------
CREATE TABLE public.eb_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.eb_pages(id) ON DELETE CASCADE,
  name text NOT NULL,
  predicate jsonb NOT NULL DEFAULT '{}'::jsonb,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_variants TO authenticated;
GRANT ALL ON public.eb_variants TO service_role;
GRANT SELECT ON public.eb_variants TO anon;
ALTER TABLE public.eb_variants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER eb_variants_touch BEFORE UPDATE ON public.eb_variants
  FOR EACH ROW EXECUTE FUNCTION public.eb_touch_updated_at();
CREATE POLICY eb_variants_read_public ON public.eb_variants
  FOR SELECT TO anon, authenticated USING (
    is_active OR EXISTS (SELECT 1 FROM public.eb_pages p
      WHERE p.id = page_id AND public.eb_can_edit_scope(p.scope, p.tenant_id))
  );
CREATE POLICY eb_variants_write_editor ON public.eb_variants
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.eb_pages p
      WHERE p.id = page_id AND public.eb_can_edit_scope(p.scope, p.tenant_id))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.eb_pages p
      WHERE p.id = page_id AND public.eb_can_edit_scope(p.scope, p.tenant_id))
  );

-- PREVIEW TOKENS ----------------------------------------------------------
CREATE TABLE public.eb_preview_tokens (
  token text PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.eb_pages(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.eb_page_versions(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.eb_variants(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eb_preview_tokens TO authenticated;
GRANT ALL ON public.eb_preview_tokens TO service_role;
ALTER TABLE public.eb_preview_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb_preview_tokens_read ON public.eb_preview_tokens
  FOR SELECT TO authenticated USING (
    created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.eb_pages p
      WHERE p.id = page_id AND public.eb_can_edit_scope(p.scope, p.tenant_id))
  );

-- AUDIT LOG ---------------------------------------------------------------
CREATE TABLE public.eb_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  action public.eb_audit_action NOT NULL,
  scope public.eb_scope,
  tenant_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.eb_audit_log TO authenticated;
GRANT ALL ON public.eb_audit_log TO service_role;
ALTER TABLE public.eb_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY eb_audit_log_read ON public.eb_audit_log
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'super_admin'::public.app_role)
    OR public.has_role(auth.uid(),'admin'::public.app_role)
    OR (tenant_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.user_id = auth.uid() AND bu.business_id = tenant_id
    ))
  );
CREATE INDEX eb_audit_entity_idx ON public.eb_audit_log (entity, entity_id, created_at DESC);

-- =========================================================================
-- RPCs SECURITY DEFINER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.eb__audit(
  _entity text, _entity_id uuid, _action public.eb_audit_action,
  _scope public.eb_scope, _tenant_id uuid, _metadata jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.eb_audit_log(entity, entity_id, action, scope, tenant_id, actor_id, metadata)
  VALUES (_entity, _entity_id, _action, _scope, _tenant_id, auth.uid(), COALESCE(_metadata,'{}'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.eb_theme_upsert(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vid uuid := NULLIF(_payload->>'id','')::uuid;
  vscope public.eb_scope := COALESCE((_payload->>'scope')::public.eb_scope,'tenant');
  vtenant uuid := NULLIF(_payload->>'tenant_id','')::uuid;
BEGIN
  IF NOT public.eb_can_edit_scope(vscope, vtenant) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF vid IS NULL THEN
    INSERT INTO public.eb_themes(scope, tenant_id, name, slug, tokens, is_default, created_by)
    VALUES (vscope, vtenant, _payload->>'name', _payload->>'slug',
            COALESCE(_payload->'tokens','{}'::jsonb),
            COALESCE((_payload->>'is_default')::boolean,false), auth.uid())
    RETURNING id INTO vid;
    PERFORM public.eb__audit('theme', vid, 'create', vscope, vtenant, _payload);
  ELSE
    UPDATE public.eb_themes SET
      name = COALESCE(_payload->>'name', name),
      slug = COALESCE(_payload->>'slug', slug),
      tokens = COALESCE(_payload->'tokens', tokens),
      is_default = COALESCE((_payload->>'is_default')::boolean, is_default)
    WHERE id = vid;
    PERFORM public.eb__audit('theme', vid, 'update', vscope, vtenant, _payload);
  END IF;
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_template_upsert(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vid uuid := NULLIF(_payload->>'id','')::uuid;
  vscope public.eb_scope := COALESCE((_payload->>'scope')::public.eb_scope,'global');
  vtenant uuid := NULLIF(_payload->>'tenant_id','')::uuid;
BEGIN
  IF NOT public.eb_can_edit_scope(vscope, vtenant) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF vid IS NULL THEN
    INSERT INTO public.eb_templates(
      scope, tenant_id, name, slug, description, category, cover_url,
      config, pages, navigation, theme_id, assets, variables,
      recommended_blocks, seo_defaults, version, status, is_listed, created_by
    ) VALUES (
      vscope, vtenant, _payload->>'name', _payload->>'slug',
      _payload->>'description', _payload->>'category', _payload->>'cover_url',
      COALESCE(_payload->'config','{}'::jsonb),
      COALESCE(_payload->'pages','[]'::jsonb),
      COALESCE(_payload->'navigation','{}'::jsonb),
      NULLIF(_payload->>'theme_id','')::uuid,
      COALESCE(_payload->'assets','[]'::jsonb),
      COALESCE(_payload->'variables','{}'::jsonb),
      COALESCE(_payload->'recommended_blocks','[]'::jsonb),
      COALESCE(_payload->'seo_defaults','{}'::jsonb),
      COALESCE(_payload->>'version','1.0.0'),
      COALESCE((_payload->>'status')::public.eb_publish_status,'draft'),
      COALESCE((_payload->>'is_listed')::boolean,false), auth.uid()
    ) RETURNING id INTO vid;
    PERFORM public.eb__audit('template', vid, 'create', vscope, vtenant, _payload);
  ELSE
    UPDATE public.eb_templates SET
      name = COALESCE(_payload->>'name', name),
      slug = COALESCE(_payload->>'slug', slug),
      description = COALESCE(_payload->>'description', description),
      category = COALESCE(_payload->>'category', category),
      cover_url = COALESCE(_payload->>'cover_url', cover_url),
      config = COALESCE(_payload->'config', config),
      pages = COALESCE(_payload->'pages', pages),
      navigation = COALESCE(_payload->'navigation', navigation),
      theme_id = COALESCE(NULLIF(_payload->>'theme_id','')::uuid, theme_id),
      assets = COALESCE(_payload->'assets', assets),
      variables = COALESCE(_payload->'variables', variables),
      recommended_blocks = COALESCE(_payload->'recommended_blocks', recommended_blocks),
      seo_defaults = COALESCE(_payload->'seo_defaults', seo_defaults),
      version = COALESCE(_payload->>'version', version),
      status = COALESCE((_payload->>'status')::public.eb_publish_status, status),
      is_listed = COALESCE((_payload->>'is_listed')::boolean, is_listed)
    WHERE id = vid;
    PERFORM public.eb__audit('template', vid, 'update', vscope, vtenant, _payload);
  END IF;
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_template_clone(
  _template_id uuid, _target_scope public.eb_scope, _target_tenant uuid, _new_slug text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE src public.eb_templates%ROWTYPE; newid uuid;
BEGIN
  SELECT * INTO src FROM public.eb_templates WHERE id = _template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(_target_scope, _target_tenant) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.eb_templates(
    scope, tenant_id, name, slug, description, category, cover_url,
    config, pages, navigation, theme_id, assets, variables,
    recommended_blocks, seo_defaults, version, status, is_listed, created_by
  ) VALUES (
    _target_scope, _target_tenant, src.name || ' (copia)', _new_slug,
    src.description, src.category, src.cover_url,
    src.config, src.pages, src.navigation, src.theme_id, src.assets, src.variables,
    src.recommended_blocks, src.seo_defaults, src.version, 'draft', false, auth.uid()
  ) RETURNING id INTO newid;
  PERFORM public.eb__audit('template', newid, 'clone', _target_scope, _target_tenant,
    jsonb_build_object('source_id', _template_id));
  RETURN newid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_section_upsert(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vid uuid := NULLIF(_payload->>'id','')::uuid;
  vscope public.eb_scope := COALESCE((_payload->>'scope')::public.eb_scope,'tenant');
  vtenant uuid := NULLIF(_payload->>'tenant_id','')::uuid;
BEGIN
  IF NOT public.eb_can_edit_scope(vscope, vtenant) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF vid IS NULL THEN
    INSERT INTO public.eb_sections(scope, tenant_id, name, slug, description, tree, created_by)
    VALUES (vscope, vtenant, _payload->>'name', _payload->>'slug',
            _payload->>'description',
            COALESCE(_payload->'tree','{"root":{"children":[]}}'::jsonb), auth.uid())
    RETURNING id INTO vid;
    PERFORM public.eb__audit('section', vid, 'create', vscope, vtenant, _payload);
  ELSE
    UPDATE public.eb_sections SET
      name = COALESCE(_payload->>'name', name),
      slug = COALESCE(_payload->>'slug', slug),
      description = COALESCE(_payload->>'description', description),
      tree = COALESCE(_payload->'tree', tree)
    WHERE id = vid;
    PERFORM public.eb__audit('section', vid, 'update', vscope, vtenant, _payload);
  END IF;
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_section_publish(_section_id uuid, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.eb_sections%ROWTYPE; vid uuid;
BEGIN
  SELECT * INTO s FROM public.eb_sections WHERE id = _section_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'section_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(s.scope, s.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  INSERT INTO public.eb_section_versions(section_id, tree, note, parent_version_id, created_by)
  VALUES (s.id, s.tree, _note, s.current_version_id, auth.uid())
  RETURNING id INTO vid;
  UPDATE public.eb_sections SET current_version_id = vid, status='published' WHERE id = s.id;
  PERFORM public.eb__audit('section', s.id, 'publish', s.scope, s.tenant_id,
    jsonb_build_object('version_id', vid, 'note', _note));
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_upsert(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vid uuid := NULLIF(_payload->>'id','')::uuid;
  vscope public.eb_scope := COALESCE((_payload->>'scope')::public.eb_scope,'tenant');
  vtenant uuid := NULLIF(_payload->>'tenant_id','')::uuid;
BEGIN
  IF NOT public.eb_can_edit_scope(vscope, vtenant) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF vid IS NULL THEN
    INSERT INTO public.eb_pages(
      scope, tenant_id, kind, name, slug, theme_id, template_id, tree,
      seo, open_graph, schema_org, marketing, conversion, experiments, cache, created_by
    ) VALUES (
      vscope, vtenant,
      COALESCE((_payload->>'kind')::public.eb_page_kind,'landing'),
      _payload->>'name', _payload->>'slug',
      NULLIF(_payload->>'theme_id','')::uuid,
      NULLIF(_payload->>'template_id','')::uuid,
      COALESCE(_payload->'tree','{"root":{"children":[]}}'::jsonb),
      COALESCE(_payload->'seo','{}'::jsonb),
      COALESCE(_payload->'open_graph','{}'::jsonb),
      COALESCE(_payload->'schema_org','{}'::jsonb),
      COALESCE(_payload->'marketing','{}'::jsonb),
      COALESCE(_payload->'conversion','{}'::jsonb),
      COALESCE(_payload->'experiments','{}'::jsonb),
      COALESCE(_payload->'cache','{"strategy":"swr","ttl":300}'::jsonb),
      auth.uid()
    ) RETURNING id INTO vid;
    PERFORM public.eb__audit('page', vid, 'create', vscope, vtenant, _payload);
  ELSE
    UPDATE public.eb_pages SET
      kind = COALESCE((_payload->>'kind')::public.eb_page_kind, kind),
      name = COALESCE(_payload->>'name', name),
      slug = COALESCE(_payload->>'slug', slug),
      theme_id = COALESCE(NULLIF(_payload->>'theme_id','')::uuid, theme_id),
      template_id = COALESCE(NULLIF(_payload->>'template_id','')::uuid, template_id),
      tree = COALESCE(_payload->'tree', tree),
      seo = COALESCE(_payload->'seo', seo),
      open_graph = COALESCE(_payload->'open_graph', open_graph),
      schema_org = COALESCE(_payload->'schema_org', schema_org),
      marketing = COALESCE(_payload->'marketing', marketing),
      conversion = COALESCE(_payload->'conversion', conversion),
      experiments = COALESCE(_payload->'experiments', experiments),
      cache = COALESCE(_payload->'cache', cache)
    WHERE id = vid;
    PERFORM public.eb__audit('page', vid, 'update', vscope, vtenant, _payload);
  END IF;
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_save_version(_page_id uuid, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE; vid uuid;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  INSERT INTO public.eb_page_versions(page_id, tree, seo, open_graph, schema_org, marketing, note, parent_version_id, created_by)
  VALUES (p.id, p.tree, p.seo, p.open_graph, p.schema_org, p.marketing, _note, p.current_version_id, auth.uid())
  RETURNING id INTO vid;
  UPDATE public.eb_pages SET current_version_id = vid WHERE id = p.id;
  PERFORM public.eb__audit('page', p.id, 'update', p.scope, p.tenant_id,
    jsonb_build_object('version_id', vid, 'note', _note, 'kind','save_version'));
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_publish(_page_id uuid, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE; vid uuid;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  INSERT INTO public.eb_page_versions(page_id, tree, seo, open_graph, schema_org, marketing, note, parent_version_id, created_by)
  VALUES (p.id, p.tree, p.seo, p.open_graph, p.schema_org, p.marketing, COALESCE(_note,'publish'), p.current_version_id, auth.uid())
  RETURNING id INTO vid;
  UPDATE public.eb_pages SET current_version_id=vid, published_version_id=vid, status='published', published_at=now() WHERE id=p.id;
  PERFORM public.eb__audit('page', p.id, 'publish', p.scope, p.tenant_id,
    jsonb_build_object('version_id', vid, 'note', _note));
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_unpublish(_page_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  UPDATE public.eb_pages SET status='draft', published_version_id=NULL WHERE id=_page_id;
  PERFORM public.eb__audit('page', p.id, 'unpublish', p.scope, p.tenant_id, '{}'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_restore_version(_page_id uuid, _version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE; v public.eb_page_versions%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.eb_page_versions WHERE id=_version_id AND page_id=_page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'version_not_found'; END IF;
  UPDATE public.eb_pages SET
    tree = v.tree,
    seo = COALESCE(v.seo, p.seo),
    open_graph = COALESCE(v.open_graph, p.open_graph),
    schema_org = COALESCE(v.schema_org, p.schema_org),
    marketing = COALESCE(v.marketing, p.marketing),
    current_version_id = v.id
  WHERE id = p.id;
  PERFORM public.eb__audit('page', p.id, 'restore', p.scope, p.tenant_id,
    jsonb_build_object('version_id', v.id));
END $$;

CREATE OR REPLACE FUNCTION public.eb_page_delete(_page_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  PERFORM public.eb__audit('page', p.id, 'delete', p.scope, p.tenant_id, '{}'::jsonb);
  DELETE FROM public.eb_pages WHERE id = _page_id;
END $$;

CREATE OR REPLACE FUNCTION public.eb_variant_upsert(_payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  vid uuid := NULLIF(_payload->>'id','')::uuid;
  vpage uuid := (_payload->>'page_id')::uuid;
  p public.eb_pages%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = vpage;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  IF vid IS NULL THEN
    INSERT INTO public.eb_variants(page_id, name, predicate, overrides, is_active, created_by)
    VALUES (vpage, _payload->>'name',
            COALESCE(_payload->'predicate','{}'::jsonb),
            COALESCE(_payload->'overrides','{}'::jsonb),
            COALESCE((_payload->>'is_active')::boolean,false), auth.uid())
    RETURNING id INTO vid;
    PERFORM public.eb__audit('variant', vid, 'create', p.scope, p.tenant_id, _payload);
  ELSE
    UPDATE public.eb_variants SET
      name = COALESCE(_payload->>'name', name),
      predicate = COALESCE(_payload->'predicate', predicate),
      overrides = COALESCE(_payload->'overrides', overrides),
      is_active = COALESCE((_payload->>'is_active')::boolean, is_active)
    WHERE id = vid;
    PERFORM public.eb__audit('variant', vid, 'update', p.scope, p.tenant_id, _payload);
  END IF;
  RETURN vid;
END $$;

CREATE OR REPLACE FUNCTION public.eb_preview_token_issue(
  _page_id uuid, _version_id uuid, _variant_id uuid, _ttl_minutes int
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE; tok text;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
  tok := encode(gen_random_bytes(24),'hex');
  INSERT INTO public.eb_preview_tokens(token, page_id, version_id, variant_id, expires_at, created_by)
  VALUES (tok, _page_id, _version_id, _variant_id,
          now() + (COALESCE(_ttl_minutes,30) || ' minutes')::interval, auth.uid());
  PERFORM public.eb__audit('preview', _page_id, 'preview_issue', p.scope, p.tenant_id,
    jsonb_build_object('token_prefix', left(tok,8), 'version_id', _version_id));
  RETURN tok;
END $$;

CREATE OR REPLACE FUNCTION public.eb_preview_resolve(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t public.eb_preview_tokens%ROWTYPE;
  p public.eb_pages%ROWTYPE;
  v public.eb_page_versions%ROWTYPE;
  ov public.eb_variants%ROWTYPE;
BEGIN
  SELECT * INTO t FROM public.eb_preview_tokens WHERE token = _token;
  IF NOT FOUND OR t.expires_at < now() THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.eb_pages WHERE id = t.page_id;
  IF t.version_id IS NOT NULL THEN SELECT * INTO v FROM public.eb_page_versions WHERE id = t.version_id; END IF;
  IF t.variant_id IS NOT NULL THEN SELECT * INTO ov FROM public.eb_variants WHERE id = t.variant_id; END IF;
  RETURN jsonb_build_object(
    'page', to_jsonb(p),
    'version', CASE WHEN v.id IS NULL THEN NULL ELSE to_jsonb(v) END,
    'variant', CASE WHEN ov.id IS NULL THEN NULL ELSE to_jsonb(ov) END
  );
END $$;
