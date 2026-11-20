CREATE OR REPLACE FUNCTION public.concierge_order_has_business_member(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.concierge_order_items oi
    JOIN public.business_users bu ON bu.business_id = oi.business_id
    WHERE oi.order_id = _order_id
      AND bu.user_id = _user_id
      AND bu.status = 'active'::membership_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.concierge_order_has_business_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS business_reads_own_orders ON public.concierge_orders;
CREATE POLICY business_reads_own_orders ON public.concierge_orders
FOR SELECT TO authenticated
USING (public.concierge_order_has_business_member(id, auth.uid()));