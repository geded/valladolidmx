
-- 1) business_contacts: require parent business to be published
DROP POLICY IF EXISTS "business_contacts_public_read" ON public.business_contacts;
CREATE POLICY "business_contacts_public_read"
  ON public.business_contacts
  FOR SELECT
  TO anon, authenticated
  USING (
    is_public = true
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_contacts.business_id
        AND b.status = 'published'
        AND b.deleted_at IS NULL
    )
  );

-- 2) cc_case_evaluations: narrow SELECT to traveler + assigned concierge staff/admins
DROP POLICY IF EXISTS "cc_eval_select" ON public.cc_case_evaluations;
CREATE POLICY "cc_eval_select"
  ON public.cc_case_evaluations
  FOR SELECT
  TO authenticated
  USING (
    traveler_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'concierge_lead')
    OR EXISTS (
      SELECT 1 FROM public.concierge_case_participants p
      WHERE p.case_id = cc_case_evaluations.case_id
        AND p.user_id = auth.uid()
        AND p.is_active = true
        AND p.role IN ('concierge', 'concierge_lead')
    )
  );

-- 3) notification_webhook_endpoints: hide secret columns from client roles.
-- Owners can still list/manage rows; secrets are read server-side (service_role).
REVOKE SELECT (secret_current, secret_previous) ON public.notification_webhook_endpoints FROM anon, authenticated;
