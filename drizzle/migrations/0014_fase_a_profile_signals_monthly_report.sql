-- lovable-cron-fallback-reviewed: el reporte mensual sale en un día fijo del mes; un gancho diario decide si hoy toca y la tabla evita repetir envíos.

CREATE OR REPLACE FUNCTION public.business_profile_signals(_business_ids uuid[])
RETURNS TABLE(
  business_id uuid,
  has_cover boolean,
  gallery_count integer,
  description_length integer,
  hours_days integer,
  has_location boolean,
  has_whatsapp boolean,
  has_google boolean,
  faq_count integer,
  published_products integer,
  sellable_experiences integer,
  verified boolean,
  quotes_90d integer,
  quotes_fast_90d integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ids AS (
    SELECT DISTINCT unnest(_business_ids[1:1000]) AS id
  ), allowed AS (
    SELECT b.*
    FROM public.businesses b
    JOIN ids ON ids.id = b.id
    WHERE b.deleted_at IS NULL
      AND (
        (b.status = 'published' AND b.source_review_state = 'approved')
        OR (auth.uid() IS NOT NULL AND public.has_business_access(auth.uid(), b.id, 'viewer'))
        OR (auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'editor')))
      )
  )
  SELECT
    a.id,
    (a.cover_media_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.business_media m WHERE m.business_id = a.id AND m.role = 'cover')),
    (SELECT count(*)::int FROM public.business_media m WHERE m.business_id = a.id AND m.role = 'gallery'),
    char_length(coalesce(trim(a.description), ''))::int,
    (SELECT count(DISTINCT h.day_of_week)::int FROM public.business_hours h WHERE h.business_id = a.id),
    EXISTS (
      SELECT 1 FROM public.business_locations l
      WHERE l.business_id = a.id AND l.deleted_at IS NULL
        AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
        AND NOT (l.latitude = 0 AND l.longitude = 0)),
    EXISTS (
      SELECT 1 FROM public.business_contacts c
      WHERE c.business_id = a.id AND c.deleted_at IS NULL AND c.contact_type = 'whatsapp'
        AND char_length(coalesce(trim(c.value), '')) >= 8),
    (a.google_place_id IS NOT NULL AND a.google_place_id <> ''),
    (SELECT count(*)::int FROM public.faqs f
      WHERE f.entity_kind = 'business' AND f.entity_id = a.id AND f.status = 'published'
        AND f.deleted_at IS NULL AND char_length(coalesce(trim(f.answer), '')) > 0),
    (SELECT count(*)::int FROM public.products p
      WHERE p.business_id = a.id AND p.status = 'published' AND p.deleted_at IS NULL),
    (SELECT count(*)::int FROM public.products p
      WHERE p.business_id = a.id AND p.status = 'published' AND p.deleted_at IS NULL
        AND p.product_type = 'experiencia' AND p.direct_sale_enabled = true
        AND coalesce(p.direct_sale_price_amount, 0) > 0),
    coalesce(a.verified, false),
    (SELECT count(*)::int FROM public.concierge_quotes q
      WHERE q.business_id = a.id AND q.submitted_at IS NOT NULL
        AND q.submitted_at > now() - interval '90 days'),
    (SELECT count(*)::int FROM public.concierge_quotes q
      JOIN public.concierge_case_requests r ON r.id = q.request_id
      WHERE q.business_id = a.id AND q.submitted_at IS NOT NULL
        AND q.submitted_at > now() - interval '90 days'
        AND q.submitted_at - r.created_at <= interval '24 hours')
  FROM allowed a;
$$;

REVOKE ALL ON FUNCTION public.business_profile_signals(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_profile_signals(uuid[]) TO anon, authenticated, service_role;

CREATE TABLE public.business_monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_status text NOT NULL DEFAULT 'pending',
  whatsapp_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, period_month)
);

GRANT SELECT ON public.business_monthly_reports TO authenticated;
GRANT ALL ON public.business_monthly_reports TO service_role;

ALTER TABLE public.business_monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members read their monthly reports"
ON public.business_monthly_reports
FOR SELECT
TO authenticated
USING (public.has_business_access(auth.uid(), business_id, 'viewer'));

CREATE OR REPLACE FUNCTION public.list_business_monthly_report_rows(_from timestamptz, _to timestamptz)
RETURNS TABLE(
  business_id uuid,
  business_name text,
  business_slug text,
  recipient_email text,
  recipient_name text,
  whatsapp text,
  views integer,
  alux_mentions integer,
  contacts integer,
  map_opens integer,
  quote_requests integer,
  quotes_sent integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    b.id,
    r.business_name,
    r.business_slug,
    r.recipient_email,
    r.recipient_name,
    (SELECT c.value FROM public.business_contacts c
      WHERE c.business_id = b.id AND c.deleted_at IS NULL AND c.contact_type = 'whatsapp'
      ORDER BY c.sort_order NULLS LAST, c.created_at LIMIT 1),
    coalesce(e.views, 0),
    coalesce(e.alux_mentions, 0),
    coalesce(e.contacts, 0),
    coalesce(e.map_opens, 0),
    (SELECT count(*)::int FROM public.concierge_case_requests q
      WHERE q.business_id = b.id AND q.created_at >= _from AND q.created_at < _to),
    (SELECT count(*)::int FROM public.concierge_quotes q
      WHERE q.business_id = b.id AND q.submitted_at >= _from AND q.submitted_at < _to)
  FROM public.businesses b
  CROSS JOIN LATERAL public.get_visibility_notification_recipient(b.id) r
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE v.event_type = 'impression')::int AS views,
      count(*) FILTER (WHERE v.event_type = 'alux_mention')::int AS alux_mentions,
      count(*) FILTER (WHERE v.event_type IN ('click_whatsapp', 'click_phone', 'click_web', 'reserve_intent'))::int AS contacts,
      count(*) FILTER (WHERE v.event_type = 'click_map')::int AS map_opens
    FROM public.business_view_events v
    WHERE v.business_id = b.id AND v.occurred_at >= _from AND v.occurred_at < _to
  ) e ON true
  WHERE b.deleted_at IS NULL
    AND b.status = 'published'
    AND r.recipient_email IS NOT NULL AND r.recipient_email <> '';
$$;

REVOKE ALL ON FUNCTION public.list_business_monthly_report_rows(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_business_monthly_report_rows(timestamptz, timestamptz) TO service_role;

DO $$
DECLARE _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'business-monthly-report-daily';
  IF _jobid IS NULL THEN
    PERFORM cron.schedule(
      'business-monthly-report-daily',
      '0 15 * * *',
      $cmd$SELECT public.cron_hooks_invoke('/api/public/hooks/business-monthly-report', true);$cmd$
    );
  ELSE
    PERFORM cron.alter_job(
      job_id := _jobid,
      schedule := '0 15 * * *',
      command := $cmd$SELECT public.cron_hooks_invoke('/api/public/hooks/business-monthly-report', true);$cmd$
    );
  END IF;
END $$;