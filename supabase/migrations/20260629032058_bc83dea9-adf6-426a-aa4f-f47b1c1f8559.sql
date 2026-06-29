
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_editor_or_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_concierge(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_concierge_assigned(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_business_access(uuid, uuid, public.business_user_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_roles_changes() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_concierge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_concierge_assigned(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_business_access(uuid, uuid, public.business_user_role) TO authenticated;
