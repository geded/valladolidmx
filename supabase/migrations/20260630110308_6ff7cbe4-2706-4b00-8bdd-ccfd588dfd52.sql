
-- =========================================================================
-- Etapa 15.10.4b · Fase 3 — Resolver público, variants, rollback, caché
-- =========================================================================

-- 1) Ampliación aditiva de enum eb_page_kind (deuda técnica priorizada).
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'destination'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'business'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'product'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'event'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'wedding'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'promo'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'microsite'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'ai_generated'; EXCEPTION WHEN others THEN NULL; END $$;

-- 2) Ampliación aditiva de enum eb_audit_action (nuevas acciones auditadas).
DO $$ BEGIN ALTER TYPE public.eb_audit_action ADD VALUE IF NOT EXISTS 'rollback'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_audit_action ADD VALUE IF NOT EXISTS 'theme_change'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_audit_action ADD VALUE IF NOT EXISTS 'variant_change'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_audit_action ADD VALUE IF NOT EXISTS 'cache_invalidate'; EXCEPTION WHEN others THEN NULL; END $$;

-- 3) Caché desacoplado (preparado para CDN futura): contador de invalidación.
ALTER TABLE public.eb_pages
  ADD COLUMN IF NOT EXISTS cache_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- 4) Visibilidad pública del slug — índice único parcial para slug+tenant publicado.
CREATE INDEX IF NOT EXISTS eb_pages_public_slug_idx
  ON public.eb_pages (tenant_id, slug)
  WHERE status = 'published';

-- =========================================================================
-- RPC: eb_cache_invalidate  (interno, llamado por publish/unpublish/rollback)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.eb_cache_invalidate(_page_id uuid, _reason text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.eb_pages%ROWTYPE; v integer;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.eb_pages
    SET cache_version = cache_version + 1
    WHERE id = _page_id
    RETURNING cache_version INTO v;
  PERFORM public.eb__audit('page', _page_id, 'cache_invalidate', p.scope, p.tenant_id,
    jsonb_build_object('cache_version', v, 'reason', COALESCE(_reason,'manual')));
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public.eb_cache_invalidate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_cache_invalidate(uuid, text) TO authenticated, service_role;

-- =========================================================================
-- RPC: eb_page_rollback — restaura version_id como NUEVA versión draft + audit
-- =========================================================================
CREATE OR REPLACE FUNCTION public.eb_page_rollback(_page_id uuid, _version_id uuid, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.eb_pages%ROWTYPE;
  v public.eb_page_versions%ROWTYPE;
  newv uuid;
BEGIN
  SELECT * INTO p FROM public.eb_pages WHERE id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'page_not_found'; END IF;
  IF NOT public.eb_can_edit_scope(p.scope, p.tenant_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v FROM public.eb_page_versions WHERE id = _version_id AND page_id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'version_not_found'; END IF;

  -- Crea nueva versión draft con el contenido restaurado (no sobrescribe historial).
  INSERT INTO public.eb_page_versions(page_id, tree, seo, open_graph, schema_org, marketing, note, parent_version_id, created_by)
  VALUES (p.id, v.tree, v.seo, v.open_graph, v.schema_org, v.marketing,
          COALESCE(_note, 'rollback from ' || left(v.id::text,8)),
          v.id, auth.uid())
  RETURNING id INTO newv;

  UPDATE public.eb_pages SET
    tree = v.tree,
    seo = COALESCE(v.seo, p.seo),
    open_graph = COALESCE(v.open_graph, p.open_graph),
    schema_org = COALESCE(v.schema_org, p.schema_org),
    marketing = COALESCE(v.marketing, p.marketing),
    current_version_id = newv,
    cache_version = cache_version + 1
  WHERE id = p.id;

  PERFORM public.eb__audit('page', p.id, 'rollback', p.scope, p.tenant_id,
    jsonb_build_object('from_version_id', v.id, 'new_version_id', newv, 'note', _note));
  RETURN newv;
END $$;
REVOKE EXECUTE ON FUNCTION public.eb_page_rollback(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eb_page_rollback(uuid, uuid, text) TO authenticated, service_role;

-- =========================================================================
-- Refresco de eb_page_publish/unpublish para incrementar cache_version
-- =========================================================================
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
  UPDATE public.eb_pages
    SET current_version_id=vid, published_version_id=vid, status='published',
        published_at=now(), cache_version = cache_version + 1
    WHERE id=p.id;
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
  UPDATE public.eb_pages
    SET status='draft', published_version_id=NULL, cache_version = cache_version + 1
    WHERE id=_page_id;
  PERFORM public.eb__audit('page', p.id, 'unpublish', p.scope, p.tenant_id, '{}'::jsonb);
END $$;

-- =========================================================================
-- RPC: eb_variant_resolve — selección con prioridad y fallback al árbol base
-- =========================================================================
-- Contrato del predicate (todas las claves son opcionales):
--   { "locale": "es", "country": "MX", "audience": "b2c",
--     "segment": "wedding", "device": "mobile", "source": "ads",
--     "campaign": "verano-2026", "tenant_id": "<uuid>" }
-- El match se considera positivo si TODAS las claves presentes en predicate
-- coinciden con el contexto. Prioridad = nº de claves del predicate (más
-- específico gana). Empate → variant activa más reciente.
CREATE OR REPLACE FUNCTION public.eb_variant_resolve(_page_id uuid, _ctx jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  best public.eb_variants%ROWTYPE;
  best_score integer := -1;
  r public.eb_variants%ROWTYPE;
  score integer;
  matches boolean;
  k text;
BEGIN
  FOR r IN
    SELECT * FROM public.eb_variants WHERE page_id = _page_id AND is_active = true
  LOOP
    matches := true;
    score := 0;
    FOR k IN SELECT jsonb_object_keys(r.predicate) LOOP
      score := score + 1;
      IF COALESCE(_ctx ->> k, '') <> COALESCE(r.predicate ->> k, '') THEN
        matches := false;
        EXIT;
      END IF;
    END LOOP;
    IF matches AND score > best_score THEN
      best := r;
      best_score := score;
    END IF;
  END LOOP;

  IF best.id IS NULL THEN
    RETURN NULL; -- fallback obligatorio: caller usa el árbol base
  END IF;
  RETURN jsonb_build_object(
    'id', best.id,
    'name', best.name,
    'predicate', best.predicate,
    'overrides', best.overrides,
    'score', best_score
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.eb_variant_resolve(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_variant_resolve(uuid, jsonb) TO anon, authenticated, service_role;

-- =========================================================================
-- RPC: eb_page_resolve_public — punto único de resolución pública por slug
-- =========================================================================
-- Soporta global + tenant. Prioridad: tenant > global cuando _tenant_id se
-- provee. Si _tenant_id es NULL, sólo resuelve scope=global. Sólo expone
-- páginas con status='published' y visibility='public'. Devuelve theme,
-- variant resuelta, SEO y cache_version para invalidación cliente/CDN.
CREATE OR REPLACE FUNCTION public.eb_page_resolve_public(
  _slug text,
  _tenant_id uuid DEFAULT NULL,
  _ctx jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.eb_pages%ROWTYPE;
  t public.eb_themes%ROWTYPE;
  variant jsonb;
BEGIN
  -- Prioridad tenant > global.
  IF _tenant_id IS NOT NULL THEN
    SELECT * INTO p FROM public.eb_pages
      WHERE slug = _slug AND scope = 'tenant' AND tenant_id = _tenant_id
        AND status = 'published' AND visibility = 'public'
      LIMIT 1;
  END IF;
  IF p.id IS NULL THEN
    SELECT * INTO p FROM public.eb_pages
      WHERE slug = _slug AND scope = 'global'
        AND status = 'published' AND visibility = 'public'
      LIMIT 1;
  END IF;
  IF p.id IS NULL THEN RETURN NULL; END IF;

  IF p.theme_id IS NOT NULL THEN
    SELECT * INTO t FROM public.eb_themes WHERE id = p.theme_id;
  END IF;

  variant := public.eb_variant_resolve(p.id, COALESCE(_ctx, '{}'::jsonb));

  RETURN jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'name', p.name,
    'kind', p.kind,
    'scope', p.scope,
    'tenant_id', p.tenant_id,
    'tree', p.tree,
    'seo', p.seo,
    'open_graph', p.open_graph,
    'schema_org', p.schema_org,
    'marketing', p.marketing,
    'theme', CASE WHEN t.id IS NULL THEN NULL ELSE jsonb_build_object('id', t.id, 'name', t.name, 'tokens', t.tokens) END,
    'variant', variant,
    'cache_version', p.cache_version,
    'published_at', p.published_at
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.eb_page_resolve_public(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_page_resolve_public(text, uuid, jsonb) TO anon, authenticated, service_role;
