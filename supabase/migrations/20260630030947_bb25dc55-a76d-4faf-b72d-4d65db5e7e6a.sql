-- 14.40.7 — Etapa 7 · Observabilidad y Hardening

-- 1. marketplace_search_metrics
CREATE TABLE IF NOT EXISTS public.marketplace_search_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  q               text,
  destination_slug text,
  category_slug   text,
  result_count    integer NOT NULL DEFAULT 0,
  duration_ms     integer NOT NULL DEFAULT 0,
  user_id         uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msm_created_at
  ON public.marketplace_search_metrics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msm_zero_results
  ON public.marketplace_search_metrics (created_at DESC)
  WHERE result_count = 0;

GRANT ALL ON public.marketplace_search_metrics TO service_role;
ALTER TABLE public.marketplace_search_metrics ENABLE ROW LEVEL SECURITY;

-- 2. system_alerts
DO $$ BEGIN
  CREATE TYPE public.system_alert_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.system_alert_status AS ENUM ('open','acknowledged','resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.system_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL,
  severity      public.system_alert_severity NOT NULL DEFAULT 'warning',
  status        public.system_alert_status   NOT NULL DEFAULT 'open',
  message       text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurrences   integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  resolved_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_system_alerts_open_kind
  ON public.system_alerts (kind)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_system_alerts_status_last
  ON public.system_alerts (status, last_seen_at DESC);

GRANT ALL ON public.system_alerts TO service_role;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- 3. record_search_metric (server-only)
CREATE OR REPLACE FUNCTION public.record_search_metric(
  p_q text, p_destination_slug text, p_category_slug text,
  p_result_count integer, p_duration_ms integer, p_user_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.marketplace_search_metrics
    (q, destination_slug, category_slug, result_count, duration_ms, user_id)
  VALUES (NULLIF(btrim(p_q),''), p_destination_slug, p_category_slug,
          COALESCE(p_result_count,0), COALESCE(p_duration_ms,0), p_user_id);
$$;
REVOKE ALL ON FUNCTION public.record_search_metric(text,text,text,integer,integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_search_metric(text,text,text,integer,integer,uuid) TO service_role;

-- 4. raise_system_alert (server-only, idempotente por kind mientras open)
CREATE OR REPLACE FUNCTION public.raise_system_alert(
  p_kind text, p_severity public.system_alert_severity, p_message text, p_payload jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.system_alerts (kind, severity, message, payload)
  VALUES (p_kind, p_severity, p_message, COALESCE(p_payload,'{}'::jsonb))
  ON CONFLICT (kind) WHERE status = 'open'
  DO UPDATE SET
    occurrences  = public.system_alerts.occurrences + 1,
    last_seen_at = now(),
    severity     = GREATEST(public.system_alerts.severity::text,
                            EXCLUDED.severity::text)::public.system_alert_severity,
    message      = EXCLUDED.message,
    payload      = EXCLUDED.payload
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.raise_system_alert(text,public.system_alert_severity,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.raise_system_alert(text,public.system_alert_severity,text,jsonb) TO service_role;

-- 5. admin_marketplace_funnel
CREATE OR REPLACE FUNCTION public.admin_marketplace_funnel(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(p_days,1));
  v_searches bigint; v_favorites bigint; v_carts bigint;
  v_pay_init bigint; v_confirmed bigint;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_searches  FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff;
  SELECT count(*) INTO v_favorites FROM public.traveler_favorites         WHERE created_at >= v_cutoff;
  SELECT count(*) INTO v_carts     FROM public.orders WHERE status='cart' AND created_at >= v_cutoff;
  SELECT count(*) INTO v_pay_init  FROM public.orders WHERE payment_status IN ('processing','paid') AND created_at >= v_cutoff;
  SELECT count(*) INTO v_confirmed FROM public.orders WHERE status='confirmed' AND created_at >= v_cutoff;
  RETURN jsonb_build_object(
    'window_days', p_days, 'searches', v_searches, 'favorites', v_favorites,
    'carts', v_carts, 'payments', v_pay_init, 'confirmed', v_confirmed, 'leads', 0);
END; $$;
REVOKE ALL ON FUNCTION public.admin_marketplace_funnel(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_funnel(integer) TO authenticated;

-- 6. admin_top_products
CREATE OR REPLACE FUNCTION public.admin_top_products(
  p_kind text DEFAULT 'most_reserved', p_days integer DEFAULT 30, p_limit integer DEFAULT 10
) RETURNS TABLE (product_id uuid, product_name text, product_slug text, business_name text, metric bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(p_days,1));
  v_limit  int := LEAST(GREATEST(p_limit,1), 50);
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  IF p_kind = 'most_added' THEN
    RETURN QUERY
      SELECT p.id, p.name, p.slug::text, b.display_name, count(*)::bigint
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.created_at >= v_cutoff
      GROUP BY p.id, p.name, p.slug, b.display_name
      ORDER BY count(*) DESC LIMIT v_limit;
  ELSIF p_kind = 'most_abandoned' THEN
    RETURN QUERY
      SELECT p.id, p.name, p.slug::text, b.display_name, count(*)::bigint
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.created_at >= v_cutoff AND o.status = 'cart'
      GROUP BY p.id, p.name, p.slug, b.display_name
      ORDER BY count(*) DESC LIMIT v_limit;
  ELSE
    RETURN QUERY
      SELECT p.id, p.name, p.slug::text, b.display_name, count(*)::bigint
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.products p ON p.id = oi.product_id
      JOIN public.businesses b ON b.id = p.business_id
      WHERE oi.created_at >= v_cutoff AND o.status = 'confirmed'
      GROUP BY p.id, p.name, p.slug, b.display_name
      ORDER BY count(*) DESC LIMIT v_limit;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.admin_top_products(text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_top_products(text,integer,integer) TO authenticated;

-- 7. admin_search_metrics_summary
CREATE OR REPLACE FUNCTION public.admin_search_metrics_summary(p_days integer DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(days => GREATEST(p_days,1));
  v_total bigint; v_zero bigint; v_p50 int; v_p95 int; v_top jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_total FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff;
  SELECT count(*) INTO v_zero  FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff AND result_count = 0;
  SELECT
    COALESCE(percentile_disc(0.5)  WITHIN GROUP (ORDER BY duration_ms),0)::int,
    COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms),0)::int
    INTO v_p50, v_p95
  FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('q', q, 'count', c) ORDER BY c DESC), '[]'::jsonb)
    INTO v_top
  FROM (
    SELECT q, count(*)::bigint AS c
    FROM public.marketplace_search_metrics
    WHERE created_at >= v_cutoff AND result_count = 0 AND q IS NOT NULL
    GROUP BY q ORDER BY count(*) DESC LIMIT 10
  ) t;
  RETURN jsonb_build_object(
    'window_days', p_days, 'total', v_total, 'zero_results', v_zero,
    'zero_results_rate', CASE WHEN v_total>0 THEN round((v_zero::numeric/v_total)*100,2) ELSE 0 END,
    'p50_ms', v_p50, 'p95_ms', v_p95, 'top_zero_terms', v_top);
END; $$;
REVOKE ALL ON FUNCTION public.admin_search_metrics_summary(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_search_metrics_summary(integer) TO authenticated;

-- 8. admin_list_system_alerts
CREATE OR REPLACE FUNCTION public.admin_list_system_alerts(
  p_status text DEFAULT 'open', p_limit integer DEFAULT 100
) RETURNS SETOF public.system_alerts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT * FROM public.system_alerts
    WHERE (p_status IS NULL OR p_status = 'all' OR status::text = p_status)
    ORDER BY last_seen_at DESC
    LIMIT LEAST(GREATEST(p_limit,1), 500);
END; $$;
REVOKE ALL ON FUNCTION public.admin_list_system_alerts(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_system_alerts(text,integer) TO authenticated;

-- 9. admin_acknowledge_system_alert
CREATE OR REPLACE FUNCTION public.admin_acknowledge_system_alert(p_id uuid)
RETURNS public.system_alerts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.system_alerts;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.system_alerts
    SET status='acknowledged', acknowledged_at=now(), acknowledged_by=auth.uid()
    WHERE id=p_id AND status='open' RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.admin_acknowledge_system_alert(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_acknowledge_system_alert(uuid) TO authenticated;

-- 10. admin_resolve_system_alert
CREATE OR REPLACE FUNCTION public.admin_resolve_system_alert(p_id uuid)
RETURNS public.system_alerts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.system_alerts;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.system_alerts
    SET status='resolved', resolved_at=now(), resolved_by=auth.uid()
    WHERE id=p_id AND status<>'resolved' RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.admin_resolve_system_alert(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_system_alert(uuid) TO authenticated;

-- 11. admin_evaluate_functional_alerts (on-demand)
CREATE OR REPLACE FUNCTION public.admin_evaluate_functional_alerts(p_window_minutes integer DEFAULT 60)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cutoff timestamptz := now() - make_interval(mins => GREATEST(p_window_minutes,1));
  v_failed_pays bigint; v_stale_orders bigint;
  v_zero_rate numeric; v_total_search bigint; v_zero_search bigint;
  v_raised int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'forbidden'; END IF;

  SELECT count(*) INTO v_failed_pays FROM public.payment_events
    WHERE event_type='payment_failed' AND received_at >= v_cutoff;
  IF v_failed_pays >= 5 THEN
    PERFORM public.raise_system_alert('payments.failed_spike','critical'::public.system_alert_severity,
      'Incremento de pagos fallidos en la ventana reciente',
      jsonb_build_object('failed', v_failed_pays,'window_minutes',p_window_minutes));
    v_raised := v_raised + 1;
  END IF;

  SELECT count(*) INTO v_stale_orders FROM public.orders
    WHERE status='pending' AND created_at < now() - interval '2 hours';
  IF v_stale_orders >= 10 THEN
    PERFORM public.raise_system_alert('orders.pending_stale','warning'::public.system_alert_severity,
      'Órdenes pendientes fuera de umbral temporal',
      jsonb_build_object('count', v_stale_orders));
    v_raised := v_raised + 1;
  END IF;

  SELECT count(*) INTO v_total_search FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff;
  SELECT count(*) INTO v_zero_search  FROM public.marketplace_search_metrics WHERE created_at >= v_cutoff AND result_count=0;
  v_zero_rate := CASE WHEN v_total_search>0 THEN (v_zero_search::numeric/v_total_search) ELSE 0 END;
  IF v_total_search >= 20 AND v_zero_rate >= 0.4 THEN
    PERFORM public.raise_system_alert('search.zero_results_spike','warning'::public.system_alert_severity,
      'Incremento de búsquedas sin resultados',
      jsonb_build_object('rate', v_zero_rate,'window_minutes', p_window_minutes));
    v_raised := v_raised + 1;
  END IF;

  RETURN jsonb_build_object(
    'window_minutes', p_window_minutes, 'failed_payments', v_failed_pays,
    'stale_orders', v_stale_orders, 'search_total', v_total_search,
    'search_zero', v_zero_search, 'alerts_raised', v_raised);
END; $$;
REVOKE ALL ON FUNCTION public.admin_evaluate_functional_alerts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_evaluate_functional_alerts(integer) TO authenticated;

COMMENT ON TABLE public.marketplace_search_metrics IS
  '14.40.7 - Telemetria de search_marketplace. Lectura solo via RPC admin.';
COMMENT ON TABLE public.system_alerts IS
  '14.40.7 - Alertas tecnicas y funcionales. Lectura solo via RPC admin.';