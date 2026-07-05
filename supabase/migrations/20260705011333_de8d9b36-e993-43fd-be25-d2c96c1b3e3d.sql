
CREATE TYPE public.related_override_mode AS ENUM ('pin', 'hide');
CREATE TYPE public.related_entity_kind AS ENUM ('business', 'product', 'destination', 'event');

CREATE TABLE public.related_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.related_entity_kind NOT NULL,
  entity_id uuid NOT NULL,
  surface text NOT NULL,
  related_entity_type public.related_entity_kind NOT NULL,
  related_entity_id uuid NOT NULL,
  mode public.related_override_mode NOT NULL,
  position integer,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_demo_seed boolean NOT NULL DEFAULT false,
  demo_seed_batch text,
  CONSTRAINT related_overrides_unique UNIQUE (entity_type, entity_id, surface, related_entity_type, related_entity_id),
  CONSTRAINT related_overrides_self_ref CHECK (NOT (entity_type = related_entity_type AND entity_id = related_entity_id))
);

CREATE INDEX idx_related_overrides_lookup ON public.related_overrides (entity_type, entity_id, surface);
CREATE INDEX idx_related_overrides_related ON public.related_overrides (related_entity_type, related_entity_id);

GRANT SELECT ON public.related_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.related_overrides TO authenticated;
GRANT ALL ON public.related_overrides TO service_role;

ALTER TABLE public.related_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "related_overrides_public_read"
  ON public.related_overrides FOR SELECT USING (true);

CREATE POLICY "related_overrides_admin_write"
  ON public.related_overrides FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "related_overrides_admin_update"
  ON public.related_overrides FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "related_overrides_admin_delete"
  ON public.related_overrides FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );

CREATE TRIGGER trg_related_overrides_updated_at
  BEFORE UPDATE ON public.related_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RPC: related_get_collection
-- ============================================================
CREATE OR REPLACE FUNCTION public.related_get_collection(
  p_entity_type public.related_entity_kind,
  p_entity_id uuid,
  p_surface text,
  p_context jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb := '[]'::jsonb;
  v_strategy text := 'same-category';
  v_rationale text := NULL;
  v_dest uuid;
  v_region uuid;
  v_category uuid;
  v_hide_ids uuid[] := ARRAY[]::uuid[];
  v_count integer := 0;
  v_pin_count integer := 0;
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 8), 24));
BEGIN
  SELECT COALESCE(array_agg(related_entity_id), ARRAY[]::uuid[])
    INTO v_hide_ids
  FROM public.related_overrides
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    AND surface = p_surface AND mode = 'hide';

  IF p_entity_type = 'business' THEN
    SELECT destination_id, primary_category_id INTO v_dest, v_category
    FROM public.businesses WHERE id = p_entity_id;
    SELECT tourism_region_id INTO v_region FROM public.destinations WHERE id = v_dest;
  ELSIF p_entity_type = 'product' THEN
    SELECT b.destination_id, b.primary_category_id INTO v_dest, v_category
    FROM public.products p JOIN public.businesses b ON b.id = p.business_id
    WHERE p.id = p_entity_id;
    SELECT tourism_region_id INTO v_region FROM public.destinations WHERE id = v_dest;
  ELSIF p_entity_type = 'destination' THEN
    SELECT tourism_region_id INTO v_region FROM public.destinations WHERE id = p_entity_id;
  ELSIF p_entity_type = 'event' THEN
    SELECT destination_id INTO v_dest FROM public.events WHERE id = p_entity_id;
    SELECT tourism_region_id INTO v_region FROM public.destinations WHERE id = v_dest;
  END IF;

  IF p_entity_type = 'business' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT b.id, 'business'::text AS entity_type, b.display_name AS title,
             d.name AS subtitle, b.slug, d.slug AS destination_slug,
             b.cover_media_id, b.verified
      FROM public.businesses b
      LEFT JOIN public.destinations d ON d.id = b.destination_id
      WHERE b.id <> p_entity_id AND b.status = 'published' AND b.deleted_at IS NULL
        AND NOT (b.id = ANY(v_hide_ids))
        AND (
          (v_dest IS NOT NULL AND b.destination_id = v_dest AND (v_category IS NULL OR b.primary_category_id = v_category))
          OR (v_region IS NOT NULL AND EXISTS(SELECT 1 FROM public.destinations dd WHERE dd.id = b.destination_id AND dd.tourism_region_id = v_region))
        )
      ORDER BY (b.destination_id = v_dest) DESC, b.verified DESC NULLS LAST, b.published_at DESC NULLS LAST
      LIMIT v_limit
    ) t;
    v_strategy := 'same-category';

  ELSIF p_entity_type = 'product' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT p.id, 'product'::text AS entity_type, p.name AS title,
             b.display_name AS subtitle, p.slug, b.slug AS business_slug,
             p.cover_media_id, p.price_amount, p.price_currency
      FROM public.products p JOIN public.businesses b ON b.id = p.business_id
      WHERE p.id <> p_entity_id AND p.status = 'published' AND p.deleted_at IS NULL
        AND NOT (p.id = ANY(v_hide_ids))
        AND (
          (v_dest IS NOT NULL AND b.destination_id = v_dest)
          OR (v_region IS NOT NULL AND EXISTS(SELECT 1 FROM public.destinations dd WHERE dd.id = b.destination_id AND dd.tourism_region_id = v_region))
        )
      ORDER BY (b.destination_id = v_dest) DESC, p.published_at DESC NULLS LAST
      LIMIT v_limit
    ) t;
    v_strategy := 'same-destination';

  ELSIF p_entity_type = 'destination' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT d.id, 'destination'::text AS entity_type, d.name AS title,
             d.tagline AS subtitle, d.slug, d.hero_media_id AS cover_media_id
      FROM public.destinations d
      WHERE d.id <> p_entity_id AND d.status = 'published' AND d.deleted_at IS NULL
        AND NOT (d.id = ANY(v_hide_ids))
        AND (v_region IS NULL OR d.tourism_region_id = v_region)
      ORDER BY d.published_at DESC NULLS LAST
      LIMIT v_limit
    ) t;
    v_strategy := 'same-region';

  ELSIF p_entity_type = 'event' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT e.id, 'event'::text AS entity_type, e.title,
             d.name AS subtitle, e.slug, e.starts_at,
             e.cover_media_id, d.slug AS destination_slug
      FROM public.events e
      LEFT JOIN public.destinations d ON d.id = e.destination_id
      WHERE e.id <> p_entity_id AND e.status = 'published' AND e.deleted_at IS NULL
        AND NOT (e.id = ANY(v_hide_ids))
        AND (v_dest IS NULL OR e.destination_id = v_dest)
      ORDER BY e.starts_at ASC NULLS LAST
      LIMIT v_limit
    ) t;
    v_strategy := 'same-destination';
  END IF;

  v_items := COALESCE(v_items, '[]'::jsonb);
  v_count := jsonb_array_length(v_items);

  IF v_count < 3 AND v_dest IS NOT NULL THEN
    v_strategy := 'popular-destination';
    v_rationale := 'Populares en el mismo destino';
    IF p_entity_type = 'business' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
        SELECT b.id, 'business'::text AS entity_type, b.display_name AS title,
               d.name AS subtitle, b.slug, d.slug AS destination_slug,
               b.cover_media_id, b.verified
        FROM public.businesses b
        LEFT JOIN public.destinations d ON d.id = b.destination_id
        WHERE b.id <> p_entity_id AND b.status = 'published' AND b.deleted_at IS NULL
          AND b.destination_id = v_dest AND NOT (b.id = ANY(v_hide_ids))
        ORDER BY b.verified DESC NULLS LAST, b.published_at DESC NULLS LAST
        LIMIT v_limit
      ) t;
    ELSIF p_entity_type = 'product' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
        SELECT p.id, 'product'::text AS entity_type, p.name AS title,
               b.display_name AS subtitle, p.slug, b.slug AS business_slug,
               p.cover_media_id, p.price_amount, p.price_currency
        FROM public.products p JOIN public.businesses b ON b.id = p.business_id
        WHERE p.id <> p_entity_id AND p.status = 'published' AND p.deleted_at IS NULL
          AND b.destination_id = v_dest AND NOT (p.id = ANY(v_hide_ids))
        ORDER BY p.published_at DESC NULLS LAST
        LIMIT v_limit
      ) t;
    ELSIF p_entity_type = 'event' THEN
      SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
        SELECT e.id, 'event'::text AS entity_type, e.title,
               d.name AS subtitle, e.slug, e.starts_at,
               e.cover_media_id, d.slug AS destination_slug
        FROM public.events e
        LEFT JOIN public.destinations d ON d.id = e.destination_id
        WHERE e.id <> p_entity_id AND e.status = 'published' AND e.deleted_at IS NULL
          AND e.destination_id = v_dest AND NOT (e.id = ANY(v_hide_ids))
        ORDER BY e.starts_at ASC NULLS LAST
        LIMIT v_limit
      ) t;
    END IF;
    v_items := COALESCE(v_items, '[]'::jsonb);
  END IF;

  SELECT COUNT(*) INTO v_pin_count FROM public.related_overrides
  WHERE entity_type=p_entity_type AND entity_id=p_entity_id AND surface=p_surface AND mode='pin';

  IF v_pin_count > 0 THEN
    WITH pinned AS (
      SELECT ro.related_entity_id, ro.related_entity_type, ro.position, ro.note
      FROM public.related_overrides ro
      WHERE ro.entity_type = p_entity_type AND ro.entity_id = p_entity_id
        AND ro.surface = p_surface AND ro.mode = 'pin'
      ORDER BY ro.position NULLS LAST, ro.created_at
      LIMIT 6
    ),
    pin_items AS (
      SELECT jsonb_build_object(
        'id', p.related_entity_id,
        'entity_type', p.related_entity_type::text,
        'title', COALESCE(
          (SELECT display_name FROM public.businesses WHERE id = p.related_entity_id),
          (SELECT name FROM public.products WHERE id = p.related_entity_id),
          (SELECT name FROM public.destinations WHERE id = p.related_entity_id),
          (SELECT title FROM public.events WHERE id = p.related_entity_id)
        ),
        'slug', COALESCE(
          (SELECT slug::text FROM public.businesses WHERE id = p.related_entity_id),
          (SELECT slug::text FROM public.products WHERE id = p.related_entity_id),
          (SELECT slug::text FROM public.destinations WHERE id = p.related_entity_id),
          (SELECT slug::text FROM public.events WHERE id = p.related_entity_id)
        ),
        'pinned', true,
        'note', p.note
      ) AS item, p.position AS pos
      FROM pinned p
    ),
    merged AS (
      SELECT item, 0 AS grp, pos AS ord FROM pin_items
      UNION ALL
      SELECT value AS item, 1 AS grp, ord FROM jsonb_array_elements(v_items) WITH ORDINALITY AS x(value, ord)
      WHERE NOT ((value->>'id')::uuid IN (SELECT related_entity_id FROM pinned))
    )
    SELECT COALESCE(jsonb_agg(item ORDER BY grp, ord), '[]'::jsonb) INTO v_items
    FROM (SELECT item, grp, ord FROM merged ORDER BY grp, ord LIMIT v_limit) final;

    v_strategy := 'manual-pin';
    v_rationale := 'Selección editorial + coincidencias automáticas';
  END IF;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'strategy', v_strategy,
    'rationale', v_rationale,
    'context', p_context
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.related_get_collection(public.related_entity_kind, uuid, text, jsonb, integer) TO anon, authenticated, service_role;
