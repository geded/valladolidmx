INSERT INTO public.businesses (id, slug, display_name, tagline, status, verified, destination_id, primary_category_id, published_at, metadata)
SELECT v.id::uuid, v.slug, v.display_name, v.tagline, 'published'::content_status, v.verified,
       d.id, c.id, now(), jsonb_build_object('palette', v.palette, 'home_featured', true, 'seed', true)
FROM (VALUES
  ('55555555-aaaa-4aaa-8aaa-000000000001','hacienda-selva-maya','Hacienda Selva Maya','Hacienda henequenera restaurada con cenote propio.','selva','hoteles','valladolid',true),
  ('55555555-aaaa-4aaa-8aaa-000000000002','cocina-de-dona-elsa','Cocina de Doña Elsa','Recados, panuchos y relleno negro en mesa de barrio.','atardecer','restaurantes','valladolid',false),
  ('55555555-aaaa-4aaa-8aaa-000000000003','manglar-expediciones','Manglar Expediciones','Recorridos guiados por la reserva y la noche bioluminiscente.','cenote','tours','rio-lagartos',true),
  ('55555555-aaaa-4aaa-8aaa-000000000004','taller-de-bordado-uayma','Taller de Bordado Uayma','Aprende hipil y punto de cruz con maestras locales.','territorio','cultura','uayma',false)
) AS v(id, slug, display_name, tagline, palette, cat_slug, dest_slug, verified)
JOIN public.business_categories c ON c.slug = v.cat_slug
JOIN public.destinations d ON d.slug = v.dest_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.business_category_links (business_id, category_id)
SELECT b.id, b.primary_category_id
FROM public.businesses b
WHERE b.slug IN ('hacienda-selva-maya','cocina-de-dona-elsa','manglar-expediciones','taller-de-bordado-uayma')
  AND b.primary_category_id IS NOT NULL
ON CONFLICT DO NOTHING;