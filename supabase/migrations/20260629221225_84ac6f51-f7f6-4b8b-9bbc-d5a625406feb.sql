
-- ============================================================
-- 14.30.5 — Wave 3 · Stage 5 · Galería (Portal Empresarial)
-- Aditivo: storage policies + RPCs SECURITY DEFINER.
-- Sin DDL sobre tablas. Sin cambios a RLS de public.*.
-- ============================================================

-- 1) Storage policies (aditivas) para que un editor de empresa pueda
--    escribir bajo `<business_id>/...` en los buckets `logos` y `gallery`.
--    Los buckets `companies` y `products` ya están cubiertos por Fase 1.

CREATE POLICY "portal business write logos gallery"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('logos','gallery')
  AND public.has_business_access(
        auth.uid(),
        (storage.foldername(name))[1]::uuid,
        'editor'::public.business_user_role
      )
);

CREATE POLICY "portal business update logos gallery"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id IN ('logos','gallery')
  AND public.has_business_access(
        auth.uid(),
        (storage.foldername(name))[1]::uuid,
        'editor'::public.business_user_role
      )
)
WITH CHECK (
  bucket_id IN ('logos','gallery')
  AND public.has_business_access(
        auth.uid(),
        (storage.foldername(name))[1]::uuid,
        'editor'::public.business_user_role
      )
);

CREATE POLICY "portal business delete logos gallery"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id IN ('logos','gallery')
  AND public.has_business_access(
        auth.uid(),
        (storage.foldername(name))[1]::uuid,
        'manager'::public.business_user_role
      )
);

-- 2) RPC: register_business_media
--    El editor sube el archivo via signed upload URL (RLS de storage aplica
--    como user). Tras la subida, llama a esta RPC para crear la fila en
--    media_assets (RLS bloquea INSERT directo a no-editores globales) y
--    vincular en business_media. Validaciones: bucket esperado por rol,
--    MIME y tamaño dentro de límites, path bajo `<business_id>/`.

CREATE OR REPLACE FUNCTION public.register_business_media(
  _business_id uuid,
  _role text,
  _bucket text,
  _path text,
  _mime text,
  _size_bytes bigint,
  _width int DEFAULT NULL,
  _height int DEFAULT NULL,
  _alt_text text DEFAULT NULL,
  _caption text DEFAULT NULL,
  _sort_order int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _expected_bucket text;
  _max_bytes bigint := 10 * 1024 * 1024; -- 10 MB
  _allowed_mime text[] := ARRAY['image/jpeg','image/png','image/webp','image/avif','image/gif'];
  _asset_id uuid;
  _bm_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;

  IF _role NOT IN ('logo','cover','gallery') THEN
    RAISE EXCEPTION 'invalid_media_role' USING ERRCODE='22023';
  END IF;

  _expected_bucket := CASE _role
    WHEN 'logo'    THEN 'logos'
    WHEN 'cover'   THEN 'companies'
    WHEN 'gallery' THEN 'gallery'
  END;

  IF _bucket IS DISTINCT FROM _expected_bucket THEN
    RAISE EXCEPTION 'invalid_bucket_for_role' USING ERRCODE='22023';
  END IF;

  IF _path IS NULL OR length(_path) = 0 OR length(_path) > 500 THEN
    RAISE EXCEPTION 'invalid_path' USING ERRCODE='22023';
  END IF;
  IF position((_business_id::text || '/') in _path) <> 1 THEN
    RAISE EXCEPTION 'path_must_be_scoped_to_business' USING ERRCODE='22023';
  END IF;

  IF _mime IS NULL OR NOT (_mime = ANY(_allowed_mime)) THEN
    RAISE EXCEPTION 'invalid_mime' USING ERRCODE='22023';
  END IF;

  IF _size_bytes IS NULL OR _size_bytes <= 0 OR _size_bytes > _max_bytes THEN
    RAISE EXCEPTION 'invalid_size' USING ERRCODE='22023';
  END IF;

  -- logo/cover deben ser únicos por empresa (replace previo si existe)
  IF _role IN ('logo','cover') THEN
    DELETE FROM public.business_media
     WHERE business_id = _business_id AND role = _role;
  END IF;

  INSERT INTO public.media_assets (
    kind, storage_bucket, storage_path, alt_text, caption,
    mime_type, width, height, size_bytes, status, metadata, created_by, updated_by
  )
  VALUES (
    'image', _bucket, _path,
    NULLIF(left(coalesce(_alt_text,''), 300), ''),
    NULLIF(left(coalesce(_caption,''), 500), ''),
    _mime, _width, _height, _size_bytes,
    'published'::public.content_status,
    jsonb_build_object('source','portal','business_id',_business_id,'role',_role),
    _uid, _uid
  )
  RETURNING id INTO _asset_id;

  INSERT INTO public.business_media (business_id, media_asset_id, role, sort_order)
  VALUES (_business_id, _asset_id, _role, COALESCE(_sort_order,0))
  RETURNING id INTO _bm_id;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('business', _business_id, 'media.create', _uid,
          format('role=%s bucket=%s path=%s', _role, _bucket, _path));

  RETURN jsonb_build_object(
    'business_media_id', _bm_id,
    'media_asset_id', _asset_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.register_business_media(uuid,text,text,text,text,bigint,int,int,text,text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_business_media(uuid,text,text,text,text,bigint,int,int,text,text,int) TO authenticated;

-- 3) RPC: update_business_media_meta (alt, caption, sort_order)
CREATE OR REPLACE FUNCTION public.update_business_media_meta(
  _business_media_id uuid,
  _alt_text text DEFAULT NULL,
  _caption text DEFAULT NULL,
  _sort_order int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _business_id uuid;
  _asset_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;

  SELECT business_id, media_asset_id INTO _business_id, _asset_id
    FROM public.business_media WHERE id = _business_media_id;

  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'media_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;

  UPDATE public.media_assets
     SET alt_text = COALESCE(NULLIF(left(coalesce(_alt_text,''),300),''), alt_text),
         caption  = COALESCE(NULLIF(left(coalesce(_caption,''),500),''), caption),
         updated_by = _uid,
         updated_at = now()
   WHERE id = _asset_id;

  IF _sort_order IS NOT NULL THEN
    UPDATE public.business_media SET sort_order = _sort_order
      WHERE id = _business_media_id;
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('business', _business_id, 'media.update', _uid,
          format('business_media_id=%s', _business_media_id));
END;
$$;

REVOKE ALL ON FUNCTION public.update_business_media_meta(uuid,text,text,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_business_media_meta(uuid,text,text,int) TO authenticated;

-- 4) RPC: remove_business_media (soft-delete del asset + unlink)
CREATE OR REPLACE FUNCTION public.remove_business_media(_business_media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _business_id uuid;
  _asset_id uuid;
  _bucket text;
  _path text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;

  SELECT bm.business_id, bm.media_asset_id, ma.storage_bucket, ma.storage_path
    INTO _business_id, _asset_id, _bucket, _path
    FROM public.business_media bm
    JOIN public.media_assets ma ON ma.id = bm.media_asset_id
   WHERE bm.id = _business_media_id;

  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'media_not_found' USING ERRCODE='P0002';
  END IF;

  IF NOT public.has_business_access(_uid, _business_id, 'editor'::public.business_user_role) THEN
    RAISE EXCEPTION 'forbidden_business_access' USING ERRCODE='42501';
  END IF;

  -- Unlink
  DELETE FROM public.business_media WHERE id = _business_media_id;

  -- Soft-delete del asset si ya no está vinculado a nadie
  IF NOT EXISTS (
    SELECT 1 FROM public.business_media WHERE media_asset_id = _asset_id
  ) THEN
    UPDATE public.media_assets
       SET deleted_at = now(),
           deleted_by = _uid,
           status = 'archived'::public.content_status,
           updated_by = _uid,
           updated_at = now()
     WHERE id = _asset_id;
  END IF;

  INSERT INTO public.content_audit_log(entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('business', _business_id, 'media.delete', _uid,
          format('bucket=%s path=%s', _bucket, _path));
END;
$$;

REVOKE ALL ON FUNCTION public.remove_business_media(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_business_media(uuid) TO authenticated;
