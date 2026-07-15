-- H3·A4 · M1 · Idempotencia coherente §10 PASOS 1-3 (ADITIVA)
-- Aprobado: PASOS 1-3 aditivos. PASO 4 destructivo (retiro del UNIQUE antiguo)
-- queda diferido a autorización explícita futura.
-- No cambia superficies públicas, no activa el pipeline, no realiza backfill
-- general de derivadas — sólo estructura de versionado sobre 33 filas actuales.
--
-- Checkpoint: rollback textual documentado en la §10.6 del reporte v1.1 y
-- replicado al final de este archivo como comentario para operación rápida.
-- La UNIQUE `media_asset_variants_asset_id_format_width_engine_key` permanece
-- INTACTA. Todos los cambios son ADD COLUMN / CREATE INDEX / UPDATE.
--
-- ============================================================
-- PASO 1a · Columnas base de versionado (SIN variant_key todavía,
-- para que el STORED GENERATED lea valores ya poblados en 1b).
-- ============================================================
ALTER TABLE public.media_asset_variants
  ADD COLUMN IF NOT EXISTS engine_version    text,
  ADD COLUMN IF NOT EXISTS quality_effective int,
  ADD COLUMN IF NOT EXISTS source_checksum   text,
  ADD COLUMN IF NOT EXISTS is_current        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS superseded_at     timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by     uuid REFERENCES public.media_asset_variants(id) ON DELETE SET NULL;

-- ============================================================
-- PASO 2 · Backfill idempotente desde metadata + join a media_assets.
-- ============================================================
UPDATE public.media_asset_variants v
   SET engine_version    = COALESCE(v.engine_version, v.metadata->>'engine_version'),
       quality_effective = COALESCE(v.quality_effective, NULLIF(v.metadata->>'quality','')::int, v.quality),
       source_checksum   = COALESCE(v.source_checksum, a.original_checksum)
  FROM public.media_assets a
 WHERE a.id = v.asset_id
   AND (v.engine_version IS NULL
     OR v.quality_effective IS NULL
     OR v.source_checksum IS NULL);

-- ============================================================
-- PASO 1b · variant_key determinística (STORED GENERATED).
-- Huella completa: asset_id + format + width + height + engine +
-- engine_version + quality_effective + usage_context + source_checksum.
-- Cualquier cambio en original o receta => variant_key distinto.
-- ============================================================
ALTER TABLE public.media_asset_variants
  ADD COLUMN IF NOT EXISTS variant_key text
    GENERATED ALWAYS AS (
      asset_id::text
      || ':fmt=' || format
      || ':w='   || width::text
      || ':h='   || COALESCE(height::text, '-')
      || ':eng=' || engine
      || ':ev='  || COALESCE(engine_version, '-')
      || ':q='   || COALESCE(quality_effective::text, '-')
      || ':uc='  || COALESCE(usage_context, 'generic')
      || ':cs='  || COALESCE(source_checksum, '-')
    ) STORED;

-- ============================================================
-- PASO 3 · Índices dedicados.
--   (a) identidad reproducible: UNIQUE por variant_key
--   (b) variante activa por (asset, format, width, engine, usage_context)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS media_asset_variants_variant_key_ux
  ON public.media_asset_variants(variant_key);

CREATE UNIQUE INDEX IF NOT EXISTS media_asset_variants_current_ux
  ON public.media_asset_variants(asset_id, format, width, engine, (COALESCE(usage_context,'generic')))
  WHERE is_current = true AND status = 'ready';

-- ============================================================
-- Rollback (documentado, NO ejecutar salvo autorización):
--   DROP INDEX IF EXISTS public.media_asset_variants_current_ux;
--   DROP INDEX IF EXISTS public.media_asset_variants_variant_key_ux;
--   ALTER TABLE public.media_asset_variants
--     DROP COLUMN IF EXISTS variant_key,
--     DROP COLUMN IF EXISTS superseded_by,
--     DROP COLUMN IF EXISTS superseded_at,
--     DROP COLUMN IF EXISTS is_current,
--     DROP COLUMN IF EXISTS source_checksum,
--     DROP COLUMN IF EXISTS quality_effective,
--     DROP COLUMN IF EXISTS engine_version;
-- La UNIQUE original (asset_id,format,width,engine) permanece intacta.
-- ============================================================