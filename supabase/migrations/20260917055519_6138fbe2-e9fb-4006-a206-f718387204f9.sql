-- Paso 10 · Correo al viajero para reservaciones en línea (ERL).
-- Envío disparado por el evento (creación, pago, cancelación, reembolso)
-- desde las funciones de servidor existentes. Sin polling ni folios nuevos.

ALTER TABLE public.concierge_orders
  ADD COLUMN IF NOT EXISTS email_booking_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_booking_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_booking_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_booking_refunded_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_booking_email_payload(_order_id uuid, _kind text)
RETURNS TABLE (
  order_id uuid,
  folio text,
  traveler_email text,
  traveler_name text,
  traveler_locale text,
  destination_name text,
  total_amount integer,
  currency text,
  status text,
  paid_at timestamptz,
  cancelled_reason text,
  refunded_amount integer,
  departure_starts_at timestamptz,
  departure_timezone text,
  seats integer,
  items jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.folio,
    o.traveler_email,
    o.traveler_name,
    o.traveler_locale,
    o.destination_name,
    o.total_amount,
    o.currency,
    o.status,
    o.paid_at,
    o.cancelled_reason,
    NULLIF((o.metadata #>> '{refund,amount}'), '')::int,
    h.starts_at,
    h.timezone,
    h.quantity,
    COALESCE(it.items, '[]'::jsonb)
  FROM public.concierge_orders o
  LEFT JOIN LATERAL (
    SELECT d.starts_at, d.timezone, rh.quantity
      FROM public.commerce_reservation_holds rh
      JOIN public.commerce_departures d ON d.id = rh.departure_id
     WHERE rh.order_id = o.id
       AND rh.status <> 'released'
     ORDER BY d.starts_at
     LIMIT 1
  ) h ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
             'title', oi.title,
             'quantity', oi.quantity,
             'amount', oi.subtotal_amount
           ) ORDER BY oi.created_at) AS items
      FROM public.concierge_order_items oi
     WHERE oi.order_id = o.id
  ) it ON true
  WHERE o.id = _order_id
    AND o.source_kind = 'direct_sale'
    AND o.traveler_email IS NOT NULL
    AND (
      (_kind = 'created'   AND o.email_booking_created_at IS NULL)
      OR (_kind = 'paid'      AND o.email_booking_paid_at IS NULL AND o.paid_at IS NOT NULL)
      OR (_kind = 'cancelled' AND o.email_booking_cancelled_at IS NULL AND o.status = 'cancelled')
      OR (_kind = 'refunded'  AND o.email_booking_refunded_at IS NULL AND o.status = 'refunded')
    );
$$;

REVOKE ALL ON FUNCTION public.get_booking_email_payload(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_email_payload(uuid, text) TO service_role;