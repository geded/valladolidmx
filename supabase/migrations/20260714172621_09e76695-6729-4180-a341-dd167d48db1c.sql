
-- =============================================================================
-- H3·A4 · M0 — Next-Generation Image Pipeline Foundation (aditivo, seguro)
-- =============================================================================

-- 1) Extender media_assets con metadatos de original + estado de pipeline ------
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (pipeline_status IN ('disabled','pending','processing','ready','failed','skipped')),
  ADD COLUMN IF NOT EXISTS pipeline_engine TEXT
    CHECK (pipeline_engine IS NULL OR pipeline_engine IN ('cloudflare','sharp','benchmark')),
  ADD COLUMN IF NOT EXISTS pipeline_last_error TEXT,
  ADD COLUMN IF NOT EXISTS pipeline_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_immutable BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS original_bucket TEXT,
  ADD COLUMN IF NOT EXISTS original_path TEXT,
  ADD COLUMN IF NOT EXISTS original_mime TEXT,
  ADD COLUMN IF NOT EXISTS original_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS original_width INTEGER,
  ADD COLUMN IF NOT EXISTS original_height INTEGER,
  ADD COLUMN IF NOT EXISTS original_checksum TEXT,
  ADD COLUMN IF NOT EXISTS usage_context TEXT
    CHECK (usage_context IS NULL OR usage_context IN
      ('hero','card','gallery','thumbnail','og','editorial','logo','icon','generic'));

CREATE INDEX IF NOT EXISTS idx_media_assets_pipeline_status
  ON public.media_assets (pipeline_status)
  WHERE pipeline_status <> 'disabled';

-- 2) Nueva tabla: variantes derivadas ------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_asset_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('avif','webp','jpeg','png')),
  width INTEGER NOT NULL CHECK (width > 0 AND width <= 4096),
  height INTEGER CHECK (height IS NULL OR (height > 0 AND height <= 4096)),
  quality INTEGER CHECK (quality IS NULL OR (quality BETWEEN 1 AND 100)),
  bytes BIGINT,
  checksum TEXT,
  bucket TEXT NOT NULL DEFAULT 'media-derived',
  path TEXT NOT NULL,
  usage_context TEXT
    CHECK (usage_context IS NULL OR usage_context IN
      ('hero','card','gallery','thumbnail','og','editorial','logo','icon','generic')),
  engine TEXT NOT NULL CHECK (engine IN ('cloudflare','sharp','benchmark')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','ready','failed')),
  error TEXT,
  processing_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, format, width, engine)
);

GRANT SELECT ON public.media_asset_variants TO authenticated;
GRANT ALL ON public.media_asset_variants TO service_role;

ALTER TABLE public.media_asset_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view media variants"
  ON public.media_asset_variants FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  );

CREATE POLICY "Service role manages media variants"
  ON public.media_asset_variants FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_media_variants_asset ON public.media_asset_variants (asset_id);
CREATE INDEX IF NOT EXISTS idx_media_variants_status ON public.media_asset_variants (status)
  WHERE status IN ('pending','processing','failed');
CREATE INDEX IF NOT EXISTS idx_media_variants_lookup
  ON public.media_asset_variants (asset_id, usage_context, format, width)
  WHERE status = 'ready';

CREATE TRIGGER trg_media_variants_updated_at
  BEFORE UPDATE ON public.media_asset_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Nueva tabla: benchmarks comparativos --------------------------------------
CREATE TABLE IF NOT EXISTS public.media_pipeline_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  sample_label TEXT NOT NULL,
  source_bytes BIGINT,
  source_width INTEGER,
  source_height INTEGER,
  engine TEXT NOT NULL CHECK (engine IN ('cloudflare','sharp')),
  format TEXT NOT NULL CHECK (format IN ('avif','webp','jpeg')),
  target_width INTEGER NOT NULL,
  quality INTEGER,
  output_bytes BIGINT,
  processing_ms INTEGER,
  delivery_ms INTEGER,
  psnr NUMERIC(6,2),
  ssim NUMERIC(6,4),
  cache_status TEXT,
  visual_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.media_pipeline_benchmarks TO authenticated;
GRANT ALL ON public.media_pipeline_benchmarks TO service_role;

ALTER TABLE public.media_pipeline_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view media benchmarks"
  ON public.media_pipeline_benchmarks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Service role manages media benchmarks"
  ON public.media_pipeline_benchmarks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_media_benchmarks_run ON public.media_pipeline_benchmarks (run_id);
CREATE INDEX IF NOT EXISTS idx_media_benchmarks_engine_format
  ON public.media_pipeline_benchmarks (engine, format, target_width);

-- 4) Feature flag global (default OFF) -----------------------------------------
-- platform_settings ya existe; usamos su forma key/value estándar si aplica.
-- Insertamos sólo si no existe la clave. (Estructura mínima defensiva.)
DO $$
DECLARE
  has_key_column BOOLEAN;
  has_value_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_settings' AND column_name = 'key'
  ) INTO has_key_column;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_settings' AND column_name = 'value'
  ) INTO has_value_column;

  IF has_key_column AND has_value_column THEN
    INSERT INTO public.platform_settings (key, value)
    SELECT 'media_pipeline_enabled', to_jsonb(false)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.platform_settings WHERE key = 'media_pipeline_enabled'
    );
  END IF;
END $$;

-- 5) Trigger de inmutabilidad del original -------------------------------------
CREATE OR REPLACE FUNCTION public.media_assets_protect_original()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service BOOLEAN;
BEGIN
  is_service := (auth.role() = 'service_role');

  IF COALESCE(OLD.original_immutable, true) AND NOT is_service THEN
    IF NEW.original_path IS DISTINCT FROM OLD.original_path
       OR NEW.original_bucket IS DISTINCT FROM OLD.original_bucket
       OR NEW.original_checksum IS DISTINCT FROM OLD.original_checksum
       OR NEW.original_bytes IS DISTINCT FROM OLD.original_bytes THEN
      RAISE EXCEPTION 'Immutable original: no se puede modificar la fuente física del asset % (Founder Immutable Original Principle). Cree un nuevo asset.', OLD.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_assets_protect_original ON public.media_assets;
CREATE TRIGGER trg_media_assets_protect_original
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.media_assets_protect_original();
