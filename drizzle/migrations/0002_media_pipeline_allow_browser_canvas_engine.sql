ALTER TABLE public.media_asset_variants DROP CONSTRAINT media_asset_variants_engine_check;
ALTER TABLE public.media_asset_variants ADD CONSTRAINT media_asset_variants_engine_check
  CHECK (engine = ANY (ARRAY['cloudflare'::text, 'sharp'::text, 'benchmark'::text, 'browser-canvas'::text]));
ALTER TABLE public.media_assets DROP CONSTRAINT media_assets_pipeline_engine_check;
ALTER TABLE public.media_assets ADD CONSTRAINT media_assets_pipeline_engine_check
  CHECK (pipeline_engine IS NULL OR pipeline_engine = ANY (ARRAY['cloudflare'::text, 'sharp'::text, 'benchmark'::text, 'browser-canvas'::text]));