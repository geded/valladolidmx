DO $$
DECLARE
  v_composition_id uuid := gen_random_uuid();
  v_revision_id   uuid := gen_random_uuid();
  v_snapshot      jsonb := jsonb_build_object(
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
            'empty_label','Sube fotos del destino desde el CMS.'
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
            'empty_label','Agrega puntos de interés desde el CMS.'
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
  IF EXISTS (SELECT 1 FROM public.page_compositions WHERE slug = '__tpl_destination__') THEN
    RETURN;
  END IF;

  INSERT INTO public.page_compositions (
    id, slug, title, description, status, page_type, kind,
    is_template, template_of_kind,
    current_draft, published_at
  ) VALUES (
    v_composition_id,
    '__tpl_destination__',
    'Plantilla · Destino',
    'Plantilla oficial (Kit) para fichas públicas de destino. Editable desde el Experience Builder con vista previa en Valladolid, Izamal y Espita.',
    'published',
    'destination',
    'destination',
    true,
    'destination',
    v_snapshot,
    now()
  );

  INSERT INTO public.page_revisions (
    id, composition_id, revision_number, snapshot, notes
  ) VALUES (
    v_revision_id, v_composition_id, 1, v_snapshot,
    'H-03 · N-Destino · Ola D2.a — Semilla oficial __tpl_destination__ (kit blocks + tokens de destino).'
  );

  UPDATE public.page_compositions
     SET active_revision_id = v_revision_id
   WHERE id = v_composition_id;
END $$;