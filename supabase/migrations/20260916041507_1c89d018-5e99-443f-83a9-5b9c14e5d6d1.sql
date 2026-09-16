CREATE POLICY "profiles concierge read case travelers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (public.has_role(auth.uid(), 'concierge') OR public.has_role(auth.uid(), 'concierge_lead'))
  AND EXISTS (
    SELECT 1 FROM public.concierge_cases c
    WHERE c.traveler_user_id = profiles.user_id
  )
);