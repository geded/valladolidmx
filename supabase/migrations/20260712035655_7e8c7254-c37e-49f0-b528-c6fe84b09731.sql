
REVOKE EXECUTE ON FUNCTION public.get_visibility_notification_recipient(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_visibility_grants_expiring(int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_visibility_grants_recently_expired() FROM PUBLIC, anon, authenticated;
