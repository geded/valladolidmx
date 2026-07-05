REVOKE EXECUTE ON FUNCTION public.get_available_modes(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_active_mode(public.profile_mode) FROM PUBLIC, anon;