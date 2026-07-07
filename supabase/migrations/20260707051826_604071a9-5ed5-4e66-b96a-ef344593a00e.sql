DO $$
DECLARE
  v_composition_id uuid;
  v_current_active uuid;
  v_new_revision   uuid := gen_random_uuid();
  v_snapshot       jsonb := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object(
          'id','de-hero','type','vmx.kit.hero','version','1.0.0',
          'config', jsonb_build_object(
            'eyebrow','${destination.region}',
            'title','${destination.name}',
            'subtitle','${destination.tagline}'
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-gallery','type','vmx.kit.gallery','version','1.0.0',
          'config', jsonb_build_object(
            'items', jsonb_build_array(),
            'empty_label','Sube fotos del destino desde el CMS de destinos.'
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-about','type','vmx.kit.rich-text','version','1.0.0',
          'config', jsonb_build_object(
            'heading','El destino',
            'body','${destination.description}'
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-highlights','type','vmx.kit.card-grid','version','1.0.0',
          'config', jsonb_build_object(
            'columns','3',
            'items', jsonb_build_array(),
            'empty_label','Agrega puntos de interés desde el CMS de destinos.'
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-info','type','vmx.kit.info-table','version','1.0.0',
          'config', jsonb_build_object(
            'rows', jsonb_build_array(
              jsonb_build_object('label','Región','value','${destination.region}'),
              jsonb_build_object('label','Cómo llegar','value',''),
              jsonb_build_object('label','Mejor temporada','value',''),
              jsonb_build_object('label','Duración sugerida','value','')
            )
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-location','type','vmx.kit.location','version','1.0.0',
          'config', jsonb_build_object(
            'address_line1','${destination.name}, Yucatán, México'
          ),
          'children', jsonb_build_array()
        ),
        jsonb_build_object(
          'id','de-faq','type','vmx.kit.faq','version','1.0.0',
          'config', jsonb_build_object('items', jsonb_build_array()),
          'children', jsonb_build_array()
        )
      )
    )
  );
BEGIN
  SELECT id, active_revision_id INTO v_composition_id, v_current_active
    FROM public.page_compositions
   WHERE slug = '__tpl_destination__'
   LIMIT 1;

  IF v_composition_id IS NULL THEN
    RAISE NOTICE 'Plantilla __tpl_destination__ no encontrada — nada que migrar.';
    RETURN;
  END IF;

  UPDATE public.page_compositions
     SET current_draft     = v_snapshot,
         is_template       = true,
         template_of_kind  = 'destination'::public.eb_page_kind,
         status            = 'published',
         updated_at        = now()
   WHERE id = v_composition_id;

  INSERT INTO public.page_revisions
    (id, composition_id, revision_number, snapshot, notes)
  VALUES
    (v_new_revision, v_composition_id,
     (SELECT COALESCE(MAX(revision_number), 0) + 1
        FROM public.page_revisions
       WHERE composition_id = v_composition_id),
     v_snapshot,
     'H-03 · N-Destino · Ola D2.a — Convertida a plantilla editable (kit blocks + tokens de destino).');

  UPDATE public.page_compositions
     SET active_revision_id = v_new_revision
   WHERE id = v_composition_id;
END $$;