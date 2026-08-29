-- G8-R1-F1B-S1 · ACL fail-closed: anon sin privilegios sobre procedencia ni snapshots.
REVOKE ALL ON public.entity_field_provenance FROM anon;
REVOKE ALL ON public.business_claim_snapshots FROM anon;

-- Reafirma el contrato de acceso autenticado (idempotente).
GRANT SELECT, INSERT, UPDATE ON public.entity_field_provenance TO authenticated;
GRANT SELECT, INSERT ON public.business_claim_snapshots TO authenticated;
GRANT ALL ON public.entity_field_provenance TO service_role;
GRANT ALL ON public.business_claim_snapshots TO service_role;