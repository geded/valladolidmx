ALTER TABLE public.alux_public_sessions
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary_message_count integer NOT NULL DEFAULT 0;