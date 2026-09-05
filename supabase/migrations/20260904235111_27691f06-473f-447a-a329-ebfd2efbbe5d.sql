-- Lote 3E · Eje administrable "Tipo de experiencia" (familia experiencias)
-- Aditivo y reversible. Rollback:
--   UPDATE public.products SET filter_attributes = filter_attributes - 'tipo_experiencia'
--     WHERE product_type = 'experiencia' AND is_demo_seed = true;
--   DELETE FROM public.tourism_attribute_definitions
--     WHERE family_key = 'experiencias' AND attribute_key = 'tipo_experiencia';  -- options en cascada

INSERT INTO public.tourism_attribute_definitions
  (family_key, attribute_key, label, help_text, input_type, filter_group, filterable, required, sort_order, active)
VALUES
  ('experiencias', 'tipo_experiencia', 'Tipo de experiencia',
   'Clasificación principal de la vivencia. Se muestra como distintivo en el listado y en la ficha.',
   'single', 'primary', true, false, -10, true)
ON CONFLICT (family_key, attribute_key) DO NOTHING;

INSERT INTO public.tourism_attribute_options (definition_id, value, label, sort_order, active)
SELECT d.id, o.value, o.label, o.sort_order, true
FROM public.tourism_attribute_definitions d
CROSS JOIN (VALUES
  ('arqueologia',          'Arqueología',           0),
  ('cultura-maya',         'Cultura maya',         10),
  ('cultura-y-patrimonio', 'Cultura y patrimonio', 20),
  ('gastronomia',          'Gastronomía',          30),
  ('cenotes-y-naturaleza', 'Cenotes y naturaleza', 40),
  ('artesania-viva',       'Artesanía viva',       50)
) AS o(value, label, sort_order)
WHERE d.family_key = 'experiencias' AND d.attribute_key = 'tipo_experiencia'
ON CONFLICT (definition_id, value) DO NOTHING;

-- Relocalización (sólo registros DEMO que ya declaraban su tipo en metadata).
UPDATE public.products p
SET filter_attributes = coalesce(p.filter_attributes, '{}'::jsonb)
  || jsonb_build_object('tipo_experiencia', m.value),
    updated_at = now()
FROM (VALUES
  ('Arqueología',          'arqueologia'),
  ('Cultura maya',         'cultura-maya'),
  ('Cultura y patrimonio', 'cultura-y-patrimonio'),
  ('Gastronomía',          'gastronomia'),
  ('Cenotes y naturaleza', 'cenotes-y-naturaleza'),
  ('Artesanía viva',       'artesania-viva')
) AS m(label, value)
WHERE p.product_type = 'experiencia'
  AND p.is_demo_seed = true
  AND p.deleted_at IS NULL
  AND p.metadata->>'category_label' = m.label
  AND NOT (coalesce(p.filter_attributes, '{}'::jsonb) ? 'tipo_experiencia');