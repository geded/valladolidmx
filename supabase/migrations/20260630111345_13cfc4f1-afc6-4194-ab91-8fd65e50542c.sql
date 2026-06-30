CREATE OR REPLACE FUNCTION public.founder_dashboard_kpis()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_founder boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  v_is_founder := public.has_role(v_uid, 'super_admin'::public.app_role)
               OR public.has_role(v_uid, 'admin'::public.app_role);
  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'businesses', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.businesses WHERE deleted_at IS NULL),
      'active', (SELECT count(*) FROM public.businesses WHERE deleted_at IS NULL AND status = 'published'::public.content_status)
    ),
    'travelers', jsonb_build_object(
      'total', (SELECT count(*) FROM public.user_roles WHERE role = 'traveler')
    ),
    'concierges', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.user_roles WHERE role IN ('concierge','concierge_lead')),
      'active', (SELECT count(*) FROM public.concierge_profiles WHERE COALESCE(active, true))
    ),
    'cases', jsonb_build_object(
      'total',  (SELECT count(*) FROM public.concierge_cases),
      'open',   (SELECT count(*) FROM public.concierge_cases WHERE status NOT IN ('closed','cancelled')),
      'overdue',(SELECT count(*) FROM public.concierge_cases
                 WHERE status NOT IN ('closed','cancelled')
                   AND target_response_at IS NOT NULL
                   AND target_response_at < now())
    ),
    'proposals', jsonb_build_object(
      'total',    (SELECT count(*) FROM public.concierge_proposals),
      'sent',     (SELECT count(*) FROM public.concierge_proposals WHERE status = 'sent'),
      'accepted', (SELECT count(*) FROM public.concierge_proposals WHERE status = 'accepted')
    ),
    'quotes', jsonb_build_object(
      'total',     (SELECT count(*) FROM public.concierge_quotes),
      'submitted', (SELECT count(*) FROM public.concierge_quotes WHERE status = 'submitted')
    ),
    'orders', jsonb_build_object(
      'total', (SELECT count(*) FROM public.orders),
      'paid',  (SELECT count(*) FROM public.orders WHERE status IN ('paid','fulfilled','completed'))
    ),
    'revenue', jsonb_build_object(
      'gross_cents', COALESCE((SELECT sum(total_amount_cents) FROM public.orders
                                WHERE status IN ('paid','fulfilled','completed')), 0),
      'currency', 'MXN'
    ),
    'system', jsonb_build_object(
      'alerts_open',
        CASE WHEN to_regclass('public.system_alerts') IS NULL THEN 0
             ELSE (SELECT count(*) FROM public.system_alerts WHERE COALESCE(resolved_at IS NULL, true)) END
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;