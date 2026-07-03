DO $$
DECLARE
  v_composition_id uuid := gen_random_uuid();
  v_revision_id uuid := gen_random_uuid();
  v_snapshot jsonb := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object('id','ev-hero','type','vmx.kit.hero','version','1.0.0','config', jsonb_build_object('eyebrow','Evento','title','Nombre del evento','subtitle','Fecha · Sede · Ciudad'),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-badges','type','vmx.kit.badges','version','1.0.0','config', jsonb_build_object('items', jsonb_build_array()),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-gallery','type','vmx.kit.gallery','version','1.0.0','config', jsonb_build_object('items', jsonb_build_array(),'empty_label','Sube fotos del evento.'),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-about','type','vmx.kit.rich-text','version','1.0.0','config', jsonb_build_object('heading','Sobre el evento','body',''),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-info','type','vmx.kit.info-table','version','1.0.0','config', jsonb_build_object('rows', jsonb_build_array(
          jsonb_build_object('label','Fecha','value',''),
          jsonb_build_object('label','Horario','value',''),
          jsonb_build_object('label','Duración','value',''),
          jsonb_build_object('label','Aforo','value','')
        )),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-location','type','vmx.kit.location','version','1.0.0','config', jsonb_build_object('address_line1',''),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-contact','type','vmx.kit.contact','version','1.0.0','config', jsonb_build_object('contact_type','whatsapp','value',''),'children', jsonb_build_array()),
        jsonb_build_object('id','ev-faq','type','vmx.kit.faq','version','1.0.0','config', jsonb_build_object('items', jsonb_build_array()),'children', jsonb_build_array())
      )
    )
  );
BEGIN
  IF EXISTS (SELECT 1 FROM public.page_compositions WHERE slug = '__tpl_event__') THEN
    RETURN;
  END IF;

  INSERT INTO public.page_compositions (
    id, slug, title, description, status, page_type, kind,
    current_draft, published_at
  ) VALUES (
    v_composition_id, '__tpl_event__', 'Plantilla · Evento',
    'Plantilla oficial (Kit) para fichas públicas de evento.',
    'published', 'event', 'event', v_snapshot, now()
  );

  INSERT INTO public.page_revisions (
    id, composition_id, revision_number, snapshot, notes
  ) VALUES (
    v_revision_id, v_composition_id, 1, v_snapshot,
    'Sprint Reconciliación 4 · Semilla oficial __tpl_event__ (kit blocks).'
  );

  UPDATE public.page_compositions
    SET active_revision_id = v_revision_id
    WHERE id = v_composition_id;
END $$;