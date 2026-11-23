CREATE OR REPLACE FUNCTION public.business_online_sales_public(_business_ids uuid[])
RETURNS TABLE (business_id uuid, modes text[], channels text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.business_id, s.modes, s.channels
    FROM public.business_online_sales s
   WHERE s.enabled
     AND s.business_id = ANY (COALESCE(_business_ids, '{}'::uuid[]))
$$;
GRANT EXECUTE ON FUNCTION public.business_online_sales_public(uuid[]) TO anon, authenticated, service_role;