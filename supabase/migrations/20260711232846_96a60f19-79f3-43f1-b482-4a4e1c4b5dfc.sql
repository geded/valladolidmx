-- Sub-ola 7.1: Catálogo de Paquetes de Visibilidad

CREATE TABLE public.visibility_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description_short TEXT,
  description_long TEXT,
  badge_variant TEXT NOT NULL DEFAULT 'standard',
  color_token TEXT NOT NULL DEFAULT 'muted',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  base_price_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  cycles JSONB NOT NULL DEFAULT '[{"cycle":"monthly","discount_pct":0,"label":"Mensual"}]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility_levers JSONB NOT NULL DEFAULT '{}'::jsonb,
  commercial_rules JSONB NOT NULL DEFAULT '{"auto_renew_default":true,"grace_days":3,"requires_admin_approval":false}'::jsonb,
  reporting JSONB NOT NULL DEFAULT '{"bi_enabled":false,"csv_export":false,"monthly_email_report":false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.visibility_plans TO anon, authenticated;
GRANT ALL ON public.visibility_plans TO service_role;

ALTER TABLE public.visibility_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active public plans"
  ON public.visibility_plans FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Admins view all plans"
  ON public.visibility_plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage plans"
  ON public.visibility_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_visibility_plans_updated_at
  BEFORE UPDATE ON public.visibility_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_visibility_plans_active_order ON public.visibility_plans (is_active, display_order);

CREATE TABLE public.business_visibility_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.visibility_plans(id) ON DELETE RESTRICT,
  cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'purchase',
  source_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_paid_mxn NUMERIC(10,2),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_visibility_grants TO authenticated;
GRANT ALL ON public.business_visibility_grants TO service_role;

ALTER TABLE public.business_visibility_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own grants"
  ON public.business_visibility_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_users bu
      WHERE bu.business_id = business_visibility_grants.business_id
        AND bu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all grants"
  ON public.business_visibility_grants FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins manage all grants"
  ON public.business_visibility_grants FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_business_visibility_grants_updated_at
  BEFORE UPDATE ON public.business_visibility_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_bvg_business_status ON public.business_visibility_grants (business_id, status);
CREATE INDEX idx_bvg_expires_at ON public.business_visibility_grants (expires_at) WHERE status IN ('active','grace');

-- Seed inicial: 4 paquetes editables desde /cms/visibilidad
INSERT INTO public.visibility_plans
  (slug, name, description_short, description_long, badge_variant, color_token, display_order, base_price_mxn, cycles, limits, visibility_levers, commercial_rules, reporting)
VALUES
  ('basico', 'Básico',
   'Presencia gratuita en el ecosistema.',
   'Ideal para empezar. Aparece en el directorio con lo esencial.',
   'standard', 'muted', 1, 0,
   '[{"cycle":"monthly","discount_pct":0,"label":"Mensual"}]'::jsonb,
   '{"max_photos":5,"max_products":3,"max_active_coupons":1,"max_events":1,"max_featured_campaigns":0}'::jsonb,
   '{"discovery_boost":0,"home_boost":0,"map_boost":0,"alux_weight":0,"alux_proactive":false,"alux_daily_cap":0,"badge_visible":false,"golden_pin":false,"in_emails":false,"cross_destination":false,"cross_radius_km":0,"search_weight":0}'::jsonb,
   '{"auto_renew_default":false,"grace_days":0,"requires_admin_approval":false}'::jsonb,
   '{"bi_enabled":false,"csv_export":false,"monthly_email_report":false}'::jsonb),
  ('destacado', 'Destacado',
   'Más visibilidad en descubrimiento.',
   'Aparece con badge, mejor posición en listados y prioridad en mapa.',
   'destacado', 'accent', 2, 499,
   '[{"cycle":"monthly","discount_pct":0,"label":"Mensual"},{"cycle":"quarterly","discount_pct":5,"label":"Trimestral"},{"cycle":"semiannual","discount_pct":15,"label":"Semestral"},{"cycle":"annual","discount_pct":25,"label":"Anual"}]'::jsonb,
   '{"max_photos":15,"max_products":10,"max_active_coupons":3,"max_events":5,"max_featured_campaigns":1}'::jsonb,
   '{"discovery_boost":25,"home_boost":10,"map_boost":20,"alux_weight":15,"alux_proactive":false,"alux_daily_cap":0,"badge_visible":true,"golden_pin":false,"in_emails":false,"cross_destination":false,"cross_radius_km":0,"search_weight":20}'::jsonb,
   '{"auto_renew_default":true,"grace_days":3,"requires_admin_approval":false}'::jsonb,
   '{"bi_enabled":true,"csv_export":false,"monthly_email_report":false}'::jsonb),
  ('premium', 'Premium',
   'Alta exposición + Alux te recomienda.',
   'Pin dorado en mapa, boost fuerte en home, menciones proactivas de Alux hasta 2/día y visibilidad cross-destino.',
   'premium', 'primary', 3, 1499,
   '[{"cycle":"monthly","discount_pct":0,"label":"Mensual"},{"cycle":"quarterly","discount_pct":5,"label":"Trimestral"},{"cycle":"semiannual","discount_pct":15,"label":"Semestral"},{"cycle":"annual","discount_pct":25,"label":"Anual"}]'::jsonb,
   '{"max_photos":40,"max_products":30,"max_active_coupons":8,"max_events":15,"max_featured_campaigns":3}'::jsonb,
   '{"discovery_boost":60,"home_boost":50,"map_boost":55,"alux_weight":55,"alux_proactive":true,"alux_daily_cap":2,"badge_visible":true,"golden_pin":true,"in_emails":true,"cross_destination":true,"cross_radius_km":30,"search_weight":55}'::jsonb,
   '{"auto_renew_default":true,"grace_days":5,"requires_admin_approval":false}'::jsonb,
   '{"bi_enabled":true,"csv_export":true,"monthly_email_report":true}'::jsonb),
  ('elite', 'Élite',
   'Máxima exposición en todo el ecosistema.',
   'Recursos ilimitados, prioridad máxima en Alux (5 menciones/día), cross-destino 100km y reporte mensual automático.',
   'elite', 'gold', 4, 3999,
   '[{"cycle":"monthly","discount_pct":0,"label":"Mensual"},{"cycle":"quarterly","discount_pct":5,"label":"Trimestral"},{"cycle":"semiannual","discount_pct":15,"label":"Semestral"},{"cycle":"annual","discount_pct":25,"label":"Anual"}]'::jsonb,
   '{"max_photos":100,"max_products":9999,"max_active_coupons":20,"max_events":9999,"max_featured_campaigns":9999}'::jsonb,
   '{"discovery_boost":90,"home_boost":85,"map_boost":90,"alux_weight":90,"alux_proactive":true,"alux_daily_cap":5,"badge_visible":true,"golden_pin":true,"in_emails":true,"cross_destination":true,"cross_radius_km":100,"search_weight":90}'::jsonb,
   '{"auto_renew_default":true,"grace_days":7,"requires_admin_approval":false}'::jsonb,
   '{"bi_enabled":true,"csv_export":true,"monthly_email_report":true}'::jsonb);