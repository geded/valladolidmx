-- Lote 3L · P0 seguridad: get_orders_needing_trip_email es SECURITY DEFINER sin
-- verificación de rol y exponía folio, user_id, email y nombre de viajeros con
-- órdenes pagadas a cualquier llamada anónima vía PostgREST. Solo la invoca el
-- hook /api/public/hooks/trip-journey-emails con service_role.
REVOKE EXECUTE ON FUNCTION public.get_orders_needing_trip_email(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_orders_needing_trip_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_orders_needing_trip_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_orders_needing_trip_email(text) TO service_role;