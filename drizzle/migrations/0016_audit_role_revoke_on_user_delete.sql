CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _target uuid;
  _meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.permissions_audit_log(actor_user_id, target_user_id, action, role, scope_type, scope_id)
    VALUES (NEW.created_by, NEW.user_id, 'role_granted', NEW.role, NEW.scope_type, NEW.scope_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    _target := OLD.user_id;
    -- During account deletion the auth user is already gone: keep the id in
    -- metadata so the audit row does not violate the auth.users foreign key.
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) THEN
      _target := NULL;
      _meta := jsonb_build_object('deleted_user_id', OLD.user_id, 'reason', 'account_deleted');
    END IF;
    INSERT INTO public.permissions_audit_log(actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
    VALUES (
      CASE WHEN auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN auth.uid() ELSE NULL END,
      _target, 'role_revoked', OLD.role, OLD.scope_type, OLD.scope_id, _meta
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.audit_user_roles_changes() FROM PUBLIC, anon, authenticated;