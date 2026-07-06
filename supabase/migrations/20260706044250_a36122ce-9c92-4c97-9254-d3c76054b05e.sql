CREATE OR REPLACE FUNCTION public.approve_ownership_claim(_transfer_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t public.business_ownership_transfers%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _t FROM public.business_ownership_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR _t.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending' USING ERRCODE = 'P0002';
  END IF;

  IF _approve THEN
    IF _t.from_user_id IS NOT NULL THEN
      UPDATE public.business_users
         SET role = 'manager'::public.business_user_role
       WHERE business_id = _t.business_id AND user_id = _t.from_user_id;
    END IF;

    INSERT INTO public.business_users (business_id, user_id, role, status, invited_by)
    VALUES (_t.business_id, _t.to_user_id, 'owner'::public.business_user_role, 'active'::public.membership_status, _uid)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = 'owner'::public.business_user_role, status = 'active'::public.membership_status;

    UPDATE public.business_ownership_transfers
       SET status = 'accepted', responded_at = now(), notes = COALESCE(_notes, notes)
     WHERE id = _transfer_id;
  ELSE
    UPDATE public.business_ownership_transfers
       SET status = 'rejected', responded_at = now(), notes = COALESCE(_notes, notes)
     WHERE id = _transfer_id;
  END IF;

  INSERT INTO public.permissions_audit_log (actor_user_id, target_user_id, action, role, scope_type, scope_id)
  VALUES (_uid, _t.to_user_id,
          CASE WHEN _approve THEN 'ownership_claim_approved' ELSE 'ownership_claim_rejected' END,
          'business_owner'::public.app_role, 'business', _t.business_id);
END;
$$;