-- US-R3 · Ola 2 · Sub-ola 2.2 — Plantilla Madre Business.
-- Siembra composición oficial `__tpl_business__` (kind = business) con
-- un único bloque `vmx.surface.business`. La ruta `/marketplace/{slug}`
-- carga esta plantilla y resuelve el negocio por slug (0 composiciones
-- por registro). Idempotente.
DO $mig$
DECLARE
  _slug text := '__tpl_business__';
  _comp_id uuid;
  _rev_id uuid;
  _snapshot jsonb;
BEGIN
  SELECT id INTO _comp_id FROM public.page_compositions WHERE slug = _slug LIMIT 1;
  IF _comp_id IS NOT NULL THEN RETURN; END IF;

  _snapshot := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object(
          'id',      'sfc_business',
          'type',    'vmx.surface.business',
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
    (_slug, 'Plantilla · Empresa',
     'Plantilla madre oficial para toda ficha de negocio (empresas, hoteles, restaurantes, cenotes, museos, agencias, tours, transportistas, tiendas y servicios).',
     'business', 'published', 'business'::public.eb_page_kind,
     _snapshot, now());

  SELECT id INTO _comp_id FROM public.page_compositions WHERE slug = _slug LIMIT 1;

  INSERT INTO public.page_revisions
    (composition_id, revision_number, snapshot, notes)
  VALUES
    (_comp_id, 1, _snapshot, 'US-R3 · Ola 2.2 seed (Plantilla Madre Business)')
  RETURNING id INTO _rev_id;

  UPDATE public.page_compositions SET active_revision_id = _rev_id WHERE id = _comp_id;
END
$mig$;