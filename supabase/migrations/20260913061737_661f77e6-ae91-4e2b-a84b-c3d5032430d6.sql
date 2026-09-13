DO $$
DECLARE
  v_comp uuid := gen_random_uuid();
  v_rev uuid := gen_random_uuid();
  v_tree jsonb := jsonb_build_object(
    'root', jsonb_build_object('children', jsonb_build_array(
      jsonb_build_object(
        'id','place-premium',
        'type','vmx.place.premium-q2d',
        'version','1.0.0',
        'children', jsonb_build_array(),
        'config', jsonb_build_object(
          'variant','lugar-premium-q2d-approved',
          'copy_gallery_heading','Conoce {lugar}',
          'copy_services_kicker','Servicios',
          'copy_services_title','Servicios disponibles',
          'copy_experiences_kicker','Planea tu visita',
          'copy_experiences_title','Experiencias y tours relacionados',
          'copy_events_kicker','Agenda',
          'copy_events_title','Eventos relacionados',
          'copy_nearby_businesses_heading','Qué hay cerca de {lugar}',
          'copy_nearby_businesses_subheading','Lugares para comer, dormir y seguir explorando a pocos pasos, según su ubicación real.',
          'copy_nearby_group_comer','Dónde comer',
          'copy_nearby_group_dormir','Dónde dormir',
          'copy_nearby_group_hacer','Qué hacer',
          'copy_nearby_group_comprar','Compras y artesanía',
          'copy_nearby_group_otros','Más cerca de aquí',
          'copy_nearby_places_kicker','Alrededor',
          'copy_nearby_places_title','Lugares cercanos'
        )
      )
    ))
  );
BEGIN
  IF EXISTS (SELECT 1 FROM public.page_compositions WHERE slug = '__tpl_place__') THEN
    RETURN;
  END IF;

  INSERT INTO public.page_compositions
    (id, slug, title, description, status, page_type, kind, variant_key, current_draft, published_at)
  VALUES
    (v_comp, '__tpl_place__', 'Plantilla · Lugar',
     'Plantilla oficial de la ficha de lugares y sitios de interés.',
     'published', 'place', 'place'::eb_page_kind, 'default', v_tree, now());

  INSERT INTO public.page_revisions (id, composition_id, revision_number, snapshot, notes)
  VALUES (v_rev, v_comp, 1, v_tree, 'Plantilla inicial de lugar (textos aprobados vigentes).');

  UPDATE public.page_compositions SET active_revision_id = v_rev WHERE id = v_comp;
END $$;