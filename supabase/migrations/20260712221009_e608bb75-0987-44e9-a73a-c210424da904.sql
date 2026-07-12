
ALTER TABLE public.concierge_orders
  ADD COLUMN IF NOT EXISTS email_t14_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_t3_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_welcome_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_post_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_orders_needing_trip_email(_kind text)
RETURNS TABLE (
  order_id uuid,
  folio text,
  user_id uuid,
  traveler_email text,
  traveler_name text,
  traveler_locale text,
  destination_name text,
  start_date date,
  end_date date,
  party_size int,
  days_to_trip int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.folio,
    o.user_id,
    o.traveler_email,
    o.traveler_name,
    o.traveler_locale,
    o.destination_name,
    tp.start_date,
    tp.end_date,
    tp.party_size,
    (tp.start_date - CURRENT_DATE)::int AS days_to_trip
  FROM public.concierge_orders o
  LEFT JOIN public.travel_plans tp ON tp.id = o.travel_plan_id
  WHERE o.status IN ('paid','fulfilled')
    AND o.traveler_email IS NOT NULL
    AND tp.start_date IS NOT NULL
    AND (
      (_kind = 't14'     AND o.email_t14_sent_at IS NULL
        AND (tp.start_date - CURRENT_DATE) BETWEEN 13 AND 15)
      OR
      (_kind = 't3'      AND o.email_t3_sent_at IS NULL
        AND (tp.start_date - CURRENT_DATE) BETWEEN 2 AND 4)
      OR
      (_kind = 'welcome' AND o.email_welcome_sent_at IS NULL
        AND tp.start_date = CURRENT_DATE)
      OR
      (_kind = 'post'    AND o.email_post_sent_at IS NULL
        AND COALESCE(tp.end_date, tp.start_date) IS NOT NULL
        AND (CURRENT_DATE - COALESCE(tp.end_date, tp.start_date)) BETWEEN 2 AND 5)
    );
$$;

REVOKE ALL ON FUNCTION public.get_orders_needing_trip_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_orders_needing_trip_email(text) TO service_role;
