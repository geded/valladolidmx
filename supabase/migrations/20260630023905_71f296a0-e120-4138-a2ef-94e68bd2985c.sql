
-- ============================================================================
-- 14.40.6 — Etapa 6 · Transferencia de propiedad de empresa
-- ============================================================================

-- 1. Enum de estados
DO $$ BEGIN
  CREATE TYPE public.ownership_transfer_status AS ENUM
    ('pending','accepted','rejected','cancelled','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabla
CREATE TABLE IF NOT EXISTS public.business_ownership_transfers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  from_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          public.ownership_transfer_status NOT NULL DEFAULT 'pending',
  notes           text,
  requested_at    timestamptz NOT NULL DEFAULT now(),
  responded_at    timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_ownership_transfers_different_users
    CHECK (from_user_id <> to_user_id)
);

-- Solo una solicitud pendiente por empresa
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_ownership_transfers_pending
  ON public.business_ownership_transfers (business_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bot_business ON public.business_ownership_transfers (business_id);
CREATE INDEX IF NOT EXISTS idx_bot_to_user  ON public.business_ownership_transfers (to_user_id);
CREATE INDEX IF NOT EXISTS idx_bot_from_user ON public.business_ownership_transfers (from_user_id);

-- 3. GRANTs
GRANT SELECT ON public.business_ownership_transfers TO authenticated;
GRANT ALL    ON public.business_ownership_transfers TO service_role;

-- 4. RLS
ALTER TABLE public.business_ownership_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot read" ON public.business_ownership_transfers;
CREATE POLICY "bot read" ON public.business_ownership_transfers
  FOR SELECT TO authenticated
  USING (
    auth.uid() = to_user_id
    OR public.has_business_access(auth.uid(), business_id, 'owner'::public.business_user_role)
    OR public.is_admin(auth.uid())
  );

-- Sin policy de INSERT/UPDATE/DELETE: toda mutación va por RPC SECURITY DEFINER.

-- 5. Trigger updated_at
DROP TRIGGER IF EXISTS trg_bot_updated_at ON public.business_ownership_transfers;
CREATE TRIGGER trg_bot_updated_at
  BEFORE UPDATE ON public.business_ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RPCs
-- ============================================================================

-- request_business_ownership_transfer
CREATE OR REPLACE FUNCTION public.request_business_ownership_transfer(
  _business_id uuid,
  _to_user_id  uuid,
  _notes       text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id  uuid;
  _to_is_member boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  IF _to_user_id IS NULL OR _to_user_id = _uid THEN
    RAISE EXCEPTION 'invalid_recipient' USING ERRCODE='22023';
  END IF;

  -- Solo el owner actual puede iniciar
  IF NOT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _business_id AND user_id = _uid
      AND role = 'owner'::public.business_user_role AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'forbidden_only_current_owner' USING ERRCODE='42501';
  END IF;

  -- El destinatario debe existir en auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _to_user_id) THEN
    RAISE EXCEPTION 'recipient_not_found' USING ERRCODE='P0002';
  END IF;

  -- No puede haber una solicitud pendiente activa
  IF EXISTS (
    SELECT 1 FROM public.business_ownership_transfers
    WHERE business_id = _business_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'transfer_already_pending' USING ERRCODE='22023';
  END IF;

  INSERT INTO public.business_ownership_transfers
    (business_id, from_user_id, to_user_id, status, notes)
  VALUES
    (_business_id, _uid, _to_user_id, 'pending', NULLIF(left(coalesce(_notes,''),1000),''))
  RETURNING id INTO _id;

  -- Auditoría
  INSERT INTO public.permissions_audit_log
    (actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
  VALUES
    (_uid, _to_user_id, 'ownership_transfer_requested',
     'business_owner'::public.app_role, 'business', _business_id,
     jsonb_build_object('transfer_id', _id, 'event', 'Business.OwnershipTransferRequested'));

  INSERT INTO public.content_audit_log
    (entity_kind, entity_id, action, actor_user_id, notes)
  VALUES
    ('business', _business_id, 'ownership.transfer.requested', _uid,
     format('transfer_id=%s to=%s', _id, _to_user_id));

  RETURN _id;
END; $$;

-- accept_business_ownership_transfer
CREATE OR REPLACE FUNCTION public.accept_business_ownership_transfer(
  _transfer_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t   public.business_ownership_transfers%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _t FROM public.business_ownership_transfers
    WHERE id = _transfer_id FOR UPDATE;
  IF _t.id IS NULL THEN
    RAISE EXCEPTION 'transfer_not_found' USING ERRCODE='P0002';
  END IF;
  IF _t.to_user_id <> _uid THEN
    RAISE EXCEPTION 'forbidden_only_recipient' USING ERRCODE='42501';
  END IF;
  IF _t.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending' USING ERRCODE='22023';
  END IF;
  IF _t.expires_at <= now() THEN
    UPDATE public.business_ownership_transfers
      SET status='expired', responded_at=now() WHERE id=_t.id;
    RAISE EXCEPTION 'transfer_expired' USING ERRCODE='22023';
  END IF;

  -- Verificación defensiva: el owner actual sigue siendo from_user_id
  IF NOT EXISTS (
    SELECT 1 FROM public.business_users
    WHERE business_id = _t.business_id AND user_id = _t.from_user_id
      AND role = 'owner'::public.business_user_role AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'origin_no_longer_owner' USING ERRCODE='22023';
  END IF;

  -- Mantener invariante: un único owner activo por empresa.
  -- Degradar al owner actual a 'manager' (conserva acceso administrativo
  -- pero no propiedad).
  UPDATE public.business_users
    SET role = 'manager'::public.business_user_role, updated_at = now()
    WHERE business_id = _t.business_id AND user_id = _t.from_user_id;

  -- Promover/crear al destinatario como owner activo.
  INSERT INTO public.business_users
    (business_id, user_id, role, status, invited_by)
  VALUES
    (_t.business_id, _t.to_user_id, 'owner'::public.business_user_role,
     'active'::public.membership_status, _t.from_user_id)
  ON CONFLICT (business_id, user_id) DO UPDATE
    SET role = 'owner'::public.business_user_role,
        status = 'active'::public.membership_status,
        updated_at = now();

  UPDATE public.business_ownership_transfers
    SET status='accepted', responded_at=now()
    WHERE id = _t.id;

  -- Auditoría
  INSERT INTO public.permissions_audit_log
    (actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
  VALUES
    (_uid, _t.to_user_id, 'ownership_transfer_accepted',
     'business_owner'::public.app_role, 'business', _t.business_id,
     jsonb_build_object('transfer_id', _t.id, 'event', 'Business.OwnershipTransferAccepted'));

  INSERT INTO public.permissions_audit_log
    (actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
  VALUES
    (_uid, _t.from_user_id, 'ownership_transferred',
     'business_owner'::public.app_role, 'business', _t.business_id,
     jsonb_build_object('transfer_id', _t.id, 'from_user_id', _t.from_user_id,
                       'to_user_id', _t.to_user_id,
                       'event', 'Business.OwnershipTransferred'));

  INSERT INTO public.content_audit_log
    (entity_kind, entity_id, action, actor_user_id, notes)
  VALUES
    ('business', _t.business_id, 'ownership.transfer.accepted', _uid,
     format('transfer_id=%s from=%s to=%s', _t.id, _t.from_user_id, _t.to_user_id));

  RETURN jsonb_build_object(
    'transfer_id', _t.id,
    'business_id', _t.business_id,
    'new_owner_user_id', _t.to_user_id,
    'previous_owner_user_id', _t.from_user_id
  );
END; $$;

-- reject_business_ownership_transfer
CREATE OR REPLACE FUNCTION public.reject_business_ownership_transfer(
  _transfer_id uuid,
  _notes       text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t   public.business_ownership_transfers%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _t FROM public.business_ownership_transfers
    WHERE id = _transfer_id FOR UPDATE;
  IF _t.id IS NULL THEN
    RAISE EXCEPTION 'transfer_not_found' USING ERRCODE='P0002';
  END IF;
  IF _t.to_user_id <> _uid THEN
    RAISE EXCEPTION 'forbidden_only_recipient' USING ERRCODE='42501';
  END IF;
  IF _t.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending' USING ERRCODE='22023';
  END IF;

  UPDATE public.business_ownership_transfers
    SET status='rejected', responded_at=now(),
        notes = COALESCE(NULLIF(left(coalesce(_notes,''),1000),''), notes)
    WHERE id = _t.id;

  INSERT INTO public.permissions_audit_log
    (actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
  VALUES
    (_uid, _t.from_user_id, 'ownership_transfer_rejected',
     'business_owner'::public.app_role, 'business', _t.business_id,
     jsonb_build_object('transfer_id', _t.id, 'event', 'Business.OwnershipTransferRejected'));

  INSERT INTO public.content_audit_log
    (entity_kind, entity_id, action, actor_user_id, notes)
  VALUES
    ('business', _t.business_id, 'ownership.transfer.rejected', _uid,
     format('transfer_id=%s', _t.id));
END; $$;

-- cancel_business_ownership_transfer
CREATE OR REPLACE FUNCTION public.cancel_business_ownership_transfer(
  _transfer_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _t   public.business_ownership_transfers%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _t FROM public.business_ownership_transfers
    WHERE id = _transfer_id FOR UPDATE;
  IF _t.id IS NULL THEN
    RAISE EXCEPTION 'transfer_not_found' USING ERRCODE='P0002';
  END IF;

  -- Solo el owner actual (que originó la solicitud) o un admin pueden cancelar.
  IF _t.from_user_id <> _uid AND NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden_only_origin' USING ERRCODE='42501';
  END IF;
  IF _t.status <> 'pending' THEN
    RAISE EXCEPTION 'transfer_not_pending' USING ERRCODE='22023';
  END IF;

  UPDATE public.business_ownership_transfers
    SET status='cancelled', responded_at=now()
    WHERE id = _t.id;

  INSERT INTO public.permissions_audit_log
    (actor_user_id, target_user_id, action, role, scope_type, scope_id, metadata)
  VALUES
    (_uid, _t.to_user_id, 'ownership_transfer_cancelled',
     'business_owner'::public.app_role, 'business', _t.business_id,
     jsonb_build_object('transfer_id', _t.id, 'event', 'Business.OwnershipTransferCancelled'));

  INSERT INTO public.content_audit_log
    (entity_kind, entity_id, action, actor_user_id, notes)
  VALUES
    ('business', _t.business_id, 'ownership.transfer.cancelled', _uid,
     format('transfer_id=%s', _t.id));
END; $$;
