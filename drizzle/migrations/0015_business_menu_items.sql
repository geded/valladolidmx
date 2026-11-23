CREATE TABLE public.business_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT 'Carta' CHECK (char_length(section) BETWEEN 1 AND 80),
  section_order integer NOT NULL DEFAULT 0,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 280),
  price_amount numeric(10,2) CHECK (price_amount IS NULL OR price_amount >= 0),
  price_currency text NOT NULL DEFAULT 'MXN' CHECK (price_currency IN ('MXN','USD')),
  tags text[] NOT NULL DEFAULT '{}',
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

COMMENT ON TABLE public.business_menu_items IS 'Carta de restaurantes y cafeterías: platillos y bebidas por sección con precio de referencia (nunca venta en línea). Fuente única de la carta para CMS, Portal y Alux.';

CREATE INDEX idx_business_menu_items_business ON public.business_menu_items (business_id, section_order, sort_order);

GRANT SELECT ON public.business_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_menu_items TO authenticated;
GRANT ALL ON public.business_menu_items TO service_role;

ALTER TABLE public.business_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_menu_items_public_read ON public.business_menu_items
FOR SELECT TO anon, authenticated USING (
  business_menu_items.is_available
  AND EXISTS (SELECT 1 FROM public.businesses b
              WHERE b.id = business_menu_items.business_id
                AND b.status = 'published' AND b.deleted_at IS NULL)
);

CREATE POLICY business_menu_items_owner_manage ON public.business_menu_items
FOR ALL TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()))
WITH CHECK (public.has_business_access(auth.uid(), business_id, 'editor') OR public.is_editor_or_admin(auth.uid()));

CREATE TRIGGER trg_business_menu_items_updated_at
BEFORE UPDATE ON public.business_menu_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();