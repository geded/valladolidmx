CREATE TABLE public.public_read_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.public_read_cache TO service_role;
ALTER TABLE public.public_read_cache ENABLE ROW LEVEL SECURITY;