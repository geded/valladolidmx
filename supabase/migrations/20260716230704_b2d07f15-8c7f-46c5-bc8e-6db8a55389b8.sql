INSERT INTO public.destinations (
  tourism_region_id, slug, name, tagline, description, hero_palette, highlights,
  latitude, longitude, status, published_at, metadata
)
SELECT
  '00000003-0000-4000-8000-000000000001'::uuid,
  'chichen-itza',
  'Chichén Itzá',
  'Maravilla del Mundo y corazón ceremonial del Mayab',
  'Ciudad prehispánica declarada Patrimonio de la Humanidad por la UNESCO y una de las Nuevas Siete Maravillas del Mundo Moderno. Su pirámide de Kukulkán protagoniza el equinoccio y concentra siglos de conocimiento astronómico, arquitectónico y ritual del pueblo maya.',
  'territorio',
  ARRAY['Pirámide de Kukulkán','Templo de los Guerreros','Cenote Sagrado','Juego de Pelota','Equinoccio de primavera']::text[],
  20.6843, -88.5678, 'published', now(), '{"seed":"SEO.A2.M1"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.destinations WHERE slug='chichen-itza' AND deleted_at IS NULL);

DO $$
DECLARE v_pc uuid; v_rev uuid; v_next int;
BEGIN
  SELECT id INTO v_pc FROM public.page_compositions WHERE slug='__tpl_destination__';
  IF v_pc IS NULL THEN RETURN; END IF;
  SELECT COALESCE(MAX(revision_number),0)+1 INTO v_next FROM public.page_revisions WHERE composition_id=v_pc;
  INSERT INTO public.page_revisions (composition_id, revision_number, snapshot, notes)
  VALUES (v_pc, v_next,
    jsonb_build_object('root', jsonb_build_object('children', jsonb_build_array(
      jsonb_build_object('id','sfc_destination','type','vmx.surface.destination','config','{}'::jsonb,'version','1.0.0','children','[]'::jsonb)
    ))),
    'SEO.A2.M1 — Territorial Landing MVP: plantilla destino alineada con arquitectura de región.'
  ) RETURNING id INTO v_rev;
  UPDATE public.page_compositions SET active_revision_id=v_rev, updated_at=now() WHERE id=v_pc;
END $$;