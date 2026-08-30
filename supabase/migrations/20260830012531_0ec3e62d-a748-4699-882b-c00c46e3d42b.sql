-- G8-R1-F1H · Retiro reversible de las 9 fichas Clase B / no verificadas del lote de evaluación.
-- Quedan fuera del piloto público navegable. Se conserva el registro y la auditoría.

WITH targets AS (
  SELECT id, slug, status FROM public.businesses
  WHERE demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'
    AND is_demo_seed = true
    AND status = 'published'
    AND deleted_at IS NULL
)
INSERT INTO public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
SELECT 'business'::entity_kind, t.id, 'g8_r1_f1h_withdraw_class_b', t.status, 'draft'::content_status,
       'G8-R1-F1H · Retiro reversible previo al piloto público navegable.',
       jsonb_build_object('slug', t.slug, 'lot', 'G8-R1-F1G-EVALUATION-CONTENT', 'wave', 'G8-R1-F1H', 'reversible', true)
FROM targets t;

UPDATE public.businesses
SET status = 'draft', updated_at = now()
WHERE demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'
  AND is_demo_seed = true
  AND status = 'published'
  AND deleted_at IS NULL;

WITH targets AS (
  SELECT id, slug, status FROM public.products
  WHERE demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'
    AND is_demo_seed = true
    AND status = 'published'
    AND deleted_at IS NULL
)
INSERT INTO public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
SELECT 'product'::entity_kind, t.id, 'g8_r1_f1h_withdraw_class_b', t.status, 'draft'::content_status,
       'G8-R1-F1H · Retiro reversible previo al piloto público navegable.',
       jsonb_build_object('slug', t.slug, 'lot', 'G8-R1-F1G-EVALUATION-CONTENT', 'wave', 'G8-R1-F1H', 'reversible', true)
FROM targets t;

UPDATE public.products
SET status = 'draft', updated_at = now()
WHERE demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'
  AND is_demo_seed = true
  AND status = 'published'
  AND deleted_at IS NULL;