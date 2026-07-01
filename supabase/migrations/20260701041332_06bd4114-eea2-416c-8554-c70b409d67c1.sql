
-- 15.10.4d · US-01 · Normalizar borrador de Página de Inicio
-- Reemplaza el draft actual (contenía cards de prueba sin referencia real)
-- por un único bloque Hero canónico. Sólo aplica si NO hay revisión publicada.

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
      )
    )
  )
)
WHERE page_type = 'home'
  AND active_revision_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(current_draft->'root'->'children', '[]'::jsonb)) AS child
    WHERE child->>'type' = 'vmx.hero'
  );
