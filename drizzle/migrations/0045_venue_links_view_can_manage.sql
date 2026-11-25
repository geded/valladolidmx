CREATE OR REPLACE FUNCTION public.business_venue_links_view(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN NOT (public.is_editor_or_admin(auth.uid())
                       OR public.has_business_access(auth.uid(), _business_id, 'viewer'))
    THEN jsonb_build_object('error', 'No tienes acceso a este negocio.')
    ELSE jsonb_build_object(
      'can_manage', (public.is_editor_or_admin(auth.uid())
                     OR public.has_business_access(auth.uid(), _business_id, 'editor')),
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