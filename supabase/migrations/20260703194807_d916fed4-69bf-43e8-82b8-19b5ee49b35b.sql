
-- =========================================================================
-- Iniciativa 7 · Sub-ola A · Travel Workspace Data Layer
-- =========================================================================

-- 1. ENUM item kind (contrato universal)
DO $$ BEGIN
  CREATE TYPE public.travel_item_kind AS ENUM ('destination','business','product','event','note');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.travel_plan_status AS ENUM ('draft','active','shared_with_concierge','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.travel_plan_source AS ENUM ('web','import','concierge','alux');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABLE travel_plans
CREATE TABLE IF NOT EXISTS public.travel_plans (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text NOT NULL DEFAULT 'Mi viaje al Oriente Maya',
  status            public.travel_plan_status NOT NULL DEFAULT 'active',
  party_size        integer,
  start_date        date,
  end_date          date,
  notes             text,
  cover_image_url   text,
  source            public.travel_plan_source NOT NULL DEFAULT 'web',
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  case_id           uuid REFERENCES public.concierge_cases(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,
  CONSTRAINT travel_plans_dates_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT travel_plans_party_chk CHECK (party_size IS NULL OR (party_size >= 1 AND party_size <= 40))
);

-- Máximo 1 plan 'active' por usuario (v1). Multi-plan queda abierto para 'draft'/'archived'.
CREATE UNIQUE INDEX IF NOT EXISTS travel_plans_one_active_per_user
  ON public.travel_plans(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS travel_plans_user_status_idx
  ON public.travel_plans(user_id, status);

-- 3. TABLE travel_plan_items
CREATE TABLE IF NOT EXISTS public.travel_plan_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.travel_plans(id) ON DELETE CASCADE,
  item_kind     public.travel_item_kind NOT NULL,
  target_id     uuid,                     -- NULL para 'note'
  position      integer NOT NULL DEFAULT 0,
  day_index     integer,                  -- reservado para timeline futuro
  notes         text,
  snapshot      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { title, image_url, slug, subtitle }
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travel_plan_items_note_or_target_chk
    CHECK ((item_kind = 'note' AND target_id IS NULL) OR (item_kind <> 'note' AND target_id IS NOT NULL))
);

-- Deduplicación: mismo target no se agrega dos veces al mismo plan (excepto notas).
CREATE UNIQUE INDEX IF NOT EXISTS travel_plan_items_unique_target
  ON public.travel_plan_items(plan_id, item_kind, target_id)
  WHERE item_kind <> 'note';

CREATE INDEX IF NOT EXISTS travel_plan_items_plan_pos_idx
  ON public.travel_plan_items(plan_id, position);

-- 4. GRANTS (autenticados sólo; concierge lee vía función SECURITY DEFINER)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plans TO authenticated;
GRANT ALL ON public.travel_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_plan_items TO authenticated;
GRANT ALL ON public.travel_plan_items TO service_role;

-- 5. RLS
ALTER TABLE public.travel_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_plan_items ENABLE ROW LEVEL SECURITY;

-- Helper: ¿el usuario es concierge asignado al caso del plan?
CREATE OR REPLACE FUNCTION public.travel_plan_is_concierge_reader(_plan_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_plans tp
    JOIN public.concierge_assignments ca
      ON ca.case_id = tp.case_id
    WHERE tp.id = _plan_id
      AND ca.concierge_user_id = _user_id
  );
$$;

-- travel_plans policies
CREATE POLICY "traveler_owns_plans_select"
  ON public.travel_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'super_admin')
         OR public.travel_plan_is_concierge_reader(id, auth.uid()));

CREATE POLICY "traveler_owns_plans_insert"
  ON public.travel_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traveler_owns_plans_update"
  ON public.travel_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "traveler_owns_plans_delete"
  ON public.travel_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- travel_plan_items policies (delegan al owner del plan)
CREATE POLICY "plan_items_read"
  ON public.travel_plan_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_plans tp
      WHERE tp.id = plan_id
        AND (tp.user_id = auth.uid()
             OR public.has_role(auth.uid(), 'admin')
             OR public.has_role(auth.uid(), 'super_admin')
             OR public.travel_plan_is_concierge_reader(tp.id, auth.uid()))
    )
  );

CREATE POLICY "plan_items_write"
  ON public.travel_plan_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.travel_plans tp WHERE tp.id = plan_id AND tp.user_id = auth.uid())
  );

CREATE POLICY "plan_items_update"
  ON public.travel_plan_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_plans tp WHERE tp.id = plan_id AND tp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.travel_plans tp WHERE tp.id = plan_id AND tp.user_id = auth.uid()));

CREATE POLICY "plan_items_delete"
  ON public.travel_plan_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_plans tp WHERE tp.id = plan_id AND tp.user_id = auth.uid()));

-- 6. Triggers de updated_at
CREATE OR REPLACE FUNCTION public.tg_travel_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS travel_plans_touch ON public.travel_plans;
CREATE TRIGGER travel_plans_touch BEFORE UPDATE ON public.travel_plans
FOR EACH ROW EXECUTE FUNCTION public.tg_travel_touch();

DROP TRIGGER IF EXISTS travel_plan_items_touch ON public.travel_plan_items;
CREATE TRIGGER travel_plan_items_touch BEFORE UPDATE ON public.travel_plan_items
FOR EACH ROW EXECUTE FUNCTION public.tg_travel_touch();

-- Cuando cambian items, tocar el plan padre (para "last activity").
CREATE OR REPLACE FUNCTION public.tg_travel_touch_parent_plan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _pid uuid;
BEGIN
  _pid := COALESCE(NEW.plan_id, OLD.plan_id);
  UPDATE public.travel_plans SET updated_at = now() WHERE id = _pid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS travel_plan_items_touch_parent ON public.travel_plan_items;
CREATE TRIGGER travel_plan_items_touch_parent
AFTER INSERT OR UPDATE OR DELETE ON public.travel_plan_items
FOR EACH ROW EXECUTE FUNCTION public.tg_travel_touch_parent_plan();

-- 7. RPC: ensure_active — devuelve o crea el plan activo del usuario autenticado.
CREATE OR REPLACE FUNCTION public.travel_plan_ensure_active()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO _pid FROM public.travel_plans
   WHERE user_id = _uid AND status = 'active' LIMIT 1;

  IF _pid IS NULL THEN
    INSERT INTO public.travel_plans(user_id, status, source)
    VALUES (_uid, 'active', 'web')
    RETURNING id INTO _pid;
  END IF;

  RETURN _pid;
END;
$$;

REVOKE ALL ON FUNCTION public.travel_plan_ensure_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_plan_ensure_active() TO authenticated;

-- 8. RPC: import_favorites — importa favoritos del usuario al plan indicado.
CREATE OR REPLACE FUNCTION public.travel_plan_import_favorites(_plan_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count integer := 0;
  _next_pos integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.travel_plans WHERE id = _plan_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'plan_not_owned';
  END IF;

  SELECT COALESCE(MAX(position), -1) + 1 INTO _next_pos
    FROM public.travel_plan_items WHERE plan_id = _plan_id;

  WITH src AS (
    SELECT f.entity_kind::text AS kind, f.entity_id, f.created_at
      FROM public.traveler_favorites f
     WHERE f.user_id = _uid
       AND f.entity_kind IN ('business','product')  -- promotion no aplica a Mi Viaje
     ORDER BY f.created_at ASC
  ), ranked AS (
    SELECT kind, entity_id,
           row_number() OVER (ORDER BY created_at ASC) - 1 AS rn
      FROM src
  )
  INSERT INTO public.travel_plan_items(plan_id, item_kind, target_id, position, snapshot)
  SELECT _plan_id,
         r.kind::public.travel_item_kind,
         r.entity_id,
         _next_pos + r.rn,
         '{}'::jsonb
    FROM ranked r
   ON CONFLICT (plan_id, item_kind, target_id) WHERE item_kind <> 'note' DO NOTHING;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.travel_plan_import_favorites(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_plan_import_favorites(uuid) TO authenticated;

-- 9. RPC: build_snapshot — devuelve el payload de items para handoff a Concierge.
CREATE OR REPLACE FUNCTION public.travel_plan_build_snapshot(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan jsonb;
  _items jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.travel_plans
     WHERE id = _plan_id
       AND (user_id = _uid
            OR public.has_role(_uid, 'admin')
            OR public.has_role(_uid, 'super_admin')
            OR public.travel_plan_is_concierge_reader(_plan_id, _uid))
  ) THEN
    RAISE EXCEPTION 'plan_not_visible';
  END IF;

  SELECT to_jsonb(tp) - 'meta' || jsonb_build_object('meta', tp.meta)
    INTO _plan FROM public.travel_plans tp WHERE tp.id = _plan_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.position, i.created_at), '[]'::jsonb)
    INTO _items FROM public.travel_plan_items i WHERE i.plan_id = _plan_id;

  RETURN jsonb_build_object('plan', _plan, 'items', _items);
END;
$$;

REVOKE ALL ON FUNCTION public.travel_plan_build_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.travel_plan_build_snapshot(uuid) TO authenticated;
