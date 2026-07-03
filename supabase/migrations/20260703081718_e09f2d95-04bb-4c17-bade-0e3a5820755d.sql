DO $mig$
DECLARE
  _slug     text := '__tpl_business__';
  _comp_id  uuid;
  _current  jsonb;
  _snapshot jsonb;
  _rev_num  int;
  _rev_id   uuid;
  _child_count int;
  _first_type  text;
BEGIN
  SELECT id, current_draft
    INTO _comp_id, _current
  FROM public.page_compositions
  WHERE slug = _slug
  LIMIT 1;
  IF _comp_id IS NULL THEN RETURN; END IF;

  _child_count := jsonb_array_length(COALESCE(_current -> 'root' -> 'children', '[]'::jsonb));
  _first_type  := _current -> 'root' -> 'children' -> 0 ->> 'type';
  IF _child_count <> 1 OR _first_type <> 'vmx.surface.business' THEN
    RETURN;
  END IF;

  _snapshot := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object(
          'id',      'sfc_business_shell',
          'type',    'vmx.business.shell',
          'version', '1.0.0',
          'config',  '{}'::jsonb,
          'children', jsonb_build_array(
            jsonb_build_object('id','bh_badges', 'type','vmx.business.header-badges','version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_desc',   'type','vmx.business.description',  'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_gal',    'type','vmx.business.gallery',      'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_info',   'type','vmx.business.info',         'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_prods',  'type','vmx.business.products',     'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_promos', 'type','vmx.business.promotions',   'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb),
            jsonb_build_object('id','bh_contact','type','vmx.business.contact',      'version','1.0.0','config','{}'::jsonb,'children','[]'::jsonb)
          )
        )
      )
    )
  );

  UPDATE public.page_compositions
     SET current_draft = _snapshot,
         published_at  = now()
   WHERE id = _comp_id;

  SELECT COALESCE(MAX(revision_number), 0) + 1
    INTO _rev_num
  FROM public.page_revisions
  WHERE composition_id = _comp_id;

  INSERT INTO public.page_revisions
    (composition_id, revision_number, snapshot, notes)
  VALUES
    (_comp_id, _rev_num, _snapshot,
     'US-R3 · Sub-ola 2.2b — árbol editable con 7 bloques granulares')
  RETURNING id INTO _rev_id;

  UPDATE public.page_compositions
     SET active_revision_id = _rev_id
   WHERE id = _comp_id;
END
$mig$;