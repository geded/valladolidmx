-- Fix: deduplicar user_roles globales y evitar duplicados futuros
-- 1) Borrar duplicados dejando la fila más antigua por (user_id, role) cuando scope es NULL
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, role
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM public.user_roles
  WHERE scope_type IS NULL AND scope_id IS NULL
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id AND r.rn > 1;

-- 2) Índice único parcial para roles globales (donde scope es NULL)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_global_uniq
  ON public.user_roles (user_id, role)
  WHERE scope_type IS NULL AND scope_id IS NULL;