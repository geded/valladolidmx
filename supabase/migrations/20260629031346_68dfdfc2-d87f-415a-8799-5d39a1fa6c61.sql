-- ============================================================
-- Phase 1 · Block B · Domain Model
-- Migration: phase1_blockB_domain_model
-- Blueprint refs: 11.1, 11.5, 13.1
-- ============================================================

-- ------------------------------------------------------------
-- ENUMS
-- ------------------------------------------------------------
CREATE TYPE public.content_status AS ENUM
  ('draft','in_review','approved','published','archived');

CREATE TYPE public.hero_palette AS ENUM
  ('territorio','selva','cenote','atardecer');

CREATE TYPE public.product_type AS ENUM
  ('experiencia','hotel','restaurante','evento','tour','transporte','servicio','artesanal');

CREATE TYPE public.media_kind AS ENUM
  ('image','video','document','audio');

CREATE TYPE public.locale_code AS ENUM
  ('es','en','fr','de','it','pt');

CREATE TYPE public.entity_kind AS ENUM (
  'country','state','tourism_region','destination','destination_zone','point_of_interest',
  'business_category','business','product','media_asset','article','page','event','route'
);

-- ============================================================
-- 1. MEDIA
-- ============================================================
CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.media_kind NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  alt_text TEXT,
  caption TEXT,
  credit TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  size_bytes BIGINT,
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (storage_bucket, storage_path)
);

GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_public_read" ON public.media_assets FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);

CREATE TRIGGER trg_media_assets_updated_at BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_media_assets_kind   ON public.media_assets(kind);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);

-- ============================================================
-- 2. GEOGRAPHY
-- ============================================================
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code TEXT NOT NULL UNIQUE,
  slug extensions.citext NOT NULL UNIQUE,
  name TEXT NOT NULL,
  default_locale public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.countries TO anon, authenticated;
GRANT ALL ON public.countries TO service_role;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "countries_public_read" ON public.countries FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_countries_updated_at BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_countries_status ON public.countries(status);

CREATE TABLE public.states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  slug extensions.citext NOT NULL,
  name TEXT NOT NULL,
  iso_code TEXT,
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (country_id, slug)
);
GRANT SELECT ON public.states TO anon, authenticated;
GRANT ALL ON public.states TO service_role;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "states_public_read" ON public.states FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_states_updated_at BEFORE UPDATE ON public.states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_states_country_id ON public.states(country_id);
CREATE INDEX idx_states_status     ON public.states(status);

CREATE TABLE public.tourism_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE RESTRICT,
  slug extensions.citext NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  hero_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (state_id, slug)
);
GRANT SELECT ON public.tourism_regions TO anon, authenticated;
GRANT ALL ON public.tourism_regions TO service_role;
ALTER TABLE public.tourism_regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tourism_regions_public_read" ON public.tourism_regions FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_tourism_regions_updated_at BEFORE UPDATE ON public.tourism_regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_tourism_regions_state_id ON public.tourism_regions(state_id);
CREATE INDEX idx_tourism_regions_status   ON public.tourism_regions(status);

CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tourism_region_id UUID NOT NULL REFERENCES public.tourism_regions(id) ON DELETE RESTRICT,
  slug extensions.citext NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  hero_palette public.hero_palette NOT NULL DEFAULT 'territorio',
  highlights TEXT[] NOT NULL DEFAULT '{}',
  hero_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.destinations TO anon, authenticated;
GRANT ALL ON public.destinations TO service_role;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "destinations_public_read" ON public.destinations FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_destinations_updated_at BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_destinations_region_id ON public.destinations(tourism_region_id);
CREATE INDEX idx_destinations_status    ON public.destinations(status);
CREATE INDEX idx_destinations_published_at ON public.destinations(published_at);

CREATE TABLE public.destination_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  slug extensions.citext NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (destination_id, slug)
);
GRANT SELECT ON public.destination_zones TO anon, authenticated;
GRANT ALL ON public.destination_zones TO service_role;
ALTER TABLE public.destination_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "destination_zones_public_read" ON public.destination_zones FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_destination_zones_updated_at BEFORE UPDATE ON public.destination_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_destination_zones_destination_id ON public.destination_zones(destination_id);

CREATE TABLE public.points_of_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  destination_zone_id UUID REFERENCES public.destination_zones(id) ON DELETE SET NULL,
  slug extensions.citext NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.content_status NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (destination_id, slug)
);
GRANT SELECT ON public.points_of_interest TO anon, authenticated;
GRANT ALL ON public.points_of_interest TO service_role;
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_public_read" ON public.points_of_interest FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_poi_updated_at BEFORE UPDATE ON public.points_of_interest
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_poi_destination_id ON public.points_of_interest(destination_id);
CREATE INDEX idx_poi_status         ON public.points_of_interest(status);

-- ============================================================
-- 3. BUSINESS
-- ============================================================
CREATE TABLE public.business_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.business_categories(id) ON DELETE SET NULL,
  slug extensions.citext NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_categories_public_read" ON public.business_categories FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_business_categories_updated_at BEFORE UPDATE ON public.business_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_business_categories_parent_id ON public.business_categories(parent_id);
CREATE INDEX idx_business_categories_status    ON public.business_categories(status);

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE RESTRICT,
  primary_category_id UUID REFERENCES public.business_categories(id) ON DELETE SET NULL,
  slug extensions.citext NOT NULL UNIQUE,
  legal_name TEXT,
  display_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_media_id  UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_public_read" ON public.businesses FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_businesses_destination_id ON public.businesses(destination_id);
CREATE INDEX idx_businesses_category_id    ON public.businesses(primary_category_id);
CREATE INDEX idx_businesses_status         ON public.businesses(status);
CREATE INDEX idx_businesses_published_at   ON public.businesses(published_at);

CREATE TABLE public.business_category_links (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, category_id)
);
GRANT SELECT ON public.business_category_links TO anon, authenticated;
GRANT ALL ON public.business_category_links TO service_role;
ALTER TABLE public.business_category_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_category_links_public_read" ON public.business_category_links FOR SELECT TO anon, authenticated
  USING (true);
CREATE INDEX idx_bcl_category_id ON public.business_category_links(category_id);

CREATE TABLE public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  destination_zone_id UUID REFERENCES public.destination_zones(id) ON DELETE SET NULL,
  label TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.business_locations TO anon, authenticated;
GRANT ALL ON public.business_locations TO service_role;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_locations_public_read" ON public.business_locations FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL);
CREATE TRIGGER trg_business_locations_updated_at BEFORE UPDATE ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_business_locations_business_id ON public.business_locations(business_id);

CREATE TABLE public.business_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.business_contacts TO anon, authenticated;
GRANT ALL ON public.business_contacts TO service_role;
ALTER TABLE public.business_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_contacts_public_read" ON public.business_contacts FOR SELECT TO anon, authenticated
  USING (is_public = true AND deleted_at IS NULL);
CREATE TRIGGER trg_business_contacts_updated_at BEFORE UPDATE ON public.business_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_business_contacts_business_id ON public.business_contacts(business_id);

CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_hours TO anon, authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_hours_public_read" ON public.business_hours FOR SELECT TO anon, authenticated
  USING (true);
CREATE TRIGGER trg_business_hours_updated_at BEFORE UPDATE ON public.business_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_business_hours_business_id ON public.business_hours(business_id);

CREATE TABLE public.business_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_social_links TO anon, authenticated;
GRANT ALL ON public.business_social_links TO service_role;
ALTER TABLE public.business_social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_social_links_public_read" ON public.business_social_links FOR SELECT TO anon, authenticated
  USING (true);
CREATE TRIGGER trg_business_social_links_updated_at BEFORE UPDATE ON public.business_social_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_business_social_links_business_id ON public.business_social_links(business_id);

CREATE TABLE public.business_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'gallery',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, media_asset_id, role)
);
GRANT SELECT ON public.business_media TO anon, authenticated;
GRANT ALL ON public.business_media TO service_role;
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business_media_public_read" ON public.business_media FOR SELECT TO anon, authenticated
  USING (true);
CREATE INDEX idx_business_media_business_id ON public.business_media(business_id);
CREATE INDEX idx_business_media_asset_id    ON public.business_media(media_asset_id);

-- ============================================================
-- 4. PRODUCTS
-- ============================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_type public.product_type NOT NULL,
  slug extensions.citext NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  price_amount NUMERIC(12,2),
  price_currency TEXT NOT NULL DEFAULT 'MXN',
  duration_minutes INTEGER,
  capacity INTEGER,
  cover_media_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (business_id, slug)
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_products_business_id   ON public.products(business_id);
CREATE INDEX idx_products_type          ON public.products(product_type);
CREATE INDEX idx_products_status        ON public.products(status);
CREATE INDEX idx_products_published_at  ON public.products(published_at);

CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'gallery',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, media_asset_id, role)
);
GRANT SELECT ON public.product_media TO anon, authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_media_public_read" ON public.product_media FOR SELECT TO anon, authenticated
  USING (true);
CREATE INDEX idx_product_media_product_id ON public.product_media(product_id);
CREATE INDEX idx_product_media_asset_id   ON public.product_media(media_asset_id);

-- ============================================================
-- 5. REVIEWS (polymorphic)
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_kind public.entity_kind NOT NULL,
  subject_id UUID NOT NULL,
  author_user_id UUID,
  author_display_name TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  language public.locale_code NOT NULL DEFAULT 'es',
  status public.content_status NOT NULL DEFAULT 'in_review',
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_reviews_subject     ON public.reviews(subject_kind, subject_id);
CREATE INDEX idx_reviews_status      ON public.reviews(status);
CREATE INDEX idx_reviews_author      ON public.reviews(author_user_id);

-- ============================================================
-- 6. I18N TRANSLATIONS BRIDGE
-- ============================================================
CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind public.entity_kind NOT NULL,
  entity_id UUID NOT NULL,
  locale public.locale_code NOT NULL,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID, updated_by UUID, deleted_at TIMESTAMPTZ, deleted_by UUID,
  UNIQUE (entity_kind, entity_id, locale, field)
);
GRANT SELECT ON public.translations TO anon, authenticated;
GRANT ALL ON public.translations TO service_role;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "translations_public_read" ON public.translations FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE TRIGGER trg_translations_updated_at BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_translations_entity ON public.translations(entity_kind, entity_id);
CREATE INDEX idx_translations_locale ON public.translations(locale);
