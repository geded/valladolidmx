
-- ─────────────────────────────────────────────────────────────
-- H3·A3 · Media Intelligence Pipeline (Fase 1 · Semántica)
-- Sin conversiones físicas. Sólo capa semántica.
-- ─────────────────────────────────────────────────────────────

-- 1) Enum de origen del texto ALT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_text_source') THEN
    CREATE TYPE public.media_text_source AS ENUM ('none','ai_pending','ai','human');
  END IF;
END $$;

-- 2) Enum de estado de revisión
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_review_state') THEN
    CREATE TYPE public.media_review_state AS ENUM ('unreviewed','ai_suggested','approved','needs_revision');
  END IF;
END $$;

-- 3) Extender media_assets (aditivo, cero pérdida de datos)
ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS alt_text_ai       text,
  ADD COLUMN IF NOT EXISTS alt_text_locale   text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS alt_text_source   public.media_text_source NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS review_state      public.media_review_state NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by       uuid,
  ADD COLUMN IF NOT EXISTS title             text,
  ADD COLUMN IF NOT EXISTS description       text,
  ADD COLUMN IF NOT EXISTS entity_kind       text,
  ADD COLUMN IF NOT EXISTS entity_id         uuid,
  ADD COLUMN IF NOT EXISTS usage_context     text,
  ADD COLUMN IF NOT EXISTS intelligence      jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: filas existentes con alt_text no nulo se marcan como manual
UPDATE public.media_assets
   SET alt_text_source = 'human',
       review_state    = 'approved'
 WHERE alt_text IS NOT NULL
   AND alt_text <> ''
   AND alt_text_source = 'none';

-- Índices operativos (bajo volumen hoy, imprescindibles a escala)
CREATE INDEX IF NOT EXISTS idx_media_assets_entity
  ON public.media_assets(entity_kind, entity_id)
  WHERE entity_kind IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_review_state
  ON public.media_assets(review_state);
CREATE INDEX IF NOT EXISTS idx_media_assets_alt_source
  ON public.media_assets(alt_text_source);

-- 4) Tabla de traducciones (una fila por (media_id, locale))
CREATE TABLE IF NOT EXISTS public.media_asset_translations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id      uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  locale        text NOT NULL,
  alt_text      text,
  alt_text_ai   text,
  title         text,
  caption       text,
  description   text,
  source        public.media_text_source NOT NULL DEFAULT 'none',
  review_state  public.media_review_state NOT NULL DEFAULT 'unreviewed',
  intelligence  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid,
  updated_by    uuid,
  UNIQUE (media_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_media_asset_translations_media
  ON public.media_asset_translations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_asset_translations_locale
  ON public.media_asset_translations(locale);

-- 5) GRANTs (Data API) — mismo modelo que media_assets
GRANT SELECT ON public.media_asset_translations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_asset_translations TO authenticated;
GRANT ALL ON public.media_asset_translations TO service_role;

-- 6) RLS
ALTER TABLE public.media_asset_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_translations_public_read ON public.media_asset_translations;
CREATE POLICY media_translations_public_read
  ON public.media_asset_translations
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.media_assets m
       WHERE m.id = media_asset_translations.media_id
         AND m.status = 'published'::content_status
         AND m.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS media_translations_editor_manage ON public.media_asset_translations;
CREATE POLICY media_translations_editor_manage
  ON public.media_asset_translations
  FOR ALL
  TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));

-- 7) updated_at trigger
DROP TRIGGER IF EXISTS trg_media_asset_translations_updated_at ON public.media_asset_translations;
CREATE TRIGGER trg_media_asset_translations_updated_at
  BEFORE UPDATE ON public.media_asset_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8) Guardia: nunca degradar 'human' a 'ai' automáticamente
CREATE OR REPLACE FUNCTION public.media_alt_protect_human()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si el registro previo tenía origen 'human' y el nuevo lo pone en 'ai' o 'ai_pending' sin cambio explícito del alt_text,
  -- restauramos el origen humano. La app puede sobrescribir sólo cambiando alt_text a NULL/nuevo valor y source='human'.
  IF TG_OP = 'UPDATE'
     AND OLD.alt_text_source = 'human'
     AND NEW.alt_text_source IN ('ai','ai_pending')
     AND (OLD.alt_text IS NOT DISTINCT FROM NEW.alt_text) THEN
    NEW.alt_text_source := 'human';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_alt_protect_human ON public.media_assets;
CREATE TRIGGER trg_media_alt_protect_human
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.media_alt_protect_human();

DROP TRIGGER IF EXISTS trg_media_translations_protect_human ON public.media_asset_translations;
CREATE TRIGGER trg_media_translations_protect_human
  BEFORE UPDATE ON public.media_asset_translations
  FOR EACH ROW EXECUTE FUNCTION public.media_alt_protect_human();
