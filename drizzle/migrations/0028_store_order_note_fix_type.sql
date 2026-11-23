CREATE OR REPLACE FUNCTION public.commerce_set_store_note(_order_id uuid, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_note text := NULLIF(left(btrim(regexp_replace(COALESCE(_note, ''), '\s+', ' ', 'g')), 140), '');
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.concierge_orders o
     WHERE o.id = _order_id AND o.user_id = v_uid
       AND o.status IN ('draft', 'awaiting_payment')
  ) THEN
    RAISE EXCEPTION 'order_not_editable';
  END IF;

  UPDATE public.concierge_order_items i
     SET title = left(split_part(i.title, ' · Nota: ', 1) || COALESCE(' · Nota: ' || v_note, ''), 300),
         metadata = CASE WHEN v_note IS NULL THEN COALESCE(i.metadata, '{}'::jsonb) - 'note'
                         ELSE COALESCE(i.metadata, '{}'::jsonb) || jsonb_build_object('note', v_note) END
   WHERE i.order_id = _order_id
     AND i.entity_kind = 'product'
     AND EXISTS (SELECT 1 FROM public.products p
                  WHERE p.id = i.entity_id AND p.product_type = 'artesanal'::product_type);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.commerce_set_store_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commerce_set_store_note(uuid, text) TO authenticated, service_role;