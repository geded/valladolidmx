INSERT INTO public.platform_settings (key, value, is_public, description)
VALUES
  ('site.primary_domain', '"quehacerenvalladolid.com"'::jsonb, true, 'Dominio canónico público (SEO, canonical, OpenGraph, correos). Administrable en /cms/configuracion.'),
  ('site.alternate_domains', '""'::jsonb, true, 'Otros dominios conectados que también llevan al sitio, separados por coma.')
ON CONFLICT (key) DO NOTHING;