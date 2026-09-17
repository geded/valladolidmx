REVOKE ALL ON FUNCTION public.products_validate_location_ownership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.products_validate_location_ownership() FROM anon;
REVOKE ALL ON FUNCTION public.products_validate_location_ownership() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.products_validate_location_ownership() TO service_role;