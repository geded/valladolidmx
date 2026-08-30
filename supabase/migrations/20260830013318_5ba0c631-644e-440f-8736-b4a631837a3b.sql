-- G8-R1-F1H · Las páginas de composición ligadas a entidades del lote de
-- evaluación permanecen fuera de buscadores durante el piloto.
UPDATE public.page_compositions
SET robots_directive = 'noindex,nofollow', updated_at = now()
WHERE slug = 'biz-zazil-tunich';