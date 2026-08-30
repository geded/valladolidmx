-- G8-R1-F1L · Paso 6a: prueba de rollback de Home a la revisión 30
UPDATE public.page_compositions
   SET active_revision_id = '3542e3d4-21c9-4cd6-83a2-ce166374b880',
       approved_revision_id = '3542e3d4-21c9-4cd6-83a2-ce166374b880',
       updated_at = now()
 WHERE id = '50d2f632-70bc-4c79-b569-a8a2885d8030';