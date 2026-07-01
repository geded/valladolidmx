
-- 15.10.4d · US-01 · Seed completo de la Página de Inicio
-- Sólo aplica cuando el borrador todavía contiene el hero-solo del seed
-- anterior (1 sólo bloque tipo vmx.hero). No toca borradores editados.

UPDATE public.page_compositions
SET current_draft = jsonb_build_object(
  'root', jsonb_build_object(
    'children', jsonb_build_array(
      jsonb_build_object(
        'id', 'n_hero_seed_1',
        'type', 'vmx.hero',
        'version', '1.0.0',
        'config', jsonb_build_object(
          'eyebrow', 'Experiencias que emocionan',
          'title', 'Despierta en Valladolid y descubre el Oriente Maya de Yucatán.',
          'subtitle', 'Cenotes, ciudades vivas y rutas auténticas más allá de la costumbre.',
          'cta_label', 'Explorar destinos',
          'cta_href', '/oriente-maya',
          'cta_secondary_label', 'Arma tu viaje',
          'cta_secondary_href', '/arma-tu-viaje'
        )
      ),
      jsonb_build_object('id','n_sec_destinos','type','vmx.section.destinos','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_categorias','type','vmx.section.categorias','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_rutas','type','vmx.section.rutas','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_consejo','type','vmx.section.consejo-alux','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_ayv','type','vmx.section.arma-tu-viaje','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_envivo','type','vmx.section.en-vivo','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_empresas','type','vmx.section.empresas','version','1.0.0','config','{}'::jsonb),
      jsonb_build_object('id','n_sec_resenas','type','vmx.section.resenas','version','1.0.0','config','{}'::jsonb)
    )
  )
)
WHERE page_type = 'home'
  AND active_revision_id IS NULL
  AND jsonb_array_length(COALESCE(current_draft->'root'->'children', '[]'::jsonb)) = 1
  AND (current_draft->'root'->'children'->0->>'type') = 'vmx.hero';
