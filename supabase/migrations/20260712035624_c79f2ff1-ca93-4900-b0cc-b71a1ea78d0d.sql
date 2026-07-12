
ALTER TABLE public.business_visibility_grants
  ADD COLUMN IF NOT EXISTS notified_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_expiring_7d_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_expiring_1d_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_expired_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_visibility_notification_recipient(_business_id uuid)
RETURNS TABLE(recipient_email text, recipient_name text, business_name text, business_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    lower(trim(coalesce(p.email, ''))),
    coalesce(p.first_name, p.display_name, split_part(coalesce(p.email,''), '@', 1)),
    b.display_name,
    b.slug
  FROM public.businesses b
  LEFT JOIN LATERAL (
    SELECT bu.user_id FROM public.business_users bu
    WHERE bu.business_id = b.id AND bu.status = 'active'
    ORDER BY (bu.role = 'owner') DESC, bu.created_at ASC LIMIT 1
  ) owner ON true
  LEFT JOIN public.profiles p ON p.user_id = owner.user_id
  WHERE b.id = _business_id AND p.email IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.list_visibility_grants_expiring(_reminder int)
RETURNS TABLE(grant_id uuid, business_id uuid, plan_name text, expires_at timestamptz,
  recipient_email text, recipient_name text, business_name text, business_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.business_id, vp.name, g.expires_at,
    r.recipient_email, r.recipient_name, r.business_name, r.business_slug
  FROM public.business_visibility_grants g
  JOIN public.visibility_plans vp ON vp.id = g.plan_id
  CROSS JOIN LATERAL public.get_visibility_notification_recipient(g.business_id) r
  WHERE g.status = 'active' AND g.expires_at IS NOT NULL
    AND (
      (_reminder = 7 AND g.notified_expiring_7d_at IS NULL
        AND g.expires_at > now() + interval '6 days' AND g.expires_at <= now() + interval '8 days')
      OR (_reminder = 1 AND g.notified_expiring_1d_at IS NULL
        AND g.expires_at > now() + interval '18 hours' AND g.expires_at <= now() + interval '30 hours')
    )
    AND r.recipient_email IS NOT NULL AND r.recipient_email <> '';
$$;

CREATE OR REPLACE FUNCTION public.list_visibility_grants_recently_expired()
RETURNS TABLE(grant_id uuid, business_id uuid, plan_name text, expires_at timestamptz,
  recipient_email text, recipient_name text, business_name text, business_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.business_id, vp.name, g.expires_at,
    r.recipient_email, r.recipient_name, r.business_name, r.business_slug
  FROM public.business_visibility_grants g
  JOIN public.visibility_plans vp ON vp.id = g.plan_id
  CROSS JOIN LATERAL public.get_visibility_notification_recipient(g.business_id) r
  WHERE g.status = 'expired' AND g.notified_expired_at IS NULL
    AND g.expires_at IS NOT NULL AND g.expires_at > now() - interval '48 hours'
    AND r.recipient_email IS NOT NULL AND r.recipient_email <> '';
$$;

GRANT EXECUTE ON FUNCTION public.get_visibility_notification_recipient(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_visibility_grants_expiring(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_visibility_grants_recently_expired() TO service_role;
