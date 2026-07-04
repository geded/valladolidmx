-- ============================================================
-- Demo Pack: US-E4.2 · Arma tu Viaje productivo
-- ============================================================
-- Nota técnica: dos triggers (`on_auth_user_created` y
-- `trg_auth_user_traveler_role`) insertan en `public.user_roles` con
-- `ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING`, pero
-- existe un índice único PARCIAL `user_roles_user_role_global_uniq`
-- sobre `(user_id, role) WHERE scope IS NULL` que la cláusula ON
-- CONFLICT no cubre → el segundo trigger revienta con "duplicate key".
-- Solución: `SET LOCAL session_replication_role='replica'` desactiva
-- los triggers durante nuestro INSERT y creamos manualmente el rol/
-- profile/traveler_profile una sola vez.
-- ============================================================

DO $$
DECLARE
  v_uid uuid := 'd3e00000-e4d0-4dec-9999-000000000001';
  v_hash text := '$2b$10$4Nz6RF2uIvoEOmtO1Kyjq.En0PLMn8xODrwjaD18pZu4iYt/Ax0C.';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid) THEN
    SET LOCAL session_replication_role = 'replica';

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated',
      'viajero-demo@valladolid.mx',
      v_hash,
      now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email'),'demo',true),
      jsonb_build_object('full_name','Viajero Demo','demo',true),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', 'viajero-demo@valladolid.mx', 'email_verified', true),
      'email', now(), now(), now()
    );

    -- Réplica manual de lo que harían los triggers (una sola vez).
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (v_uid, 'viajero-demo@valladolid.mx', 'Viajero Demo')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.traveler_profiles (user_id)
    VALUES (v_uid)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'traveler'::public.app_role)
    ON CONFLICT DO NOTHING;

    SET LOCAL session_replication_role = 'origin';
  END IF;
END $$;

-- Plan ACTIVO
INSERT INTO public.travel_plans (
  id, user_id, title, status, party_size, start_date, end_date,
  notes, source, meta
) VALUES (
  'd3e10000-e4d0-4dec-9999-000000000001',
  'd3e00000-e4d0-4dec-9999-000000000001',
  'Fin de semana romántico en Valladolid',
  'active', 2,
  (current_date + INTERVAL '21 days')::date,
  (current_date + INTERVAL '23 days')::date,
  'Aniversario · llegada viernes por la tarde · preferimos cocina yucateca tradicional.',
  'web',
  jsonb_build_object('demo', true, 'demo_batch', 'e4.2')
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'destination'::travel_item_kind,
  d.id, 0,
  'Punto de partida del viaje.',
  jsonb_build_object('title', d.name, 'slug', d.slug, 'subtitle', 'Pueblo Mágico · Yucatán')
FROM public.destinations d
WHERE d.slug='valladolid'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'business'::travel_item_kind,
  b.id, 1,
  'Hospedaje elegido. Confirmar late check-out para el domingo.',
  jsonb_build_object('title', b.display_name, 'slug', b.slug, 'subtitle', 'Hotel · Valladolid')
FROM public.businesses b JOIN public.destinations d ON d.id=b.destination_id
WHERE d.slug='valladolid' AND b.slug='hacienda-selva-maya'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'business'::travel_item_kind,
  b.id, 2,
  'Cena del sábado.',
  jsonb_build_object('title', b.display_name, 'slug', b.slug, 'subtitle', 'Restaurante · Valladolid')
FROM public.businesses b JOIN public.destinations d ON d.id=b.destination_id
WHERE d.slug='valladolid' AND b.slug='cocina-de-dona-elsa'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'product'::travel_item_kind,
  p.id, 3, NULL,
  jsonb_build_object('title', p.name, 'slug', p.slug, 'subtitle', 'Suite · Hacienda Selva Maya')
FROM public.products p WHERE p.slug='suite-selva-maya-demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'product'::travel_item_kind,
  p.id, 4, 'Reservar mesa a las 20:00.',
  jsonb_build_object('title', p.name, 'slug', p.slug, 'subtitle', 'Menú · Cocina de Doña Elsa')
FROM public.products p WHERE p.slug='menu-cochinita-tradicional-demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'event'::travel_item_kind,
  e.id, 5, 'Evento cultural del fin de semana.',
  jsonb_build_object('title', e.title, 'slug', e.slug, 'subtitle', 'Festival · Valladolid')
FROM public.events e WHERE e.slug='festival-vaqueria-valladolid-demo'
ON CONFLICT DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000001'::uuid,
  'note'::travel_item_kind,
  NULL, 6,
  'Aniversario · 2 personas · llegada viernes 18:00 · avisar al concierge.',
  jsonb_build_object('title', 'Contexto del viaje', 'subtitle', 'Nota para el concierge')
WHERE NOT EXISTS (
  SELECT 1 FROM public.travel_plan_items
  WHERE plan_id='d3e10000-e4d0-4dec-9999-000000000001'
    AND item_kind='note'
);

-- Plan ARCHIVADO
INSERT INTO public.travel_plans (
  id, user_id, title, status, party_size, start_date, end_date,
  notes, source, meta, archived_at
) VALUES (
  'd3e10000-e4d0-4dec-9999-000000000002',
  'd3e00000-e4d0-4dec-9999-000000000001',
  'Escapada del año pasado a Valladolid',
  'archived', 2,
  (current_date - INTERVAL '180 days')::date,
  (current_date - INTERVAL '177 days')::date,
  'Viaje concluido — referencia para el nuevo plan.',
  'web',
  jsonb_build_object('demo', true, 'demo_batch', 'e4.2'),
  now() - INTERVAL '175 days'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.travel_plan_items (plan_id, item_kind, target_id, position, notes, snapshot)
SELECT
  'd3e10000-e4d0-4dec-9999-000000000002'::uuid,
  'business'::travel_item_kind,
  b.id, 0, 'Nos encantó — repetir.',
  jsonb_build_object('title', b.display_name, 'slug', b.slug, 'subtitle', 'Restaurante · Valladolid')
FROM public.businesses b WHERE b.slug='cocina-de-dona-elsa'
ON CONFLICT DO NOTHING;