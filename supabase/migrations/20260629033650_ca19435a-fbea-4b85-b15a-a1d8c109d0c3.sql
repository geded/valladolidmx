-- ============================================================
-- Phase 1 · Block D · CMS Governance & Content Operations
-- Migration: phase1_blockD_cms_governance
-- Blueprint refs: 07, 13.4
-- ============================================================

-- ------------------------------------------------------------
-- 1. Extend entity_kind enum (CMS surfaces)
-- ------------------------------------------------------------
ALTER TYPE public.entity_kind ADD VALUE IF NOT EXISTS 'faq';
ALTER TYPE public.entity_kind ADD VALUE IF NOT EXISTS 'banner';
ALTER TYPE public.entity_kind ADD VALUE IF NOT EXISTS 'promotion';

-- ============================================================
-- 2. ARTICLES (editorial / blog)
-- ============================================================
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_user_id UUID,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_public_read" ON public.articles FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "articles_editor_all" ON public.articles FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_articles_published_at ON public.articles(published_at DESC);
CREATE INDEX idx_articles_destination ON public.articles(destination_id);

-- ============================================================
-- 3. PAGES (institutional / static)
-- ============================================================
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_public_read" ON public.pages FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "pages_editor_all" ON public.pages FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_pages_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pages_status ON public.pages(status);

-- ============================================================
-- 4. EVENTS
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  destination_id UUID REFERENCES public.destinations(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  venue_name TEXT,
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  external_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_public_read" ON public.events FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "events_editor_all" ON public.events FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_destination ON public.events(destination_id);

-- ============================================================
-- 5. EDITORIAL ROUTES (suggested itineraries)
-- ============================================================
CREATE TABLE public.editorial_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  duration_days INTEGER NOT NULL DEFAULT 1,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  palette public.hero_palette,
  destination_ids UUID[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.editorial_routes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.editorial_routes TO authenticated;
GRANT ALL ON public.editorial_routes TO service_role;
ALTER TABLE public.editorial_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editorial_routes_public_read" ON public.editorial_routes FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "editorial_routes_editor_all" ON public.editorial_routes FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_editorial_routes_updated_at BEFORE UPDATE ON public.editorial_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_editorial_routes_status ON public.editorial_routes(status);

-- ============================================================
-- 6. FAQS
-- ============================================================
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  category TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  entity_kind public.entity_kind,
  entity_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "faqs_editor_all" ON public.faqs FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_faqs_status ON public.faqs(status);
CREATE INDEX idx_faqs_entity ON public.faqs(entity_kind, entity_id);

-- ============================================================
-- 7. BANNERS (home / landing surfaces)
-- ============================================================
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT,
  cta_url TEXT,
  placement TEXT NOT NULL DEFAULT 'home',
  position INTEGER NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  palette public.hero_palette,
  locale public.locale_code NOT NULL DEFAULT 'es',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners_public_read" ON public.banners FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "banners_editor_all" ON public.banners FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_banners_placement ON public.banners(placement, position);
CREATE INDEX idx_banners_status ON public.banners(status);

-- ============================================================
-- 8. PROMOTIONS
-- ============================================================
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug extensions.citext NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  discount_percent NUMERIC(5,2),
  terms TEXT,
  locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'draft',
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions_public_read" ON public.promotions FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "promotions_editor_all" ON public.promotions FOR ALL TO authenticated
  USING (
    public.is_editor_or_admin(auth.uid())
    OR (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id, 'editor'))
  )
  WITH CHECK (
    public.is_editor_or_admin(auth.uid())
    OR (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id, 'editor'))
  );
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_promotions_business ON public.promotions(business_id);
CREATE INDEX idx_promotions_status ON public.promotions(status);

-- ============================================================
-- 9. SEO METADATA (polymorphic, per entity)
-- ============================================================
CREATE TABLE public.seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind public.entity_kind NOT NULL,
  entity_id UUID NOT NULL,
  locale public.locale_code NOT NULL DEFAULT 'es',
  slug extensions.citext,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  og_image_url TEXT,
  twitter_card TEXT,
  noindex BOOLEAN NOT NULL DEFAULT FALSE,
  json_ld JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (entity_kind, entity_id, locale)
);
GRANT SELECT ON public.seo_metadata TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_metadata TO authenticated;
GRANT ALL ON public.seo_metadata TO service_role;
ALTER TABLE public.seo_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_public_read" ON public.seo_metadata FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);
CREATE POLICY "seo_editor_all" ON public.seo_metadata FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE TRIGGER trg_seo_metadata_updated_at BEFORE UPDATE ON public.seo_metadata
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_seo_entity ON public.seo_metadata(entity_kind, entity_id);

-- ============================================================
-- 10. CONTENT AUDIT LOG (editorial transitions)
-- ============================================================
CREATE TABLE public.content_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind public.entity_kind NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  from_status public.content_status,
  to_status public.content_status,
  actor_user_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.content_audit_log TO authenticated;
GRANT ALL ON public.content_audit_log TO service_role;
ALTER TABLE public.content_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_audit_admin_read" ON public.content_audit_log FOR SELECT TO authenticated
  USING (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "content_audit_editor_insert" ON public.content_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE INDEX idx_content_audit_entity ON public.content_audit_log(entity_kind, entity_id, created_at DESC);

-- ============================================================
-- 11. Editorial transition function
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_content_status(
  _entity_kind public.entity_kind,
  _entity_id UUID,
  _to_status public.content_status,
  _notes TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from public.content_status;
  _table TEXT;
  _allowed BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_editor_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _table := CASE _entity_kind
    WHEN 'article'   THEN 'articles'
    WHEN 'page'      THEN 'pages'
    WHEN 'event'     THEN 'events'
    WHEN 'route'     THEN 'editorial_routes'
    WHEN 'faq'       THEN 'faqs'
    WHEN 'banner'    THEN 'banners'
    WHEN 'promotion' THEN 'promotions'
    ELSE NULL
  END;

  IF _table IS NULL THEN
    RAISE EXCEPTION 'entity_kind % is not editable via this function', _entity_kind;
  END IF;

  EXECUTE format('SELECT status FROM public.%I WHERE id = $1', _table)
    INTO _from USING _entity_id;

  IF _from IS NULL THEN
    RAISE EXCEPTION 'entity not found';
  END IF;

  -- Allowed transitions
  _allowed := (
    (_from = 'draft'     AND _to_status IN ('in_review','archived'))
    OR (_from = 'in_review' AND _to_status IN ('approved','draft','archived'))
    OR (_from = 'approved'  AND _to_status IN ('published','draft','archived'))
    OR (_from = 'published' AND _to_status IN ('archived','draft'))
    OR (_from = 'archived'  AND _to_status IN ('draft'))
  );

  IF NOT _allowed THEN
    RAISE EXCEPTION 'invalid transition % -> %', _from, _to_status;
  END IF;

  IF _to_status = 'published' THEN
    EXECUTE format('UPDATE public.%I SET status = $1, published_at = COALESCE(published_at, now()), updated_by = auth.uid() WHERE id = $2', _table)
      USING _to_status, _entity_id;
  ELSE
    EXECUTE format('UPDATE public.%I SET status = $1, updated_by = auth.uid() WHERE id = $2', _table)
      USING _to_status, _entity_id;
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  VALUES (_entity_kind, _entity_id, 'transition', _from, _to_status, auth.uid(), _notes);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_content_status(public.entity_kind, UUID, public.content_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_content_status(public.entity_kind, UUID, public.content_status, TEXT) TO authenticated;
