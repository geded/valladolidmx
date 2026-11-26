DO $migration$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.concierge_order_mark_paid_cash(uuid,text)'::regprocedure) INTO definition;
  IF position('IF v_order.user_id <> v_uid AND NOT v_is_ops THEN' in definition) > 0 THEN
    definition := replace(definition, 'IF v_order.user_id <> v_uid AND NOT v_is_ops THEN', 'IF v_order.user_id IS DISTINCT FROM v_uid AND NOT v_is_ops THEN');
    EXECUTE definition;
  ELSIF position('IF v_order.user_id IS DISTINCT FROM v_uid AND NOT v_is_ops THEN' in definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected cash receipt authority; review before migration';
  END IF;
END;
$migration$;
REVOKE ALL ON FUNCTION public.concierge_order_mark_paid_cash(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concierge_order_mark_paid_cash(uuid,text) TO authenticated, service_role;