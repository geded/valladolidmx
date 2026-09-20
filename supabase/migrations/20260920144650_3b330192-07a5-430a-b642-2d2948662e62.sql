DROP POLICY IF EXISTS "profiles concierge read case travelers" ON public.profiles;
CREATE POLICY "profiles concierge read assigned travelers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.concierge_is_internal(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.concierge_cases c
    WHERE c.traveler_user_id = profiles.user_id
      AND public.concierge_can_view_case(c.id, auth.uid())
  )
);