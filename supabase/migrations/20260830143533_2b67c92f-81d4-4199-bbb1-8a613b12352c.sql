-- G8-R1-F1L · Paso 6b: restitución del estado promovido (Home premium rev.32)
UPDATE public.page_compositions c
   SET active_revision_id = r.id,
       approved_revision_id = r.id,
       updated_at = now()
  FROM public.page_revisions r
 WHERE c.id = '50d2f632-70bc-4c79-b569-a8a2885d8030'
   AND r.composition_id = c.id
   AND r.revision_number = 32;