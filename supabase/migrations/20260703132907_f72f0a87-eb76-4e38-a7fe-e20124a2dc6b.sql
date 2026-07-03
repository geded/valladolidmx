-- US-R3 · Sub-ola 2.3a — Plantilla Madre Producto.
-- Siembra composición oficial `__tpl_product__` (kind = product) con
-- un árbol editorial granular. La ruta `/producto/{slug}` carga esta
-- plantilla y resuelve el producto por slug (0 composiciones por
-- registro). Idempotente.
DO $mig$
DECLARE
  _slug text := '__tpl_product__';
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
          'id',      'sfc_product_shell',
          'type',    'vmx.product.shell',
          'version', '1.0.0',
          'config',  '{}'::jsonb,
          'children', jsonb_build_array(
            jsonb_build_object('id','ph_hero',    'type','vmx.product.hero',             'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_gallery', 'type','vmx.product.gallery',          'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_price',   'type','vmx.product.price-cta',        'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_desc',    'type','vmx.product.description',      'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_biz',     'type','vmx.product.business-context', 'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_promos',  'type','vmx.product.promos',           'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_reviews', 'type','vmx.product.reviews',          'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_faq',     'type','vmx.product.faq',              'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','ph_related', 'type','vmx.product.related',          'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb)
          )
        )
      )
    )
  );

  INSERT INTO public.page_compositions
    (slug, title, description, page_type, status, kind, current_draft, published_at)
  VALUES
    (_slug, 'Plantilla · Producto',
     'Plantilla madre oficial para toda ficha pública de producto (experiencias, tours, hoteles, restaurantes, cenotes, entradas, servicios y catálogo general).',
     'product', 'published', 'product'::public.eb_page_kind,
     _snapshot, now());

  SELECT id INTO _comp_id FROM public.page_compositions WHERE slug = _slug LIMIT 1;

  INSERT INTO public.page_revisions
    (composition_id, revision_number, snapshot, notes)
  VALUES
    (_comp_id, 1, _snapshot, 'US-R3 · Sub-ola 2.3a seed (Plantilla Madre Producto)')
  RETURNING id INTO _rev_id;

  UPDATE public.page_compositions SET active_revision_id = _rev_id WHERE id = _comp_id;
END
$mig$;