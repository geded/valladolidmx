DO $$
DECLARE
  _comp_id UUID;
  _rev_id UUID;
  _tree JSONB;
BEGIN
  _tree := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object(
          'id','n_seed_hero','type','vmx.hero','version','1.1.0',
          'config', jsonb_build_object(
            'eyebrow','Experiencias que emocionan',
            'title','Despierta en Valladolid y descubre el Oriente Maya',
            'subtitle','Cenotes, ciudades vivas y cultura maya, en una sola experiencia.',
            'cta_label','Explorar destinos',
            'cta_href','/oriente-maya',
            'cta_secondary_label','Arma tu viaje',
            'cta_secondary_href','/arma-tu-viaje'
          )
        ),
        jsonb_build_object('id','n_seed_destinos','type','vmx.section.destinos','version','1.0.0','config', jsonb_build_object('heading','Destinos destacados')),
        jsonb_build_object('id','n_seed_categorias','type','vmx.section.categorias','version','1.0.0','config', jsonb_build_object('heading','Categorías')),
        jsonb_build_object('id','n_seed_rutas','type','vmx.section.rutas','version','1.0.0','config', jsonb_build_object('heading','Rutas sugeridas')),
        jsonb_build_object('id','n_seed_alux','type','vmx.section.consejo-alux','version','1.0.0','config', jsonb_build_object('heading','Consejo de Alux')),
        jsonb_build_object('id','n_seed_atv','type','vmx.section.arma-tu-viaje','version','1.0.0','config', jsonb_build_object('heading','Arma tu viaje','body','Planifica tu experiencia paso a paso.','cta_label','Empezar ahora')),
        jsonb_build_object('id','n_seed_envivo','type','vmx.section.en-vivo','version','1.0.0','config', jsonb_build_object('heading','Oriente Maya EN VIVO')),
        jsonb_build_object('id','n_seed_empresas','type','vmx.section.empresas','version','1.0.0','config', jsonb_build_object('heading','Empresas locales')),
        jsonb_build_object('id','n_seed_resenas','type','vmx.section.resenas','version','1.0.0','config', jsonb_build_object('heading','Lo que dicen nuestros viajeros'))
      )
    )
  );

  SELECT id INTO _comp_id FROM public.page_compositions WHERE slug = 'home' LIMIT 1;

  IF _comp_id IS NULL THEN
    INSERT INTO public.page_compositions(
      slug, title, description, page_type, current_draft, status, variant_key
    ) VALUES (
      'home',
      'Página de Inicio',
      'Home pública oficial · Corrección US-01',
      'home',
      _tree,
      'draft',
      'default'
    ) RETURNING id INTO _comp_id;
  ELSE
    UPDATE public.page_compositions
       SET current_draft = _tree,
           updated_at = now()
     WHERE id = _comp_id
       AND (current_draft IS NULL
            OR (current_draft->'root'->'children') = '[]'::jsonb
            OR jsonb_array_length(current_draft->'root'->'children') = 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.page_compositions
     WHERE page_type = 'home'
       AND COALESCE(variant_key,'default') = 'default'
       AND status = 'published'
  ) THEN
    INSERT INTO public.page_revisions(composition_id, revision_number, snapshot, notes)
    VALUES (_comp_id, 1, _tree, 'Seed inicial · Corrección US-01')
    RETURNING id INTO _rev_id;

    UPDATE public.page_compositions
       SET status = 'published',
           active_revision_id = _rev_id,
           published_at = now()
     WHERE id = _comp_id;

    INSERT INTO public.content_audit_log(entity_kind, entity_id, action, to_status, notes)
    VALUES ('composition', _comp_id, 'Composition.Published', 'published', 'Seed US-01');
  END IF;
END $$;