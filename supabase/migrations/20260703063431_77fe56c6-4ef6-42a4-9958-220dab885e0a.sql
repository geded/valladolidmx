
CREATE TABLE IF NOT EXISTS public.page_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL,
  to_path text NOT NULL,
  page_composition_id uuid NULL REFERENCES public.page_compositions(id) ON DELETE SET NULL,
  reason text NULL,
  active boolean NOT NULL DEFAULT true,
  http_status smallint NOT NULL DEFAULT 301,
  created_by uuid NULL REFERENCES auth.users(id),
  updated_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT page_redirects_from_to_diff CHECK (from_path <> to_path),
  CONSTRAINT page_redirects_status_chk CHECK (http_status IN (301, 302, 307, 308, 410))
);

CREATE UNIQUE INDEX IF NOT EXISTS page_redirects_from_active_uniq
  ON public.page_redirects (from_path) WHERE active;
CREATE INDEX IF NOT EXISTS page_redirects_to_idx ON public.page_redirects (to_path);
CREATE INDEX IF NOT EXISTS page_redirects_composition_idx ON public.page_redirects (page_composition_id);

GRANT SELECT ON public.page_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_redirects TO authenticated;
GRANT ALL ON public.page_redirects TO service_role;

ALTER TABLE public.page_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_redirects public read active"
  ON public.page_redirects FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "page_redirects editorial manage"
  ON public.page_redirects FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'editor')
  );

CREATE OR REPLACE FUNCTION public.page_redirects_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_page_redirects_updated_at ON public.page_redirects;
CREATE TRIGGER trg_page_redirects_updated_at
  BEFORE UPDATE ON public.page_redirects
  FOR EACH ROW EXECUTE FUNCTION public.page_redirects_touch_updated_at();

ALTER TABLE public.page_compositions
  ADD COLUMN IF NOT EXISTS canonical_override text NULL,
  ADD COLUMN IF NOT EXISTS robots_directive text NOT NULL DEFAULT 'index,follow',
  ADD COLUMN IF NOT EXISTS sitemap_changefreq text NULL,
  ADD COLUMN IF NOT EXISTS sitemap_priority numeric(2,1) NULL,
  ADD COLUMN IF NOT EXISTS previous_slug text NULL;

ALTER TABLE public.page_compositions
  DROP CONSTRAINT IF EXISTS page_compositions_sitemap_changefreq_chk;
ALTER TABLE public.page_compositions
  ADD CONSTRAINT page_compositions_sitemap_changefreq_chk
  CHECK (sitemap_changefreq IS NULL OR sitemap_changefreq IN
    ('always','hourly','daily','weekly','monthly','yearly','never'));

ALTER TABLE public.page_compositions
  DROP CONSTRAINT IF EXISTS page_compositions_sitemap_priority_chk;
ALTER TABLE public.page_compositions
  ADD CONSTRAINT page_compositions_sitemap_priority_chk
  CHECK (sitemap_priority IS NULL OR (sitemap_priority >= 0 AND sitemap_priority <= 1));

CREATE OR REPLACE FUNCTION public.eb_page_slug_redirect_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    NEW.previous_slug := OLD.slug;
    INSERT INTO public.page_redirects (from_path, to_path, page_composition_id, reason, active, http_status, created_by)
    VALUES ('/' || OLD.slug, '/' || NEW.slug, NEW.id, 'slug_rename', true, 301, NEW.updated_by)
    ON CONFLICT DO NOTHING;
    UPDATE public.page_redirects
      SET to_path = '/' || NEW.slug, updated_at = now()
      WHERE to_path = '/' || OLD.slug AND from_path <> '/' || NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_compositions_slug_redirect ON public.page_compositions;
CREATE TRIGGER trg_page_compositions_slug_redirect
  BEFORE UPDATE OF slug ON public.page_compositions
  FOR EACH ROW EXECUTE FUNCTION public.eb_page_slug_redirect_trigger();

CREATE OR REPLACE FUNCTION public.eb_resolve_public_route(_path text)
RETURNS TABLE (
  resolved_kind text,
  target_path text,
  is_redirect boolean,
  http_status smallint,
  composition_id uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_from text := _path;
  v_hop_limit int := 5;
  v_hops int := 0;
  v_next text;
  v_status smallint;
  v_composition_id uuid;
  v_kind text;
BEGIN
  LOOP
    SELECT to_path, http_status INTO v_next, v_status
      FROM public.page_redirects
     WHERE from_path = v_from AND active = true
     LIMIT 1;
    EXIT WHEN v_next IS NULL;
    v_from := v_next;
    v_hops := v_hops + 1;
    EXIT WHEN v_hops >= v_hop_limit;
  END LOOP;

  IF v_hops > 0 THEN
    resolved_kind := NULL; target_path := v_from; is_redirect := true;
    http_status := COALESCE(v_status, 301); composition_id := NULL;
    RETURN NEXT; RETURN;
  END IF;

  SELECT id, kind::text INTO v_composition_id, v_kind
    FROM public.page_compositions
   WHERE status = 'published' AND slug = regexp_replace(v_from, '^/', '')
   LIMIT 1;

  IF v_composition_id IS NOT NULL THEN
    resolved_kind := v_kind; target_path := v_from; is_redirect := false;
    http_status := 200; composition_id := v_composition_id;
    RETURN NEXT; RETURN;
  END IF;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eb_resolve_public_route(text) TO anon, authenticated;
