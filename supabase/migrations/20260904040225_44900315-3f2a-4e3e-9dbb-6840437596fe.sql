ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS filter_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.filter_attributes IS
  'Atributos turísticos administrables y filtrables del producto (contrato tourism_attribute_definitions, family_key=product_type). Aditivo y reversible.';

CREATE INDEX IF NOT EXISTS idx_products_filter_attributes
  ON public.products USING gin (filter_attributes jsonb_path_ops);