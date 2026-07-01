
-- 15.10.4d · US-01 · Seed Hero editable en la Página de Inicio
-- Idempotente: sólo siembra si el borrador aún no tiene bloques.

DO $$
DECLARE
  _home_id UUID;
  _hero_tree JSONB := jsonb_build_object(
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
  );
BEGIN
  -- Asegurar composición de Inicio
  SELECT id INTO _home_id
  FROM public.page_compositions
  WHERE page_type = 'home'
  ORDER BY created_at ASC
  LIMIT 1;

  IF _home_id IS NULL THEN
    INSERT INTO public.page_compositions(slug, title, description, page_type, current_draft)
    VALUES (
      'home',
      'Página de Inicio',
      'Página principal pública de Valladolid.mx',
      'home',
      _hero_tree
    )
    RETURNING id INTO _home_id;
  ELSE
    -- Rellenar título si estaba vacío (no destructivo)
    UPDATE public.page_compositions
    SET title = 'Página de Inicio'
    WHERE id = _home_id AND COALESCE(NULLIF(title, ''), '') = '';

    -- Sembrar Hero sólo si el borrador está vacío
    UPDATE public.page_compositions
    SET current_draft = _hero_tree
    WHERE id = _home_id
      AND (
        current_draft IS NULL
        OR jsonb_array_length(COALESCE(current_draft->'root'->'children', '[]'::jsonb)) = 0
      );
  END IF;
END $$;
