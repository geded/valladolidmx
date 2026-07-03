-- US-R3 · Ola 1 (Singletons) — Seed de superficies oficiales.
-- Adopción reproductiva: cada composición contiene un único bloque
-- vmx.surface.* que renderiza la plantilla oficial existente.
-- Idempotente: si ya existe una composición con el slug, no se toca.
DO $mig$
DECLARE
  _defs jsonb := jsonb_build_array(
    jsonb_build_object(
      'slug','marketplace','title','Marketplace',
      'description','Vitrina pública del destino.',
      'kind','marketplace','block_type','vmx.surface.marketplace',
      'node_id','sfc_marketplace'
    ),
    jsonb_build_object(
      'slug','alux','title','Alux',
      'description','Inteligencia del Oriente Maya.',
      'kind','alux','block_type','vmx.surface.alux',
      'node_id','sfc_alux'
    ),
    jsonb_build_object(
      'slug','arma-tu-viaje','title','Arma tu Viaje',
      'description','Tu expediente personal del Oriente Maya.',
      'kind','trip_builder','block_type','vmx.surface.trip-planner',
      'node_id','sfc_trip_planner'
    )
  );
  _def jsonb;
  _comp_id uuid;
  _rev_id uuid;
  _snapshot jsonb;
BEGIN
  FOR _def IN SELECT * FROM jsonb_array_elements(_defs) LOOP
    SELECT id INTO _comp_id
      FROM public.page_compositions
     WHERE slug = _def->>'slug'
     LIMIT 1;
    IF _comp_id IS NOT NULL THEN CONTINUE; END IF;

    _snapshot := jsonb_build_object(
      'root', jsonb_build_object(
        'children', jsonb_build_array(
          jsonb_build_object(
            'id',      _def->>'node_id',
            'type',    _def->>'block_type',
            'version', '1.0.0',
            'config',  '{}'::jsonb,
            'children','[]'::jsonb
          )
        )
      )
    );

    INSERT INTO public.page_compositions
      (slug, title, description, page_type, status, kind, current_draft, published_at)
    VALUES
      (_def->>'slug', _def->>'title', _def->>'description',
       _def->>'kind', 'published',
       (_def->>'kind')::public.eb_page_kind,
       _snapshot, now())
    RETURNING id INTO _comp_id;

    INSERT INTO public.page_revisions
      (composition_id, revision_number, snapshot, notes)
    VALUES
      (_comp_id, 1, _snapshot, 'US-R3 · Ola 1 seed (adopción reproductiva)')
    RETURNING id INTO _rev_id;

    UPDATE public.page_compositions
       SET active_revision_id = _rev_id
     WHERE id = _comp_id;
  END LOOP;
END
$mig$;