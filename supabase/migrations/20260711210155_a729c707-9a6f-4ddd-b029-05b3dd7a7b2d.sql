
CREATE TYPE public.traveler_coupon_status AS ENUM ('active','redeemed','expired','revoked');
CREATE TYPE public.traveler_coupon_channel AS ENUM ('qr','code');

CREATE TABLE public.traveler_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_slug text NOT NULL,
  promotion_id uuid NULL,
  business_id uuid NULL,
  code text NOT NULL UNIQUE,
  qr_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title text NOT NULL,
  discount_percent numeric NULL,
  terms text NULL,
  valid_until timestamptz NOT NULL,
  status public.traveler_coupon_status NOT NULL DEFAULT 'active',
  redeemed_at timestamptz NULL,
  redeemed_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_channel public.traveler_coupon_channel NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX traveler_coupons_one_per_promo
  ON public.traveler_coupons (user_id, promotion_slug)
  WHERE status <> 'revoked';

CREATE INDEX traveler_coupons_user_idx ON public.traveler_coupons(user_id);
CREATE INDEX traveler_coupons_business_idx ON public.traveler_coupons(business_id);
CREATE INDEX traveler_coupons_code_idx ON public.traveler_coupons(code);

GRANT SELECT, INSERT, UPDATE ON public.traveler_coupons TO authenticated;
GRANT ALL ON public.traveler_coupons TO service_role;

ALTER TABLE public.traveler_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Traveler reads own coupons"
  ON public.traveler_coupons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Traveler inserts own coupons"
  ON public.traveler_coupons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Business staff reads business coupons"
  ON public.traveler_coupons FOR SELECT TO authenticated
  USING (
    business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = traveler_coupons.business_id
        AND bu.user_id = auth.uid()
    )
  );

CREATE POLICY "Business staff redeems business coupons"
  ON public.traveler_coupons FOR UPDATE TO authenticated
  USING (
    business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = traveler_coupons.business_id
        AND bu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = traveler_coupons.business_id
        AND bu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin manages coupons"
  ON public.traveler_coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER traveler_coupons_touch
  BEFORE UPDATE ON public.traveler_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.expire_stale_coupons()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.traveler_coupons
     SET status = 'expired'
   WHERE status = 'active' AND valid_until < now();
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_coupons() TO authenticated, service_role;
