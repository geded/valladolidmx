-- ============================================================
-- 15.10.1 · Fundaciones del Experience Builder
-- ============================================================

-- 0. Helper de updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.eb_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 1. Extender entity_kind para auditoría de bloques
DO $$
BEGIN
  PERFORM 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'entity_kind' AND e.enumlabel = 'block';
  IF NOT FOUND THEN
    ALTER TYPE public.entity_kind ADD VALUE 'block';
  END IF;
END$$;

-- 2-3. Enums
DO $$ BEGIN CREATE TYPE public.block_category AS ENUM ('static', 'smart');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.block_version_status AS ENUM ('active', 'deprecated', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. block_definitions
CREATE TABLE IF NOT EXISTS public.block_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  category public.block_category NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  current_version TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  responsive JSONB NOT NULL DEFAULT '{}'::jsonb,
  i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT block_type_namespaced CHECK (type ~ '^[a-z0-9]+(\.[a-z0-9-]+)+$')
);
GRANT SELECT ON public.block_definitions TO authenticated;
GRANT ALL    ON public.block_definitions TO service_role;
ALTER TABLE public.block_definitions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "block_definitions_editor_read" ON public.block_definitions FOR SELECT TO authenticated
    USING (public.is_editor_or_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "block_definitions_admin_write" ON public.block_definitions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_block_definitions_category
  ON public.block_definitions(category) WHERE is_deprecated = false;

DO $$ BEGIN
  CREATE TRIGGER trg_block_definitions_updated_at
    BEFORE UPDATE ON public.block_definitions
    FOR EACH ROW EXECUTE FUNCTION public.eb_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. block_versions
CREATE TABLE IF NOT EXISTS public.block_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.block_definitions(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  schema JSONB NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  responsive JSONB NOT NULL DEFAULT '{}'::jsonb,
  i18n JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.block_version_status NOT NULL DEFAULT 'active',
  published_by UUID,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE (block_id, version)
);
GRANT SELECT ON public.block_versions TO authenticated;
GRANT ALL    ON public.block_versions TO service_role;
ALTER TABLE public.block_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "block_versions_editor_read" ON public.block_versions FOR SELECT TO authenticated
    USING (public.is_editor_or_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "block_versions_admin_write" ON public.block_versions FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_block_versions_block ON public.block_versions(block_id, published_at DESC);

-- 6. RPC: registrar / actualizar bloque (admin only) + auditoría BEA
CREATE OR REPLACE FUNCTION public.eb_register_block(
  _type TEXT,
  _category public.block_category,
  _display_name TEXT,
  _description TEXT,
  _version TEXT,
  _schema JSONB,
  _capabilities JSONB DEFAULT '{}'::jsonb,
  _data_sources JSONB DEFAULT '[]'::jsonb,
  _constraints JSONB DEFAULT '{}'::jsonb,
  _responsive JSONB DEFAULT '{}'::jsonb,
  _i18n JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _block_id UUID;
  _is_new BOOLEAN := false;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _category = 'smart' AND (jsonb_typeof(_data_sources) <> 'array' OR jsonb_array_length(_data_sources) = 0) THEN
    RAISE EXCEPTION 'smart blocks must declare data_sources';
  END IF;
  IF _category = 'static' AND jsonb_typeof(_data_sources) = 'array' AND jsonb_array_length(_data_sources) > 0 THEN
    RAISE EXCEPTION 'static blocks must not declare data_sources';
  END IF;

  INSERT INTO public.block_definitions(
    type, category, display_name, description, current_version,
    capabilities, data_sources, constraints, responsive, i18n
  ) VALUES (
    _type, _category, _display_name, _description, _version,
    _capabilities, _data_sources, _constraints, _responsive, _i18n
  )
  ON CONFLICT (type) DO UPDATE SET
    category = EXCLUDED.category,
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    current_version = EXCLUDED.current_version,
    capabilities = EXCLUDED.capabilities,
    data_sources = EXCLUDED.data_sources,
    constraints = EXCLUDED.constraints,
    responsive = EXCLUDED.responsive,
    i18n = EXCLUDED.i18n,
    is_deprecated = false,
    updated_at = now()
  RETURNING id INTO _block_id;

  SELECT NOT EXISTS (SELECT 1 FROM public.block_versions WHERE block_id = _block_id) INTO _is_new;

  INSERT INTO public.block_versions(
    block_id, version, schema, capabilities, data_sources,
    constraints, responsive, i18n, published_by
  ) VALUES (
    _block_id, _version, _schema, _capabilities, _data_sources,
    _constraints, _responsive, _i18n, auth.uid()
  )
  ON CONFLICT (block_id, version) DO UPDATE SET
    schema = EXCLUDED.schema,
    capabilities = EXCLUDED.capabilities,
    data_sources = EXCLUDED.data_sources,
    constraints = EXCLUDED.constraints,
    responsive = EXCLUDED.responsive,
    i18n = EXCLUDED.i18n,
    status = 'active';

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, metadata)
  VALUES (
    'block', _block_id,
    CASE WHEN _is_new THEN 'Block.Registered' ELSE 'Block.VersionPublished' END,
    auth.uid(),
    jsonb_build_object('type', _type, 'version', _version, 'category', _category)
  );

  RETURN _block_id;
END;
$$;
REVOKE ALL ON FUNCTION public.eb_register_block(TEXT, public.block_category, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_register_block(TEXT, public.block_category, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated;

-- 7. RPC: deprecar bloque
CREATE OR REPLACE FUNCTION public.eb_deprecate_block(_type TEXT, _reason TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _block_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  UPDATE public.block_definitions SET is_deprecated = true, updated_at = now()
   WHERE type = _type RETURNING id INTO _block_id;
  IF _block_id IS NULL THEN RAISE EXCEPTION 'block not found: %', _type; END IF;
  UPDATE public.block_versions SET status = 'deprecated' WHERE block_id = _block_id AND status = 'active';
  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes, metadata)
  VALUES ('block', _block_id, 'Block.Deprecated', auth.uid(), _reason, jsonb_build_object('type', _type));
END;
$$;
REVOKE ALL ON FUNCTION public.eb_deprecate_block(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_deprecate_block(TEXT, TEXT) TO authenticated;

-- 8. RPC: listar Block Library (editor/admin)
CREATE OR REPLACE FUNCTION public.eb_list_block_library()
RETURNS TABLE (
  id UUID, type TEXT, category public.block_category, display_name TEXT, description TEXT,
  current_version TEXT, capabilities JSONB, data_sources JSONB, constraints JSONB,
  responsive JSONB, i18n JSONB, is_deprecated BOOLEAN, updated_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, type, category, display_name, description, current_version,
         capabilities, data_sources, constraints, responsive, i18n,
         is_deprecated, updated_at
    FROM public.block_definitions
   WHERE EXISTS (
     SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'editor')
   )
   ORDER BY category, type;
$$;
REVOKE ALL ON FUNCTION public.eb_list_block_library() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.eb_list_block_library() TO authenticated;