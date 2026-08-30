-- G8-R1-F1J-HOME-PREMIUM-R2 · Fase 2 · Emisión de token de vista previa
-- del borrador vigente de Home (derivado de rev.31). No publica nada:
-- `active_revision_id` sigue apuntando a la rev.30.
insert into public.composition_preview_tokens
  (token, token_digest, composition_id, created_by, expires_at, snapshot, snapshot_hash)
select
  public.eb_i4_token_digest('2c3f5326105bbe2c394ae0264e426f964f77b56254d55f36b94d1fa3a1652dac'),
  public.eb_i4_token_digest('2c3f5326105bbe2c394ae0264e426f964f77b56254d55f36b94d1fa3a1652dac'),
  pc.id,
  null,
  now() + interval '7 days',
  pc.current_draft,
  coalesce(pc.draft_hash, public.eb_i4_snapshot_hash(pc.current_draft))
from public.page_compositions pc
where pc.id = '50d2f632-70bc-4c79-b569-a8a2885d8030';