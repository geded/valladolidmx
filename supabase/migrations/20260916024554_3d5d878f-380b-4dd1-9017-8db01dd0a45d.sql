ALTER FUNCTION public._cv41_orders_before_insert() SECURITY INVOKER;
REVOKE ALL ON FUNCTION public._cv41_orders_before_insert() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cv41_orders_before_insert() TO service_role;