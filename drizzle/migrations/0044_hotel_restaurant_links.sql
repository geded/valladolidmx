CREATE TABLE IF NOT EXISTS public.business_venue_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  venue_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT business_venue_links_pair_unique UNIQUE (host_business_id, venue_business_id),
  CONSTRAINT business_venue_links_distinct CHECK (host_business_id <> venue_business_id)
);
CREATE INDEX IF NOT EXISTS business_venue_links_venue_idx ON public.business_venue_links (venue_business_id);
GRANT ALL ON public.business_venue_links TO service_role;
ALTER TABLE public.business_venue_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public._business_venue_actor_ok(_actor uuid, _host uuid, _venue uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _actor IS NOT NULL AND (
    public.is_editor_or_admin(_actor)
    OR (public.has_business_access(_actor, _host, 'editor')
        AND public.has_business_access(_actor, _venue, 'editor'))
  );
$$;
REVOKE ALL ON FUNCTION public._business_venue_actor_ok(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.business_public_venues(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'link_id', l.id, 'id', v.id, 'name', v.display_name, 'slug', v.slug,
      'tagline', COALESCE(v.tagline, ''), 'category_slug', COALESCE(c.slug, ''),
      'destination_slug', COALESCE(d.slug, ''),
      'booking_enabled', public._restaurant_booking_on(v.id)
    ) ORDER BY l.sort_order, v.display_name), '[]'::jsonb)
    FROM public.business_venue_links l
    JOIN public.businesses h ON h.id = l.host_business_id AND h.status = 'published' AND h.deleted_at IS NULL
    JOIN public.businesses v ON v.id = l.venue_business_id AND v.status = 'published' AND v.deleted_at IS NULL
    LEFT JOIN public.business_categories c ON c.id = v.primary_category_id
    JOIN public.destinations d ON d.id = v.destination_id
   WHERE l.host_business_id = _business_id;
$$;

CREATE OR REPLACE FUNCTION public.business_public_hosts(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'link_id', l.id, 'id', h.id, 'name', h.display_name, 'slug', h.slug,
      'tagline', COALESCE(h.tagline, ''), 'category_slug', COALESCE(hc.slug, ''),
      'destination_slug', COALESCE(d.slug, '')
    ) ORDER BY l.sort_order, h.display_name), '[]'::jsonb)
    FROM public.business_venue_links l
    JOIN public.businesses v ON v.id = l.venue_business_id AND v.status = 'published' AND v.deleted_at IS NULL
    JOIN public.businesses h ON h.id = l.host_business_id AND h.status = 'published' AND h.deleted_at IS NULL
    LEFT JOIN public.business_categories hc ON hc.id = h.primary_category_id
    JOIN public.destinations d ON d.id = h.destination_id
   WHERE l.venue_business_id = _business_id;
$$;

CREATE OR REPLACE FUNCTION public.business_venue_links_view(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN NOT (public.is_editor_or_admin(auth.uid())
                       OR public.has_business_access(auth.uid(), _business_id, 'viewer'))
    THEN jsonb_build_object('error', 'No tienes acceso a este negocio.')
    ELSE jsonb_build_object(
      'venues', COALESCE((SELECT jsonb_agg(jsonb_build_object('link_id', l.id, 'id', v.id, 'name', v.display_name,
                       'booking_enabled', public._restaurant_booking_on(v.id)) ORDER BY l.sort_order, v.display_name)
                   FROM public.business_venue_links l
                   JOIN public.businesses v ON v.id = l.venue_business_id AND v.deleted_at IS NULL
                  WHERE l.host_business_id = _business_id), '[]'::jsonb),
      'hosts', COALESCE((SELECT jsonb_agg(jsonb_build_object('link_id', l.id, 'id', h.id, 'name', h.display_name)
                   ORDER BY l.sort_order, h.display_name)
                   FROM public.business_venue_links l
                   JOIN public.businesses h ON h.id = l.host_business_id AND h.deleted_at IS NULL
                  WHERE l.venue_business_id = _business_id), '[]'::jsonb)
    ) END;
$$;

CREATE OR REPLACE FUNCTION public.business_venue_candidates(_term text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb) FROM (
    SELECT jsonb_build_object('id', b.id, 'name', b.display_name, 'slug', b.slug,
             'category_slug', COALESCE(c.slug, ''), 'destination_slug', COALESCE(d.slug, '')) AS x
      FROM public.businesses b
      LEFT JOIN public.business_categories c ON c.id = b.primary_category_id
      JOIN public.destinations d ON d.id = b.destination_id
     WHERE b.deleted_at IS NULL AND b.status = 'published'
       AND (public.is_editor_or_admin(auth.uid()) OR public.has_business_access(auth.uid(), b.id, 'viewer'))
       AND (btrim(coalesce(_term, '')) = '' OR b.display_name ILIKE '%' || btrim(_term) || '%')
     LIMIT 12
  ) q;
$$;

CREATE OR REPLACE FUNCTION public.business_venue_link_add(_host uuid, _venue uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_count int; v_id uuid;
BEGIN
  IF _host IS NULL OR _venue IS NULL OR _host = _venue THEN
    RETURN jsonb_build_object('error', 'El hotel y el restaurante deben ser negocios distintos.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _host AND deleted_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = _venue AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object('error', 'No se encontró alguno de los negocios.');
  END IF;
  IF NOT public._business_venue_actor_ok(auth.uid(), _host, _venue) THEN
    RETURN jsonb_build_object('error', 'Necesitas acceso a los dos negocios para vincularlos.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.business_venue_links
              WHERE (host_business_id = _host AND venue_business_id = _venue)
                 OR (host_business_id = _venue AND venue_business_id = _host)) THEN
    RETURN jsonb_build_object('error', 'Ese vínculo ya existe.');
  END IF;
  SELECT count(*) INTO v_count FROM public.business_venue_links WHERE host_business_id = _host;
  IF v_count >= 6 THEN RETURN jsonb_build_object('error', 'Un hotel puede mostrar hasta 6 restaurantes.'); END IF;
  INSERT INTO public.business_venue_links (host_business_id, venue_business_id, created_by)
    VALUES (_host, _venue, auth.uid())
    ON CONFLICT (host_business_id, venue_business_id) DO NOTHING
    RETURNING id INTO v_id;
  PERFORM public.public_read_cache_bust();
  RETURN jsonb_build_object('id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.business_venue_link_remove(_link_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE l public.business_venue_links;
BEGIN
  SELECT * INTO l FROM public.business_venue_links WHERE id = _link_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'El vínculo ya no existe.'); END IF;
  IF NOT public._business_venue_actor_ok(auth.uid(), l.host_business_id, l.venue_business_id) THEN
    RETURN jsonb_build_object('error', 'Necesitas acceso a los dos negocios para quitar el vínculo.');
  END IF;
  DELETE FROM public.business_venue_links WHERE id = _link_id;
  PERFORM public.public_read_cache_bust();
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.business_public_venues(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.business_public_hosts(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.business_venue_links_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_venue_candidates(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_venue_link_add(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.business_venue_link_remove(uuid) TO authenticated;