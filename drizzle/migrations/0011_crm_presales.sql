ALTER TABLE public.crm_prospect_invites
  ADD COLUMN IF NOT EXISTS folio text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_amount integer,
  ADD COLUMN IF NOT EXISTS total_amount integer,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS visit_date date,
  ADD COLUMN IF NOT EXISTS ttl_hours integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.concierge_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

ALTER TABLE public.crm_prospect_invites
  ADD CONSTRAINT crm_prospect_invites_quantity_check CHECK (quantity BETWEEN 1 AND 50),
  ADD CONSTRAINT crm_prospect_invites_ttl_check CHECK (ttl_hours IS NULL OR ttl_hours BETWEEN 1 AND 720),
  ADD CONSTRAINT crm_prospect_invites_cancel_reason_check CHECK (cancel_reason IS NULL OR char_length(cancel_reason) <= 300);

CREATE UNIQUE INDEX IF NOT EXISTS crm_prospect_invites_folio_key
  ON public.crm_prospect_invites (folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_prospect_invites_presale_idx
  ON public.crm_prospect_invites (purpose, expires_at DESC) WHERE purpose = 'pay';
CREATE INDEX IF NOT EXISTS crm_prospect_invites_order_idx
  ON public.crm_prospect_invites (order_id) WHERE order_id IS NOT NULL;

COMMENT ON COLUMN public.crm_prospect_invites.folio IS 'Preventa: folio PRE-AAAAMMDD-NNNN (sólo enlaces de pago).';

CREATE OR REPLACE FUNCTION public.crm_presale_assign_folio()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_try text;
  v_day text := to_char((now() AT TIME ZONE 'America/Merida')::date, 'YYYYMMDD');
BEGIN
  IF NEW.purpose <> 'pay' OR NEW.folio IS NOT NULL THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..30 LOOP
    v_try := 'PRE-' || v_day || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM public.crm_prospect_invites WHERE folio = v_try) THEN
      NEW.folio := v_try;
      RETURN NEW;
    END IF;
  END LOOP;
  NEW.folio := 'PRE-' || v_day || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.crm_presale_assign_folio() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS crm_prospect_invites_folio ON public.crm_prospect_invites;
CREATE TRIGGER crm_prospect_invites_folio
  BEFORE INSERT ON public.crm_prospect_invites
  FOR EACH ROW EXECUTE FUNCTION public.crm_presale_assign_folio();

UPDATE public.crm_prospect_invites
   SET folio = 'PRE-' || to_char((created_at AT TIME ZONE 'America/Merida')::date, 'YYYYMMDD') || '-' || substr(replace(id::text, '-', ''), 1, 4)
 WHERE purpose = 'pay' AND folio IS NULL;

ALTER TABLE public.concierge_prospect_events DROP CONSTRAINT IF EXISTS concierge_prospect_events_kind_check;
ALTER TABLE public.concierge_prospect_events ADD CONSTRAINT concierge_prospect_events_kind_check CHECK (kind = ANY (ARRAY[
  'created','returned','stage_changed','note','assigned','reviewed','contact_updated','followup_set',
  'converted','invite_created','payment_confirmed','payment_review','proposal_sent','proposal_expired',
  'recontact','trip_status','presale_expired','presale_cancelled','presale_extended'
]::text[]));

CREATE OR REPLACE FUNCTION public.crm_claim_prospect_invite(_token_hash text, _user_id uuid)
 RETURNS TABLE(invite_id uuid, prospect_id uuid, purpose text, product_id uuid, status text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v record;
BEGIN
  SELECT i.id, i.prospect_id, i.purpose, i.product_id, i.expires_at, i.used_at, i.used_by, i.cancelled_at,
         p.linked_user_id AS p_linked
    INTO v
    FROM public.crm_prospect_invites i
    JOIN public.concierge_prospects p ON p.id = i.prospect_id
   WHERE i.token_hash = _token_hash
   FOR UPDATE OF i;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::uuid, 'invalid'::text; RETURN;
  END IF;
  IF v.cancelled_at IS NOT NULL THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'cancelled'::text; RETURN;
  END IF;
  IF v.p_linked IS NOT NULL AND v.p_linked <> _user_id THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'other_account'::text; RETURN;
  END IF;
  IF v.used_at IS NOT NULL AND v.used_by IS DISTINCT FROM _user_id THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'used'::text; RETURN;
  END IF;
  IF v.used_at IS NULL AND v.expires_at < now() THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'expired'::text; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.concierge_prospects
              WHERE linked_user_id = _user_id AND id <> v.prospect_id) THEN
    RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'account_has_prospect'::text; RETURN;
  END IF;
  UPDATE public.crm_prospect_invites
     SET used_at = COALESCE(used_at, now()), used_by = _user_id
   WHERE id = v.id;
  RETURN QUERY SELECT v.id, v.prospect_id, v.purpose, v.product_id, 'ok'::text;
END;
$function$;
REVOKE ALL ON FUNCTION public.crm_claim_prospect_invite(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_claim_prospect_invite(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_presale_expire_due()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT i.id, i.prospect_id, i.folio, i.order_id
      FROM public.crm_prospect_invites i
     WHERE i.purpose = 'pay'
       AND i.expired_at IS NULL
       AND i.cancelled_at IS NULL
       AND i.expires_at < now()
       AND NOT EXISTS (
         SELECT 1 FROM public.concierge_orders o
          WHERE o.id = i.order_id AND o.status IN ('paid','fulfilled','refunded'))
     ORDER BY i.expires_at
     LIMIT 500
     FOR UPDATE OF i SKIP LOCKED
  LOOP
    UPDATE public.crm_prospect_invites SET expired_at = now() WHERE id = r.id;
    IF r.order_id IS NOT NULL THEN
      UPDATE public.concierge_orders
         SET status = 'expired', updated_at = now()
       WHERE id = r.order_id
         AND status IN ('draft','awaiting_payment')
         AND payment_provider_intent_id IS NULL;
      IF FOUND THEN
        INSERT INTO public.concierge_order_events (order_id, event_type, actor_user_id, payload)
        VALUES (r.order_id, 'presale_expired', NULL, jsonb_build_object('presale_folio', r.folio));
      END IF;
    END IF;
    INSERT INTO public.concierge_prospect_events (prospect_id, kind, body, meta)
    VALUES (r.prospect_id, 'presale_expired', 'Preventa ' || coalesce(r.folio, '') || ' vencida sin pago.',
            jsonb_build_object('invite_id', r.id, 'folio', r.folio));
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.crm_presale_expire_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_presale_expire_due() TO service_role;

CREATE OR REPLACE FUNCTION public.crm_presale_extend(_invite_id uuid, _hours integer, _actor uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
  v_new timestamptz;
BEGIN
  IF _hours IS NULL OR _hours < 1 OR _hours > 720 THEN
    RAISE EXCEPTION 'invalid_hours';
  END IF;
  SELECT i.*, o.status AS order_status
    INTO v
    FROM public.crm_prospect_invites i
    LEFT JOIN public.concierge_orders o ON o.id = i.order_id
   WHERE i.id = _invite_id AND i.purpose = 'pay'
   FOR UPDATE OF i;
  IF NOT FOUND THEN RAISE EXCEPTION 'presale_not_found'; END IF;
  IF v.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'presale_cancelled'; END IF;
  IF v.order_status IN ('paid','fulfilled','refunded') THEN RAISE EXCEPTION 'presale_paid'; END IF;
  v_new := greatest(v.expires_at, now()) + make_interval(hours => _hours);
  UPDATE public.crm_prospect_invites
     SET expires_at = v_new, expired_at = NULL
   WHERE id = _invite_id;
  IF v.order_id IS NOT NULL THEN
    UPDATE public.concierge_orders
       SET status = 'awaiting_payment', expires_at = v_new, updated_at = now()
     WHERE id = v.order_id
       AND status = 'expired'
       AND EXISTS (SELECT 1 FROM public.concierge_order_events e
                    WHERE e.order_id = v.order_id AND e.event_type = 'presale_expired');
    UPDATE public.concierge_orders
       SET expires_at = v_new, updated_at = now()
     WHERE id = v.order_id AND status IN ('draft','awaiting_payment');
  END IF;
  INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id, body, meta)
  VALUES (v.prospect_id, 'presale_extended', _actor,
          'Preventa ' || coalesce(v.folio, '') || ' ampliada ' || _hours || ' h.',
          jsonb_build_object('invite_id', _invite_id, 'folio', v.folio, 'expires_at', v_new));
  RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.crm_presale_extend(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_presale_extend(uuid, integer, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.crm_presale_cancel(_invite_id uuid, _actor uuid, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
BEGIN
  SELECT i.*, o.status AS order_status
    INTO v
    FROM public.crm_prospect_invites i
    LEFT JOIN public.concierge_orders o ON o.id = i.order_id
   WHERE i.id = _invite_id AND i.purpose = 'pay'
   FOR UPDATE OF i;
  IF NOT FOUND THEN RAISE EXCEPTION 'presale_not_found'; END IF;
  IF v.cancelled_at IS NOT NULL THEN RETURN false; END IF;
  IF v.order_status IN ('paid','fulfilled','refunded') THEN RAISE EXCEPTION 'presale_paid'; END IF;
  UPDATE public.crm_prospect_invites
     SET cancelled_at = now(), cancelled_by = _actor, cancel_reason = left(nullif(trim(_reason), ''), 300)
   WHERE id = _invite_id;
  IF v.order_id IS NOT NULL THEN
    UPDATE public.concierge_orders
       SET status = 'cancelled', cancelled_at = now(),
           cancelled_reason = coalesce(left(nullif(trim(_reason), ''), 300), 'Preventa cancelada'),
           updated_at = now()
     WHERE id = v.order_id
       AND status IN ('draft','awaiting_payment','expired')
       AND payment_provider_intent_id IS NULL;
  END IF;
  INSERT INTO public.concierge_prospect_events (prospect_id, kind, actor_user_id, body, meta)
  VALUES (v.prospect_id, 'presale_cancelled', _actor,
          'Preventa ' || coalesce(v.folio, '') || ' cancelada' || coalesce(': ' || left(nullif(trim(_reason), ''), 300), '.'),
          jsonb_build_object('invite_id', _invite_id, 'folio', v.folio));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.crm_presale_cancel(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crm_presale_cancel(uuid, uuid, text) TO service_role;