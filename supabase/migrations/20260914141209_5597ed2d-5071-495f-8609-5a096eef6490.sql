ALTER TABLE public.concierge_proposals
  ADD COLUMN IF NOT EXISTS pay_reminder_r1_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_reminder_r2_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_reminder_r3_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_reminder_team_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_proposals_needing_payment_reminder(_kind text)
RETURNS TABLE (
  proposal_id uuid,
  case_id uuid,
  case_summary text,
  total_amount_cents integer,
  currency text,
  valid_until timestamptz,
  accepted_at timestamptz,
  traveler_user_id uuid,
  traveler_email text,
  traveler_name text,
  traveler_phone text,
  whatsapp_consent boolean,
  start_date date,
  end_date date,
  party_size integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    c.id,
    c.summary,
    p.total_amount_cents,
    p.currency,
    p.valid_until,
    COALESCE(p.responded_at, p.updated_at),
    c.traveler_user_id,
    pr.email,
    COALESCE(pr.display_name, NULLIF(BTRIM(CONCAT_WS(' ', pr.first_name, pr.last_name)), '')),
    pr.phone,
    COALESCE(tp.whatsapp_contact_consent, false),
    plan.start_date,
    plan.end_date,
    plan.party_size
  FROM public.concierge_proposals p
  JOIN public.concierge_cases c ON c.id = p.case_id
  LEFT JOIN public.profiles pr ON pr.user_id = c.traveler_user_id
  LEFT JOIN public.traveler_profiles tp ON tp.user_id = c.traveler_user_id
  LEFT JOIN public.travel_plans plan ON plan.case_id = c.id
  WHERE p.status = 'accepted'
    AND c.status NOT IN ('closed_won','closed_lost','archived')
    AND pr.email IS NOT NULL
    AND COALESCE(p.responded_at, p.updated_at) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.concierge_orders o
       WHERE o.source_proposal_id = p.id
         AND o.status IN ('paid','fulfilled')
    )
    AND (
      (_kind = 'r1'   AND p.pay_reminder_r1_sent_at IS NULL
        AND COALESCE(p.responded_at, p.updated_at) <= now() - interval '1 hour')
      OR
      (_kind = 'r2'   AND p.pay_reminder_r2_sent_at IS NULL
        AND COALESCE(p.responded_at, p.updated_at) <= now() - interval '24 hours')
      OR
      (_kind = 'r3'   AND p.pay_reminder_r3_sent_at IS NULL
        AND COALESCE(p.responded_at, p.updated_at) <= now() - interval '72 hours')
      OR
      (_kind = 'team' AND p.pay_reminder_team_sent_at IS NULL
        AND COALESCE(p.responded_at, p.updated_at) <= now() - interval '72 hours')
    );
$$;

REVOKE ALL ON FUNCTION public.get_proposals_needing_payment_reminder(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposals_needing_payment_reminder(text) TO service_role;