-- US-R3 · Ola 2 · Sub-ola 2.1 — Seed de plantillas oficiales por kind.
-- Modelo aprobado: 1 plantilla por kind + resolución por slug + 0
-- composiciones por registro. Cada plantilla contiene UN bloque de
-- superficie (`vmx.surface.region` / `vmx.surface.destination`) que
-- reproduce fielmente la implementación actual. Los slugs `__tpl_*__`
-- son internos (no se sirven como URL pública) y las rutas
-- `/oriente-maya/*` los cargan por kind. Idempotente.
DO $mig$
DECLARE
  _defs jsonb := jsonb_build_array(
    jsonb_build_object(
      'slug','__tpl_region__','title','Plantilla · Región',
      'description','Plantilla oficial reproductiva para páginas de regiones turísticas.',
      'kind','region','block_type','vmx.surface.region',
      'node_id','sfc_region'
    ),
    jsonb_build_object(
      'slug','__tpl_destination__','title','Plantilla · Destino',
      'description','Plantilla oficial reproductiva para páginas de destinos.',
      'kind','destination','block_type','vmx.surface.destination',
      'node_id','sfc_destination'
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
       _snapshot, now());

    SELECT id INTO _comp_id FROM public.page_compositions WHERE slug = _def->>'slug' LIMIT 1;

    INSERT INTO public.page_revisions
      (composition_id, revision_number, snapshot, notes)
    VALUES
      (_comp_id, 1, _snapshot, 'US-R3 · Ola 2.1 seed (plantilla por kind)')
    RETURNING id INTO _rev_id;

    UPDATE public.page_compositions
       SET active_revision_id = _rev_id
     WHERE id = _comp_id;
  END LOOP;
END
$mig$;
