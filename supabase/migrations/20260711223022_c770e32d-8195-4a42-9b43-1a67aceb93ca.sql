
ALTER TABLE public.traveler_coupons
  ADD COLUMN IF NOT EXISTS review_reminder_1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reminder_2_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_coupons_needing_review_reminder(
  reminder_number INT,
  hours_min INT,
  hours_max INT
)
RETURNS TABLE (
  coupon_id UUID,
  user_id UUID,
  business_id UUID,
  business_slug TEXT,
  business_name TEXT,
  promotion_title TEXT,
  coupon_code TEXT,
  discount_percent NUMERIC,
  redeemed_at TIMESTAMPTZ,
  recipient_email TEXT,
  traveler_first_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.id AS coupon_id,
    tc.user_id,
    tc.business_id,
    b.slug AS business_slug,
    COALESCE(b.display_name, b.legal_name, 'el negocio') AS business_name,
    COALESCE(p.title, 'Promoción') AS promotion_title,
    tc.code AS coupon_code,
    p.discount_percent,
    tc.redeemed_at,
    COALESCE(au.email, '') AS recipient_email,
    COALESCE(
      tp.public_display_name,
      split_part(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', ''), ' ', 1),
      ''
    ) AS traveler_first_name
  FROM public.traveler_coupons tc
  LEFT JOIN public.businesses b ON b.id = tc.business_id
  LEFT JOIN public.promotions p ON p.id = tc.promotion_id
  LEFT JOIN auth.users au ON au.id = tc.user_id
  LEFT JOIN public.traveler_profiles tp ON tp.user_id = tc.user_id
  WHERE tc.status = 'redeemed'
    AND tc.redeemed_at IS NOT NULL
    AND tc.redeemed_at BETWEEN (now() - make_interval(hours => hours_max))
                           AND (now() - make_interval(hours => hours_min))
    AND (
      (reminder_number = 1 AND tc.review_reminder_1_sent_at IS NULL)
      OR
      (reminder_number = 2 AND tc.review_reminder_2_sent_at IS NULL
                           AND tc.review_reminder_1_sent_at IS NOT NULL)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.subject_kind = 'business'
        AND r.subject_id = tc.business_id
        AND r.author_user_id = tc.user_id
        AND r.deleted_at IS NULL
    )
    AND au.email IS NOT NULL
    AND b.slug IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_coupons_needing_review_reminder(INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_coupons_needing_review_reminder(INT, INT, INT) TO service_role;
