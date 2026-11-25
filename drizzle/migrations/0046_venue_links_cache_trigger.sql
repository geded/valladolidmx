CREATE TRIGGER zz_public_read_cache_bust AFTER INSERT OR UPDATE OR DELETE ON public.business_venue_links FOR EACH STATEMENT EXECUTE FUNCTION public.public_read_cache_bust();

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
  RETURN jsonb_build_object('ok', true);
END;
$$;