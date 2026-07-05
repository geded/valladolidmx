
-- ============================================================
-- E7 · Recommendation Engine v1 · related_recommend_v1
-- ============================================================
-- Reemplaza al MVP related_get_collection en el flujo de bloques
-- oficiales manteniendo el mismo contrato de retorno + adiciones:
--   items[i].score      numeric  (0..N)
--   items[i].reasons    text[]   (etiquetas cortas)
--   items[i].rationale  text     (frase legible)
--
-- Respeta la capa editorial de E6 (pins primero, hides excluidos).
-- Diseñado como fuente única para Alux y futuras iteraciones.
-- ============================================================
CREATE OR REPLACE FUNCTION public.related_recommend_v1(
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
  v_strategy text := 'recommend-v1';
  v_rationale text := 'Ranking por afinidad de categoría, destino, verificación y popularidad';
  v_dest uuid;
  v_region uuid;
  v_category uuid;
  v_hide_ids uuid[] := ARRAY[]::uuid[];
  v_pin_count integer := 0;
  v_limit integer := GREATEST(1, LEAST(COALESCE(p_limit, 8), 24));
BEGIN
  -- Overrides editoriales (E6).
  SELECT COALESCE(array_agg(related_entity_id), ARRAY[]::uuid[])
    INTO v_hide_ids
  FROM public.related_overrides
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    AND surface = p_surface AND mode = 'hide';

  -- Resolver contexto de la ficha origen.
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

  -- Ranking por tipo (business & product implementados en v1).
  IF p_entity_type = 'business' THEN
    WITH scored AS (
      SELECT
        b.id,
        b.display_name AS title,
        b.slug,
        d.name AS subtitle,
        d.slug AS destination_slug,
        b.cover_media_id,
        b.verified,
        (CASE WHEN v_category IS NOT NULL AND b.primary_category_id = v_category THEN 3 ELSE 0 END) +
        (CASE WHEN v_dest IS NOT NULL AND b.destination_id = v_dest THEN 2 ELSE 0 END) +
        (CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 1 ELSE 0 END) +
        (CASE WHEN b.verified THEN 2 ELSE 0 END) +
        (CASE WHEN b.published_at IS NOT NULL AND b.published_at > now() - interval '90 days' THEN 1 ELSE 0 END) +
        (COALESCE((SELECT LEAST(2.0, COUNT(*)::numeric * 0.25) FROM public.reviews r WHERE r.business_id = b.id AND r.status = 'published'), 0))
          AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN v_category IS NOT NULL AND b.primary_category_id = v_category THEN 'same-category' END,
          CASE WHEN v_dest IS NOT NULL AND b.destination_id = v_dest THEN 'same-destination' END,
          CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 'same-region' END,
          CASE WHEN b.verified THEN 'verified' END,
          CASE WHEN b.published_at IS NOT NULL AND b.published_at > now() - interval '90 days' THEN 'recent' END,
          CASE WHEN EXISTS (SELECT 1 FROM public.reviews r WHERE r.business_id = b.id AND r.status = 'published' LIMIT 1) THEN 'popular' END
        ], NULL) AS reasons
      FROM public.businesses b
      LEFT JOIN public.destinations d ON d.id = b.destination_id
      WHERE b.id <> p_entity_id
        AND b.status = 'published'
        AND b.deleted_at IS NULL
        AND NOT (b.id = ANY(v_hide_ids))
        AND (
          (v_dest IS NOT NULL AND b.destination_id = v_dest)
          OR (v_region IS NOT NULL AND d.tourism_region_id = v_region)
        )
    )
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT
        id, 'business'::text AS entity_type, title, subtitle, slug,
        destination_slug, cover_media_id, verified, score, reasons,
        (
          CASE WHEN 'same-category' = ANY(reasons) THEN 'Misma categoría en el destino'
               WHEN 'same-destination' = ANY(reasons) THEN 'Recomendada en el destino'
               WHEN 'same-region' = ANY(reasons) THEN 'Recomendada en la región'
               ELSE 'Sigue descubriendo'
          END ||
          CASE WHEN 'verified' = ANY(reasons) THEN ' · Verificada' ELSE '' END ||
          CASE WHEN 'popular' = ANY(reasons) THEN ' · Con reseñas' ELSE '' END
        ) AS rationale
      FROM scored
      ORDER BY score DESC, verified DESC NULLS LAST, id
      LIMIT v_limit
    ) t;

  ELSIF p_entity_type = 'product' THEN
    WITH scored AS (
      SELECT
        p.id,
        p.name AS title,
        p.slug,
        b.display_name AS subtitle,
        b.slug AS business_slug,
        p.cover_media_id,
        p.price_amount,
        p.price_currency,
        (CASE WHEN v_category IS NOT NULL AND b.primary_category_id = v_category THEN 3 ELSE 0 END) +
        (CASE WHEN v_dest IS NOT NULL AND b.destination_id = v_dest THEN 2 ELSE 0 END) +
        (CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 1 ELSE 0 END) +
        (CASE WHEN b.verified THEN 1 ELSE 0 END) +
        (CASE WHEN p.published_at IS NOT NULL AND p.published_at > now() - interval '90 days' THEN 1 ELSE 0 END)
          AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN v_category IS NOT NULL AND b.primary_category_id = v_category THEN 'same-category' END,
          CASE WHEN v_dest IS NOT NULL AND b.destination_id = v_dest THEN 'same-destination' END,
          CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 'same-region' END,
          CASE WHEN b.verified THEN 'verified-business' END,
          CASE WHEN p.published_at IS NOT NULL AND p.published_at > now() - interval '90 days' THEN 'recent' END
        ], NULL) AS reasons
      FROM public.products p
      JOIN public.businesses b ON b.id = p.business_id
      LEFT JOIN public.destinations d ON d.id = b.destination_id
      WHERE p.id <> p_entity_id
        AND p.status = 'published'
        AND p.deleted_at IS NULL
        AND NOT (p.id = ANY(v_hide_ids))
        AND (
          (v_dest IS NOT NULL AND b.destination_id = v_dest)
          OR (v_region IS NOT NULL AND d.tourism_region_id = v_region)
        )
    )
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT
        id, 'product'::text AS entity_type, title, subtitle, slug, business_slug,
        cover_media_id, price_amount, price_currency, score, reasons,
        (
          CASE WHEN 'same-category' = ANY(reasons) THEN 'Misma categoría en el destino'
               WHEN 'same-destination' = ANY(reasons) THEN 'Recomendado en el destino'
               WHEN 'same-region' = ANY(reasons) THEN 'Recomendado en la región'
               ELSE 'Sigue descubriendo'
          END ||
          CASE WHEN 'verified-business' = ANY(reasons) THEN ' · Empresa verificada' ELSE '' END
        ) AS rationale
      FROM scored
      ORDER BY score DESC, id
      LIMIT v_limit
    ) t;

  ELSIF p_entity_type = 'destination' THEN
    -- v1: reutiliza lógica base (E7.b afinará con señales de tráfico).
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT
        d.id, 'destination'::text AS entity_type, d.name AS title,
        d.tagline AS subtitle, d.slug, d.hero_media_id AS cover_media_id,
        (CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 2 ELSE 0 END) +
        (CASE WHEN d.published_at IS NOT NULL AND d.published_at > now() - interval '180 days' THEN 1 ELSE 0 END)
          AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN v_region IS NOT NULL AND d.tourism_region_id = v_region THEN 'same-region' END,
          CASE WHEN d.published_at IS NOT NULL AND d.published_at > now() - interval '180 days' THEN 'recent' END
        ], NULL) AS reasons,
        'Otro destino del Oriente Maya' AS rationale
      FROM public.destinations d
      WHERE d.id <> p_entity_id
        AND d.status = 'published'
        AND d.deleted_at IS NULL
        AND NOT (d.id = ANY(v_hide_ids))
        AND (v_region IS NULL OR d.tourism_region_id = v_region)
      ORDER BY score DESC, d.published_at DESC NULLS LAST
      LIMIT v_limit
    ) t;

  ELSIF p_entity_type = 'event' THEN
    SELECT jsonb_agg(row_to_json(t)) INTO v_items FROM (
      SELECT
        e.id, 'event'::text AS entity_type, e.title,
        d.name AS subtitle, e.slug, e.starts_at,
        e.cover_media_id, d.slug AS destination_slug,
        (CASE WHEN v_dest IS NOT NULL AND e.destination_id = v_dest THEN 3 ELSE 0 END) +
        (CASE WHEN e.starts_at IS NOT NULL AND e.starts_at > now() THEN 2 ELSE 0 END)
          AS score,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN v_dest IS NOT NULL AND e.destination_id = v_dest THEN 'same-destination' END,
          CASE WHEN e.starts_at IS NOT NULL AND e.starts_at > now() THEN 'upcoming' END
        ], NULL) AS reasons,
        (CASE
          WHEN e.starts_at IS NOT NULL AND e.starts_at > now() THEN 'Próximo evento en el destino'
          ELSE 'Evento del destino'
         END) AS rationale
      FROM public.events e
      LEFT JOIN public.destinations d ON d.id = e.destination_id
      WHERE e.id <> p_entity_id
        AND e.status = 'published'
        AND e.deleted_at IS NULL
        AND NOT (e.id = ANY(v_hide_ids))
        AND (v_dest IS NULL OR e.destination_id = v_dest)
      ORDER BY score DESC, e.starts_at ASC NULLS LAST
      LIMIT v_limit
    ) t;
  END IF;

  v_items := COALESCE(v_items, '[]'::jsonb);

  -- Aplicar pins editoriales (E6) — priorizan sobre el ranking.
  SELECT COUNT(*) INTO v_pin_count FROM public.related_overrides
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
    AND surface = p_surface AND mode = 'pin';

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
        'note', p.note,
        'score', 999,
        'reasons', ARRAY['editorial-pin']::text[],
        'rationale', COALESCE(p.note, 'Selección editorial')
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
    v_strategy := 'recommend-v1+manual-pin';
  END IF;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'strategy', v_strategy,
    'rationale', v_rationale,
    'context', p_context
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.related_recommend_v1(public.related_entity_kind, uuid, text, jsonb, integer) TO anon, authenticated, service_role;
