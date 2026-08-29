-- G8-R1-F1B-B4 · Aprobación editorial interna y paquete de reclamación.
-- Aditiva, idempotente y reversible. Cero publicación: status permanece 'draft',
-- robots noindex,nofollow, flag OFF, sin sitemap ni redirects.
DO $$
DECLARE
  r record;
  v_approved text[] := ARRAY[
    'el-sazon-de-valladolid','hotel-olbil','lemuuch-hotel-boutique',
    'sikil-restaurante','sutuk-hotel-valladolid','valladolid-expeditions'];
  v_group_b text[] := ARRAY['hotel-olbil','lemuuch-hotel-boutique','sutuk-hotel-valladolid'];
  v_now timestamptz := now();
  v_decision text;
  v_url text;
  v_cat text;
BEGIN
  FOR r IN
    SELECT b.id, b.slug, b.display_name, b.status, b.source_review_state, b.metadata,
           d.slug AS dest, bc.slug AS cat
      FROM public.businesses b
      LEFT JOIN public.destinations d ON d.id = b.destination_id
      LEFT JOIN public.business_categories bc ON bc.id = b.primary_category_id
     WHERE b.record_origin = 'public_source' AND b.deleted_at IS NULL
  LOOP
    v_cat := coalesce(r.cat, 'empresas');
    v_url := '/oriente-maya/' || coalesce(r.dest, 'valladolid') || '/' || v_cat || '/' || r.slug;

    IF r.slug = ANY (v_approved) THEN
      v_decision := CASE WHEN r.slug = ANY (v_group_b) THEN 'B' ELSE 'A' END;
    ELSE
      v_decision := 'C';
    END IF;

    -- 1 · Paquete de reclamación interno (las 15 fichas).
    UPDATE public.businesses SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'claim_package', jsonb_build_object(
        'batch', 'G8-R1-F1B-B4',
        'generated_at', v_now,
        'name', r.display_name,
        'business_id', r.id,
        'future_url', v_url,
        'internal_claim_link', '/cms/empresas/' || r.id || '/reclamacion',
        'preview_link', '/cms/empresas/' || r.id || '/preview',
        'public_claim_text', '¿Representas a este establecimiento? Administra esta ficha',
        'invitation_text_private', 'Valladolid.mx está preparando una ficha informativa de su establecimiento con datos públicos. Puede verificarla gratuitamente, corregir información y proporcionar fotografías autorizadas antes de su publicación.',
        'contact_sent', false,
        'representation_instructions', jsonb_build_array(
          'Acreditar identidad legal o representación del establecimiento.',
          'Verificar control de un canal oficial declarado en la ficha (dominio, correo corporativo o teléfono publicado).',
          'Firmar la declaración de veracidad y de autorización de uso de fotografías.',
          'Aprobación administrativa interna antes de otorgar administración.',
          'La insignia "Establecimiento verificado" sólo se activa tras acreditar al operador y aprobar administrativamente la relación.'),
        'current_fields', (
          SELECT jsonb_agg(DISTINCT p.field_path)
            FROM public.entity_field_provenance p WHERE p.entity_id = r.id),
        'sources', (
          SELECT jsonb_agg(DISTINCT p.source_url)
            FROM public.entity_field_provenance p WHERE p.entity_id = r.id AND p.source_url IS NOT NULL),
        'pending_data', CASE WHEN r.slug = ANY (v_approved)
          THEN jsonb_build_array('horarios vigentes', 'fotografías autorizadas', 'servicios y categoría confirmados')
          ELSE jsonb_build_array('domicilio exacto', 'coordenadas confirmadas por el operador', 'horarios vigentes', 'fotografías autorizadas', 'servicios y categoría confirmados') END
      ),
      -- 2 · Solicitud de medios (G8-M1 es la única puerta de entrada).
      'media_request', jsonb_build_object(
        'batch', 'G8-R1-F1B-B4',
        'version', 2,
        'intake', 'G8-M1',
        'blocking_for_release_candidate', (v_decision = 'B'),
        'cover_landscape', jsonb_build_object('required', true, 'aspect', '16:9', 'min_px', '2000x1125'),
        'gallery_min', CASE WHEN v_cat = 'hoteles' THEN 6 ELSE 4 END,
        'vertical_mobile', jsonb_build_object('required', (v_cat = 'hoteles'), 'aspect', '4:5', 'min_px', '1200x1500'),
        'min_resolution_px', '1600 en el lado largo',
        'formats', jsonb_build_array('jpg', 'png', 'webp'),
        'requires', jsonb_build_array('autor', 'licencia', 'crédito', 'ALT descriptivo', 'punto focal', 'declaración de autorización'),
        'third_party_download_prohibited', true,
        'sources_prohibited', jsonb_build_array('sitio oficial', 'redes sociales', 'Google', 'OTA')
      )
    ) WHERE id = r.id;

    IF r.slug = ANY (v_approved) THEN
      -- 3 · Transición editorial in_review → approved. status sigue 'draft'.
      UPDATE public.businesses b SET
        source_review_state = 'approved',
        review_notes = 'G8-R1-F1B-B4 · Aprobación editorial interna. No es publicación ni reclamación.',
        metadata = coalesce(b.metadata, '{}'::jsonb) || jsonb_build_object(
          'editorial_approval', jsonb_build_object(
            'batch', 'G8-R1-F1B-B4',
            'decision', v_decision,
            'approved_at', v_now,
            'reviewer', 'editorial_internal',
            'previous_source_review_state', r.source_review_state,
            'publication', false,
            'claim_state', 'unclaimed',
            'badge', false,
            'direct_sale', false,
            'robots', 'noindex,nofollow',
            'minimums', jsonb_build_object(
              'id', true, 'commercial_identity', true, 'category', true, 'destination_zone', true,
              'coordinates', true, 'address', true, 'contact', true,
              'hours', 'sin_horario_publicado_fallback_textual',
              'description', true, 'provenance', true, 'validity', true, 'seo', true,
              'jsonld', true, 'canonical_route', v_url, 'neutral_placeholder', true,
              'discreet_claim', true, 'alux', true, 'save', true, 'add_to_trip', true)))
        WHERE b.id = r.id AND b.source_review_state = 'in_review';

      INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
      VALUES ('business', r.id, 'editorial_source_review_approved',
        'G8-R1-F1B-B4 · in_review → approved. status draft, noindex, unclaimed.',
        jsonb_build_object('batch','G8-R1-F1B-B4','decision',v_decision,
          'rollback', jsonb_build_object('source_review_state', r.source_review_state,
            'review_notes', null, 'metadata_keys_added',
            jsonb_build_array('editorial_approval','claim_package','media_request'))));
    ELSE
      -- 4 · Nueve fichas pendientes: solicitud concreta al operador. Sin regeocodificar.
      UPDATE public.businesses b SET
        metadata = coalesce(b.metadata, '{}'::jsonb) || jsonb_build_object(
          'operator_confirmation_request', jsonb_build_object(
            'batch', 'G8-R1-F1B-B4',
            'created_at', v_now,
            'decision', 'C',
            'geolocation', 'pending_manual_confirmation',
            'automatic_geocoding_disabled', true,
            'territorial_center_approximation_prohibited', true,
            'items', jsonb_build_array(
              'Confirmar la dirección completa (calle, número, cruzamientos, colonia y código postal).',
              'Colocar el pin exacto en el mapa del panel de ubicación.',
              'Compartir las coordenadas verificadas del acceso principal.',
              'Proporcionar contacto vigente (teléfono, WhatsApp, correo y sitio).',
              'Confirmar horarios vigentes y periodos de cierre.',
              'Aportar fotografías propias y la declaración de derechos de uso.',
              'Confirmar la categoría y el listado de servicios ofrecidos.')))
        WHERE b.id = r.id;

      INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
      VALUES ('business', r.id, 'editorial_operator_confirmation_requested',
        'G8-R1-F1B-B4 · Ficha pendiente: permanece draft/in_review/noindex con geolocalización pendiente.',
        jsonb_build_object('batch','G8-R1-F1B-B4','decision','C',
          'rollback', jsonb_build_object('metadata_keys_added',
            jsonb_build_array('operator_confirmation_request','claim_package','media_request'))));
    END IF;
  END LOOP;

  -- Invariante de cierre: ninguna ficha del lote puede quedar publicada.
  IF EXISTS (SELECT 1 FROM public.businesses
              WHERE record_origin = 'public_source' AND status <> 'draft' AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'G8-R1-F1B-B4: publicación detectada en el lote público; abortando.';
  END IF;
END $$;