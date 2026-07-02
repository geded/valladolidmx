
CREATE TABLE public.ui_translation_cache (
  source_hash text NOT NULL,
  locale text NOT NULL,
  source_text text NOT NULL,
  target_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_hash, locale)
);
GRANT SELECT ON public.ui_translation_cache TO anon, authenticated;
GRANT ALL ON public.ui_translation_cache TO service_role;
ALTER TABLE public.ui_translation_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY ui_translation_cache_public_read ON public.ui_translation_cache
  FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX ui_translation_cache_locale_idx ON public.ui_translation_cache(locale);
