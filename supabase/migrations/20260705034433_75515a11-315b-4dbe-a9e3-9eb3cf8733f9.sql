-- Reversión Single Source of Truth: retirar duplicados creados por error.
-- Las oficiales `get_available_modes` y `set_active_mode` permanecen intactas.
DROP FUNCTION IF EXISTS public.profile_get_available_modes();
DROP FUNCTION IF EXISTS public.profile_set_active_mode(public.profile_mode);