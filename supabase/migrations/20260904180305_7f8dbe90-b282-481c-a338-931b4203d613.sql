-- Lote 3A · Remediación P0 (aditiva y reversible)

-- 1) Las políticas basadas en permisos dejan de conceder acceso global a business_owner.
DROP POLICY IF EXISTS "businesses_perm_write" ON public.businesses;
CREATE POLICY "businesses_perm_write" ON public.businesses FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'businesses.write'))
WITH CHECK (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'businesses.write'));

DROP POLICY IF EXISTS "products_perm_write" ON public.products;
CREATE POLICY "products_perm_write" ON public.products FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'products.write'))
WITH CHECK (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'products.write'));

DROP POLICY IF EXISTS "promotions_perm_write" ON public.promotions;
CREATE POLICY "promotions_perm_write" ON public.promotions FOR ALL TO authenticated
USING (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'businesses.write'))
WITH CHECK (public.is_editor_or_admin(auth.uid()) AND public.has_permission(auth.uid(), 'businesses.write'));

-- 2) Campos reservados en businesses.
CREATE OR REPLACE FUNCTION public.enforce_reserved_business_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR public.is_editor_or_admin(_uid) THEN
    RETURN NEW;
  END IF;

  IF NEW.verified IS DISTINCT FROM OLD.verified THEN
    RAISE EXCEPTION 'reserved_field:verified' USING ERRCODE = '42501';
  END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'reserved_field:published_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.can_self_publish IS DISTINCT FROM OLD.can_self_publish THEN
    RAISE EXCEPTION 'reserved_field:can_self_publish' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (
       (OLD.status IN ('draft','archived') AND NEW.status = 'in_review')
       OR (OLD.status = 'in_review' AND NEW.status = 'draft')
     ) THEN
    RAISE EXCEPTION 'reserved_field:status' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reserved_business_fields ON public.businesses;
CREATE TRIGGER trg_enforce_reserved_business_fields
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.enforce_reserved_business_fields();

-- 3) Campos reservados en products.
CREATE OR REPLACE FUNCTION public.enforce_reserved_product_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR public.is_editor_or_admin(_uid) THEN
    RETURN NEW;
  END IF;

  IF NEW.visibility_level IS DISTINCT FROM OLD.visibility_level THEN
    RAISE EXCEPTION 'reserved_field:visibility_level' USING ERRCODE = '42501';
  END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'reserved_field:published_at' USING ERRCODE = '42501';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (
       (OLD.status IN ('draft','archived') AND NEW.status = 'in_review')
       OR (OLD.status = 'in_review' AND NEW.status = 'draft')
     ) THEN
    RAISE EXCEPTION 'reserved_field:status' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_reserved_product_fields ON public.products;
CREATE TRIGGER trg_enforce_reserved_product_fields
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.enforce_reserved_product_fields();