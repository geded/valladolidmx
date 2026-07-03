
-- ============================================================
-- US-R2 · Panel de Páginas — RPCs de gestión (R2.11–R2.14, R2.23)
-- Todas SECURITY DEFINER, autorización por has_role(auth.uid(),...).
-- No modifican renderer, publicación, workflow ni ciclo de lock.
-- ============================================================

-- Helper: authoriza edición sobre una composición según kind/rol.
CREATE OR REPLACE FUNCTION public.eb_r2_authz(_id uuid, _need_delete boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
  is_super boolean;
  is_editor boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  is_super  := public.has_role(uid, 'super_admin');
  is_admin  := public.has_role(uid, 'admin');
  is_editor := public.has_role(uid, 'editor');
  IF _need_delete THEN
    IF NOT (is_super OR is_admin) THEN
      RAISE EXCEPTION 'forbidden: delete requires admin' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (is_super OR is_admin OR is_editor) THEN
      RAISE EXCEPTION 'forbidden: editor role required' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.page_compositions WHERE id = _id) THEN
    RAISE EXCEPTION 'composition not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_r2_authz(uuid, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_r2_authz(uuid, boolean) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Duplicar composición (R2.11 · Duplicar)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_duplicate_composition(
  _id uuid,
  _new_slug text,
  _new_title text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.page_compositions%ROWTYPE;
  new_id uuid;
BEGIN
  PERFORM public.eb_r2_authz(_id, false);
  SELECT * INTO src FROM public.page_compositions WHERE id = _id;
  IF EXISTS (SELECT 1 FROM public.page_compositions WHERE slug = _new_slug) THEN
    RAISE EXCEPTION 'slug already exists: %', _new_slug USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.page_compositions (
    slug, title, description, status, page_type, current_draft,
    active_revision_id, created_by, updated_by, variant_key,
    workflow_state, kind, is_template, template_of_kind
  ) VALUES (
    _new_slug,
    COALESCE(NULLIF(_new_title, ''), src.title || ' (copia)'),
    src.description,
    'draft',
    src.page_type,
    src.current_draft,
    NULL,
    auth.uid(),
    auth.uid(),
    src.variant_key,
    'draft',
    src.kind,
    false,
    src.template_of_kind
  ) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_duplicate_composition(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_duplicate_composition(uuid, text, text) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Renombrar título (R2.11 · Renombrar)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_rename_composition(
  _id uuid,
  _new_title text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, false);
  IF _new_title IS NULL OR length(btrim(_new_title)) = 0 THEN
    RAISE EXCEPTION 'title cannot be empty' USING ERRCODE = '22023';
  END IF;
  UPDATE public.page_compositions
     SET title = _new_title,
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_rename_composition(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_rename_composition(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Cambiar dirección web (R2.11 · Cambiar dirección web)
-- H-3: US-R2 sólo actualiza el slug. Redirect/canonical/sitemap → US-R3.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_update_composition_slug(
  _id uuid,
  _new_slug text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, false);
  IF _new_slug IS NULL OR length(btrim(_new_slug)) = 0 THEN
    RAISE EXCEPTION 'slug cannot be empty' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.page_compositions WHERE slug = _new_slug AND id <> _id) THEN
    RAISE EXCEPTION 'slug already exists: %', _new_slug USING ERRCODE = '23505';
  END IF;
  UPDATE public.page_compositions
     SET slug = _new_slug,
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_update_composition_slug(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_update_composition_slug(uuid, text) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Archivar (R2.11 · Archivar) — no borra datos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_archive_composition(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, false);
  UPDATE public.page_compositions
     SET status = 'archived',
         active_revision_id = NULL,
         scheduled_publish_at = NULL,
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_archive_composition(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_archive_composition(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Restaurar de archivo (R2.11 · Restaurar) → deja como borrador.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_unarchive_composition(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, false);
  UPDATE public.page_compositions
     SET status = 'draft',
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = _id AND status = 'archived';
END;
$$;

REVOKE ALL ON FUNCTION public.eb_unarchive_composition(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_unarchive_composition(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Eliminar definitivamente (R2.11 · Eliminar) — sólo admin/super_admin.
-- Cascada por FKs existentes (revisiones, comentarios, locks).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_delete_composition(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, true);
  DELETE FROM public.page_revisions WHERE composition_id = _id;
  DELETE FROM public.composition_preview_tokens WHERE composition_id = _id;
  DELETE FROM public.page_compositions WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_delete_composition(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_delete_composition(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Marcar como plantilla (R2.13) — admin/super_admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.eb_mark_composition_as_template(
  _id uuid,
  _is_template boolean,
  _template_of_kind public.eb_page_kind DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.eb_r2_authz(_id, true);
  UPDATE public.page_compositions
     SET is_template = _is_template,
         template_of_kind = COALESCE(_template_of_kind, template_of_kind),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_mark_composition_as_template(uuid, boolean, public.eb_page_kind) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_mark_composition_as_template(uuid, boolean, public.eb_page_kind) TO authenticated, service_role;
