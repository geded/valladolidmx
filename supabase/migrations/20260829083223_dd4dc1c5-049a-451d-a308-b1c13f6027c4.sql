-- G8-R1-F1B-S1 · Modelo aditivo de procedencia y reclamación de fichas públicas.
-- Aditivo, idempotente, reversible. Cero backfill, cero fichas, cero publicación.

-- =========================================================================
-- 1. PROCEDENCIA POR CAMPO
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.entity_field_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  field_path text NOT NULL,
  source_url text NOT NULL,
  source_owner text NOT NULL,
  source_kind text NOT NULL,
  observed_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  verification_level text NOT NULL DEFAULT 'unverified',
  evidence_checksum text,
  evidence_ref text,
  created_by uuid,
  superseded_at timestamptz,
  superseded_by uuid REFERENCES public.entity_field_provenance(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT efp_entity_type_allowlist CHECK (entity_type IN ('business','place','product','event','destination')),
  CONSTRAINT efp_source_kind_allowlist CHECK (source_kind IN ('official_site','official_social','tourism_registry','chamber','press_release','owner_provided','licensed_editorial')),
  CONSTRAINT efp_verification_level_allowlist CHECK (verification_level IN ('unverified','source_checked','editorially_verified','owner_confirmed')),
  CONSTRAINT efp_field_path_shape CHECK (field_path ~ '^[a-z0-9_]+\.[a-z0-9_.\[\]-]+$'),
  CONSTRAINT efp_source_url_https CHECK (source_url ~* '^https://[^\s]+$'),
  CONSTRAINT efp_checksum_shape CHECK (evidence_checksum IS NULL OR evidence_checksum ~ '^[a-f0-9]{64}$'),
  CONSTRAINT efp_metadata_bounded CHECK (pg_column_size(metadata) <= 2048),
  CONSTRAINT efp_supersede_coherent CHECK (
    (superseded_at IS NULL AND superseded_by IS NULL)
    OR (superseded_at IS NOT NULL)
  ),
  CONSTRAINT efp_no_self_supersede CHECK (superseded_by IS NULL OR superseded_by <> id)
);

CREATE UNIQUE INDEX IF NOT EXISTS efp_one_active_per_field
  ON public.entity_field_provenance (entity_type, entity_id, field_path)
  WHERE superseded_at IS NULL;

CREATE INDEX IF NOT EXISTS efp_entity_idx
  ON public.entity_field_provenance (entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE ON public.entity_field_provenance TO authenticated;
GRANT ALL ON public.entity_field_provenance TO service_role;
ALTER TABLE public.entity_field_provenance ENABLE ROW LEVEL SECURITY;

-- Validación de existencia de la entidad (cero filas huérfanas).
CREATE OR REPLACE FUNCTION public.efp_assert_entity_exists()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _ok boolean := false;
BEGIN
  IF NEW.entity_type = 'business' THEN
    SELECT EXISTS(SELECT 1 FROM public.businesses WHERE id = NEW.entity_id) INTO _ok;
  ELSIF NEW.entity_type = 'place' THEN
    SELECT EXISTS(SELECT 1 FROM public.points_of_interest WHERE id = NEW.entity_id) INTO _ok;
  ELSIF NEW.entity_type = 'product' THEN
    SELECT EXISTS(SELECT 1 FROM public.products WHERE id = NEW.entity_id) INTO _ok;
  ELSIF NEW.entity_type = 'event' THEN
    SELECT EXISTS(SELECT 1 FROM public.events WHERE id = NEW.entity_id) INTO _ok;
  ELSIF NEW.entity_type = 'destination' THEN
    SELECT EXISTS(SELECT 1 FROM public.destinations WHERE id = NEW.entity_id) INTO _ok;
  END IF;

  IF NOT _ok THEN
    RAISE EXCEPTION 'entity_not_found: % %', NEW.entity_type, NEW.entity_id USING ERRCODE = 'P0002';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS efp_assert_entity_exists_trg ON public.entity_field_provenance;
CREATE TRIGGER efp_assert_entity_exists_trg
  BEFORE INSERT OR UPDATE ON public.entity_field_provenance
  FOR EACH ROW EXECUTE FUNCTION public.efp_assert_entity_exists();

-- Historial: prohibido reescribir una procedencia ya superseded o mutar su origen.
CREATE OR REPLACE FUNCTION public.efp_history_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'provenance_row_is_immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.entity_type <> OLD.entity_type
     OR NEW.entity_id <> OLD.entity_id
     OR NEW.field_path <> OLD.field_path
     OR NEW.source_url <> OLD.source_url
     OR NEW.observed_at <> OLD.observed_at THEN
    RAISE EXCEPTION 'provenance_is_append_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS efp_history_guard_trg ON public.entity_field_provenance;
CREATE TRIGGER efp_history_guard_trg
  BEFORE UPDATE ON public.entity_field_provenance
  FOR EACH ROW EXECUTE FUNCTION public.efp_history_guard();

-- Helper: ¿el usuario administra esta entidad de negocio?
CREATE OR REPLACE FUNCTION public.efp_can_read_row(_user_id uuid, _entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_editor_or_admin(_user_id)
      OR public.has_permission(_user_id, 'poi.write')
      OR (
        _entity_type = 'business' AND EXISTS (
          SELECT 1 FROM public.business_users bu
           WHERE bu.business_id = _entity_id
             AND bu.user_id = _user_id
             AND bu.status = 'active'
             AND bu.role IN ('owner','manager','editor')
        )
      );
$$;

DROP POLICY IF EXISTS "efp_read_staff_or_owner" ON public.entity_field_provenance;
CREATE POLICY "efp_read_staff_or_owner"
  ON public.entity_field_provenance FOR SELECT TO authenticated
  USING (public.efp_can_read_row(auth.uid(), entity_type, entity_id));

DROP POLICY IF EXISTS "efp_write_staff" ON public.entity_field_provenance;
CREATE POLICY "efp_write_staff"
  ON public.entity_field_provenance FOR INSERT TO authenticated
  WITH CHECK (
    (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "efp_update_staff" ON public.entity_field_provenance;
CREATE POLICY "efp_update_staff"
  ON public.entity_field_provenance FOR UPDATE TO authenticated
  USING (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'))
  WITH CHECK (public.is_editor_or_admin(auth.uid()) OR public.has_permission(auth.uid(), 'poi.write'));

-- =========================================================================
-- 2. ORIGEN Y REVISIÓN DE LA FICHA (businesses)
-- =========================================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS record_origin text NOT NULL DEFAULT 'owner_submitted',
  ADD COLUMN IF NOT EXISTS source_review_state text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_due_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_record_origin_allowlist') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_record_origin_allowlist
      CHECK (record_origin IN ('owner_submitted','public_source','editorial','imported','demo'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_source_review_state_allowlist') THEN
    ALTER TABLE public.businesses ADD CONSTRAINT businesses_source_review_state_allowlist
      CHECK (source_review_state IN ('unreviewed','in_review','approved','stale','rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.businesses.record_origin IS
  'G8-R1-F1B-S1 · Origen del registro. Reconciliación documental con is_demo_seed=true => demo (sin backfill en esta fase).';
COMMENT ON COLUMN public.businesses.source_review_state IS
  'G8-R1-F1B-S1 · Revisión editorial de la fuente. Requisito fail-closed: sólo approved puede ser público.';
COMMENT ON COLUMN public.businesses.verified IS
  'Semántica histórica: insignia editorial de confianza. NO significa reclamado por propietario ni fuente vigente. Reclamación se deriva de business_users/business_ownership_transfers; vigencia de last_verified_at/verification_due_at.';

-- =========================================================================
-- 3. VIGENCIA DE HORARIOS
-- =========================================================================
ALTER TABLE public.business_hours
  ADD COLUMN IF NOT EXISTS source_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

COMMENT ON COLUMN public.business_hours.valid_until IS
  'G8-R1-F1B-S1 · Vencimiento del horario. Vencido => nunca se presenta como vigente (pendiente de confirmar).';

-- =========================================================================
-- 4. SNAPSHOT PREVIO A RECLAMACIÓN
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.business_claim_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES public.business_ownership_transfers(id) ON DELETE SET NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  snapshot_hash text NOT NULL,
  snapshot_version integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  actor_user_id uuid,
  audit_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bcs_hash_shape CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT bcs_reason_allowlist CHECK (reason IN ('claim_review','claim_approval','ownership_transfer','editorial_rollback'))
);

CREATE INDEX IF NOT EXISTS bcs_business_idx ON public.business_claim_snapshots (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bcs_claim_idx ON public.business_claim_snapshots (claim_id);

GRANT SELECT, INSERT ON public.business_claim_snapshots TO authenticated;
GRANT ALL ON public.business_claim_snapshots TO service_role;
ALTER TABLE public.business_claim_snapshots ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bcs_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'claim_snapshot_is_immutable' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS bcs_immutable_guard_trg ON public.business_claim_snapshots;
CREATE TRIGGER bcs_immutable_guard_trg
  BEFORE UPDATE OR DELETE ON public.business_claim_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.bcs_immutable_guard();

DROP POLICY IF EXISTS "bcs_read_admin_or_own_claim" ON public.business_claim_snapshots;
CREATE POLICY "bcs_read_admin_or_own_claim"
  ON public.business_claim_snapshots FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.business_ownership_transfers t
       WHERE t.id = business_claim_snapshots.claim_id
         AND t.to_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "bcs_insert_admin" ON public.business_claim_snapshots;
CREATE POLICY "bcs_insert_admin"
  ON public.business_claim_snapshots FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND actor_user_id = auth.uid());

-- Generación server-side del snapshot (hash calculado en base de datos).
CREATE OR REPLACE FUNCTION public.create_business_claim_snapshot(
  _business_id uuid,
  _reason text,
  _claim_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _payload jsonb;
  _id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT to_jsonb(b) - 'verification_notes' - 'review_notes' - 'verification_document_url'
    INTO _payload
    FROM public.businesses b
   WHERE b.id = _business_id;

  IF _payload IS NULL THEN
    RAISE EXCEPTION 'business_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.business_claim_snapshots
    (claim_id, business_id, snapshot, snapshot_hash, snapshot_version, reason, actor_user_id, audit_ref)
  VALUES
    (_claim_id, _business_id, _payload,
     encode(digest(convert_to(_payload::text, 'UTF8'), 'sha256'), 'hex'),
     1, _reason, _uid,
     format('content_audit_log:business:%s', _business_id))
  RETURNING id INTO _id;

  INSERT INTO public.content_audit_log (entity_kind, entity_id, action, actor_user_id, notes)
  VALUES ('business', _business_id, 'claim.snapshot.created', _uid,
          format('snapshot_id=%s reason=%s claim_id=%s', _id, _reason, COALESCE(_claim_id::text, '-')));

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_claim_snapshot(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_claim_snapshot(uuid, text, uuid) TO authenticated, service_role;

-- =========================================================================
-- 5. ESTADO DERIVADO DE RECLAMACIÓN (nunca almacenado)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_business_claim_state(_business_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.business_users bu
       WHERE bu.business_id = _business_id
         AND bu.role = 'owner'::public.business_user_role
         AND bu.status = 'active'
    ) THEN 'claimed'
    WHEN EXISTS (
      SELECT 1 FROM public.business_ownership_transfers t
       WHERE t.business_id = _business_id
         AND t.status = 'pending'
         AND t.expires_at > now()
    ) THEN 'claim_pending'
    WHEN EXISTS (
      SELECT 1 FROM public.business_users bu
       WHERE bu.business_id = _business_id
         AND bu.role = 'owner'::public.business_user_role
         AND bu.status IN ('suspended','removed')
    ) OR EXISTS (
      SELECT 1 FROM public.business_ownership_transfers t
       WHERE t.business_id = _business_id
         AND t.status IN ('rejected','cancelled')
    ) THEN 'claim_revoked'
    ELSE 'unclaimed'
  END;
$$;

REVOKE ALL ON FUNCTION public.resolve_business_claim_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_business_claim_state(uuid) TO anon, authenticated, service_role;

-- =========================================================================
-- 6. RESUMEN PÚBLICO SEGURO (fail-closed, sin notas internas)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.business_public_source_summary(_business_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'business_id', b.id,
    'is_public_source', (b.record_origin = 'public_source'),
    'claim_state', public.resolve_business_claim_state(b.id),
    'last_verified_at', b.last_verified_at,
    'source_is_current', (b.verification_due_at IS NULL OR b.verification_due_at > now()),
    'can_be_public', (
      b.status = 'published'::public.content_status
      AND b.deleted_at IS NULL
      AND b.source_review_state = 'approved'
      AND (b.verification_due_at IS NULL OR b.verification_due_at > now())
    ),
    'source_owners', COALESCE((
      SELECT jsonb_agg(DISTINCT p.source_owner)
        FROM public.entity_field_provenance p
       WHERE p.entity_type = 'business'
         AND p.entity_id = b.id
         AND p.superseded_at IS NULL
    ), '[]'::jsonb),
    'notice', CASE WHEN b.record_origin = 'public_source'
                   THEN 'Información recopilada de fuentes públicas' END
  )
  FROM public.businesses b
  WHERE b.id = _business_id
    AND b.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.business_public_source_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_public_source_summary(uuid) TO anon, authenticated, service_role;