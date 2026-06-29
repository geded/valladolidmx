
-- Wave 4 · Stage 2 — Marketplace search, filters and indexes.
-- Aditivo: índices funcionales parciales y RPC SECURITY DEFINER pública.
-- Sin cambios a RLS ni al modelo de dominio.

-- Índices funcionales parciales sobre catálogo publicado
CREATE INDEX IF NOT EXISTS idx_products_published_business
  ON public.products (business_id)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_published_price
  ON public.products (price_amount)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_published_type
  ON public.products (product_type)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_published_window
  ON public.promotions (starts_at, ends_at)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_published_business
  ON public.promotions (business_id)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_published_destination
  ON public.businesses (destination_id)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_published_category
  ON public.businesses (primary_category_id)
  WHERE status = 'published' AND deleted_at IS NULL;

-- RPC pública de búsqueda
CREATE OR REPLACE FUNCTION public.search_marketplace(
  p_q text DEFAULT NULL,
  p_destination_slug text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0
) RETURNS TABLE (
  product_id uuid,
  product_slug text,
  product_name text,
  product_tagline text,
  product_type text,
  price_amount numeric,
  price_currency text,
  business_id uuid,
  business_slug text,
  business_name text,
  destination_slug text,
  category_slug text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      p.id AS product_id,
      p.slug::text AS product_slug,
      p.name AS product_name,
      p.tagline AS product_tagline,
      p.product_type::text AS product_type,
      p.price_amount,
      p.price_currency,
      b.id AS business_id,
      b.slug::text AS business_slug,
      b.display_name AS business_name,
      d.slug::text AS destination_slug,
      c.slug::text AS category_slug
    FROM public.products p
    JOIN public.businesses b ON b.id = p.business_id
    LEFT JOIN public.destinations d ON d.id = b.destination_id
    LEFT JOIN public.business_categories c ON c.id = b.primary_category_id
    WHERE p.status = 'published' AND p.deleted_at IS NULL
      AND b.status = 'published' AND b.deleted_at IS NULL
      AND (p_q IS NULL OR p_q = '' OR p.name ILIKE '%' || p_q || '%' OR coalesce(p.tagline,'') ILIKE '%' || p_q || '%')
      AND (p_destination_slug IS NULL OR p_destination_slug = '' OR d.slug::text = p_destination_slug)
      AND (p_category_slug IS NULL OR p_category_slug = '' OR c.slug::text = p_category_slug)
      AND (p_price_min IS NULL OR p.price_amount >= p_price_min)
      AND (p_price_max IS NULL OR p.price_amount <= p_price_max)
  ),
  counted AS (SELECT count(*)::bigint AS total FROM base)
  SELECT
    base.product_id, base.product_slug, base.product_name, base.product_tagline,
    base.product_type, base.price_amount, base.price_currency,
    base.business_id, base.business_slug, base.business_name,
    base.destination_slug, base.category_slug,
    counted.total
  FROM base CROSS JOIN counted
  ORDER BY base.product_name ASC
  LIMIT GREATEST(1, LEAST(coalesce(p_limit, 24), 100))
  OFFSET GREATEST(0, coalesce(p_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.search_marketplace(text,text,text,numeric,numeric,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_marketplace(text,text,text,numeric,numeric,int,int) TO anon, authenticated;

COMMENT ON FUNCTION public.search_marketplace(text,text,text,numeric,numeric,int,int) IS
  'Wave 4 Stage 2: búsqueda pública del Marketplace sobre catálogo publicado. SECURITY DEFINER · search_path=public · solo SELECT.';
