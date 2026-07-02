
CREATE TABLE IF NOT EXISTS public.platform_locales (
  code text PRIMARY KEY,
  label text NOT NULL,
  native_label text NOT NULL,
  flag text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_locales TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_locales TO authenticated;
GRANT ALL ON public.platform_locales TO service_role;

ALTER TABLE public.platform_locales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_locales_public_read_active"
  ON public.platform_locales
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "platform_locales_admin_read_all"
  ON public.platform_locales
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "platform_locales_admin_write"
  ON public.platform_locales
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.platform_locales_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_locales_updated_at ON public.platform_locales;
CREATE TRIGGER trg_platform_locales_updated_at
  BEFORE UPDATE ON public.platform_locales
  FOR EACH ROW EXECUTE FUNCTION public.platform_locales_touch_updated_at();

-- Garantiza que solo exista un default a la vez
CREATE OR REPLACE FUNCTION public.platform_locales_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.platform_locales
      SET is_default = false
      WHERE code <> NEW.code AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_locales_single_default ON public.platform_locales;
CREATE TRIGGER trg_platform_locales_single_default
  AFTER INSERT OR UPDATE OF is_default ON public.platform_locales
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.platform_locales_enforce_single_default();

-- Semilla idempotente
INSERT INTO public.platform_locales (code, label, native_label, flag, is_default, is_active, sort_order)
VALUES
  ('es', 'Español',    'Español',    '🇲🇽', true,  true, 0),
  ('en', 'English',    'English',    '🇺🇸', false, true, 1),
  ('fr', 'French',     'Français',   '🇫🇷', false, true, 2),
  ('de', 'German',     'Deutsch',    '🇩🇪', false, true, 3),
  ('it', 'Italian',    'Italiano',   '🇮🇹', false, true, 4),
  ('pt', 'Portuguese', 'Português',  '🇵🇹', false, true, 5)
ON CONFLICT (code) DO NOTHING;
