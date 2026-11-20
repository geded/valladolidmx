ALTER FUNCTION public.resolve_tourism_attribute_family(text) SET search_path = public;

DROP POLICY IF EXISTS "Business members read events" ON public.business_view_events;
CREATE POLICY "Business members read events"
ON public.business_view_events
FOR SELECT
USING (public.has_business_access(auth.uid(), business_id, 'manager'::business_user_role));

DROP POLICY IF EXISTS "Business staff redeems business coupons" ON public.traveler_coupons;
CREATE POLICY "Business staff redeems business coupons"
ON public.traveler_coupons
FOR UPDATE
USING (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id, 'editor'::business_user_role))
WITH CHECK (business_id IS NOT NULL AND public.has_business_access(auth.uid(), business_id, 'editor'::business_user_role));