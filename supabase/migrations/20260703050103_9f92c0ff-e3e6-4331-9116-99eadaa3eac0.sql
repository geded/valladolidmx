-- US-R1 (b) · Modelo Unificado en page_compositions.
-- Añade kind/is_template/template_of_kind y amplía status con 'archived'.
-- Aditivo, sin borrar datos, sin cambiar políticas ni GRANTs existentes.

ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS kind public.eb_page_kind,
  ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_of_kind public.eb_page_kind;

-- Backfill kind desde page_type (texto libre) al enum canónico.
UPDATE public.page_compositions
   SET kind = CASE
     WHEN page_type = 'home' THEN 'home'::public.eb_page_kind
     WHEN page_type = 'marketplace' THEN 'marketplace'::public.eb_page_kind
     WHEN page_type = 'landing' THEN 'landing'::public.eb_page_kind
     WHEN page_type = 'institutional' THEN 'institutional'::public.eb_page_kind
     WHEN page_type = 'campaign' THEN 'campaign'::public.eb_page_kind
     WHEN page_type = 'destination' THEN 'destination'::public.eb_page_kind
     WHEN page_type = 'business' THEN 'business'::public.eb_page_kind
     WHEN page_type = 'product' THEN 'product'::public.eb_page_kind
     WHEN page_type = 'event' THEN 'event'::public.eb_page_kind
     WHEN page_type = 'hotel' THEN 'hotel'::public.eb_page_kind
     WHEN page_type = 'restaurant' THEN 'restaurant'::public.eb_page_kind
     WHEN page_type = 'experience' THEN 'experience'::public.eb_page_kind
     WHEN page_type = 'route' THEN 'route'::public.eb_page_kind
     WHEN page_type = 'microsite' THEN 'microsite'::public.eb_page_kind
     WHEN page_type = 'alux' THEN 'alux'::public.eb_page_kind
     WHEN page_type = 'trip_builder' THEN 'trip_builder'::public.eb_page_kind
     WHEN page_type = 'promo' THEN 'promo'::public.eb_page_kind
     WHEN page_type = 'wedding' THEN 'wedding'::public.eb_page_kind
     WHEN page_type = 'ai_generated' THEN 'ai_generated'::public.eb_page_kind
     WHEN page_type = 'site_section' THEN 'site_section'::public.eb_page_kind
     ELSE 'custom'::public.eb_page_kind
   END
 WHERE kind IS NULL;

ALTER TABLE public.page_compositions
  ALTER COLUMN kind SET DEFAULT 'custom'::public.eb_page_kind,
  ALTER COLUMN kind SET NOT NULL;

-- Estado ampliado: draft | published | archived. No forzar rows existentes.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'page_compositions_status_chk'
      AND conrelid = 'public.page_compositions'::regclass
  ) THEN
    ALTER TABLE public.page_compositions
      ADD CONSTRAINT page_compositions_status_chk
      CHECK (status IN ('draft','published','archived'));
  END IF;
END $$;

-- Coherencia: si is_template=true, template_of_kind = kind (o el declarado).
-- Regla suave vía CHECK: cuando is_template=false, template_of_kind puede ser NULL.
-- No forzamos igualdad para permitir plantillas multi-kind en el futuro.

CREATE INDEX IF NOT EXISTS idx_page_compositions_kind
  ON public.page_compositions(kind);
CREATE INDEX IF NOT EXISTS idx_page_compositions_is_template
  ON public.page_compositions(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS idx_page_compositions_status
  ON public.page_compositions(status);

COMMENT ON COLUMN public.page_compositions.kind IS
  'US-R1 · Tipo canónico interno del Experience Builder (Recovery Plan §1). page_type queda como legacy hasta que todas las server fns lean kind.';
COMMENT ON COLUMN public.page_compositions.is_template IS
  'US-R1 · Marca la composición como plantilla reutilizable. Ver Page Kind Registry.';
COMMENT ON COLUMN public.page_compositions.template_of_kind IS
  'US-R1 · Cuando is_template=true, restringe la plantilla al kind indicado.';