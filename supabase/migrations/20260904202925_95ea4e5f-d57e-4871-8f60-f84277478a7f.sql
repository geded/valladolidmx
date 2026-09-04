-- Lote 3C · B · Rutas editoriales administrables (aditivo y reversible)

ALTER TABLE public.editorial_routes
  ADD COLUMN IF NOT EXISTS region_slug text NOT NULL DEFAULT 'oriente-maya',
  ADD COLUMN IF NOT EXISTS origin_destination_id uuid REFERENCES public.destinations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duration_hours integer,
  ADD COLUMN IF NOT EXISTS pace text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS audiences text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seasons text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS gallery_media_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_demo_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_seed_batch text;

COMMENT ON TABLE public.editorial_routes IS
  'Lote 3C: ruta editorial/territorial pública administrada desde CMS. NO es el itinerario privado del viajero (travel_plans).';

CREATE TABLE IF NOT EXISTS public.editorial_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.editorial_routes(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 1,
  day_number integer,
  entity_kind text NOT NULL CHECK (entity_kind IN ('place','experience','event','business','product','destination','note')),
  entity_id uuid,
  title text,
  note text,
  duration_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT editorial_route_stops_entity_ref CHECK (entity_kind = 'note' OR entity_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS editorial_route_stops_route_idx
  ON public.editorial_route_stops (route_id, position);

GRANT SELECT ON public.editorial_route_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_route_stops TO authenticated;
GRANT ALL ON public.editorial_route_stops TO service_role;

ALTER TABLE public.editorial_route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY editorial_route_stops_public_read ON public.editorial_route_stops
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.editorial_routes r
    WHERE r.id = editorial_route_stops.route_id
      AND r.status = 'published'
      AND r.deleted_at IS NULL
  ));

CREATE POLICY editorial_route_stops_editor_all ON public.editorial_route_stops
  FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid()))
  WITH CHECK (public.is_editor_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.editorial_route_stops_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_editorial_route_stops_touch ON public.editorial_route_stops;
CREATE TRIGGER trg_editorial_route_stops_touch
  BEFORE UPDATE ON public.editorial_route_stops
  FOR EACH ROW EXECUTE FUNCTION public.editorial_route_stops_touch_updated_at();

REVOKE EXECUTE ON FUNCTION public.editorial_route_stops_touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Enriquecimiento editorial de las tres rutas demo existentes
UPDATE public.editorial_routes SET
  origin_destination_id = '11111111-aaaa-4aaa-8aaa-000000000001',
  duration_hours = 18,
  pace = 'moderado',
  difficulty = 'media',
  interests = ARRAY['naturaleza','arqueologia','gastronomia'],
  audiences = ARRAY['parejas','amigos'],
  seasons = ARRAY['todo-el-ano'],
  is_demo_seed = true,
  demo_seed_batch = 'lote-3c-rutas-demo',
  updated_at = now()
WHERE id = 'd3dcdaf6-87ec-4c44-9154-ace7d799fa90';

UPDATE public.editorial_routes SET
  origin_destination_id = '11111111-aaaa-4aaa-8aaa-000000000003',
  duration_hours = 12,
  pace = 'relajado',
  difficulty = 'baja',
  interests = ARRAY['naturaleza','fotografia'],
  audiences = ARRAY['familias','parejas'],
  seasons = ARRAY['temporada-seca'],
  is_demo_seed = true,
  demo_seed_batch = 'lote-3c-rutas-demo',
  updated_at = now()
WHERE id = '96893479-7cc5-4694-8b3a-9b61c79c81ef';

UPDATE public.editorial_routes SET
  origin_destination_id = '11111111-aaaa-4aaa-8aaa-000000000001',
  duration_hours = 24,
  pace = 'moderado',
  difficulty = 'baja',
  interests = ARRAY['cultura','arquitectura','artesania'],
  audiences = ARRAY['familias','grupos'],
  seasons = ARRAY['todo-el-ano'],
  is_demo_seed = true,
  demo_seed_batch = 'lote-3c-rutas-demo',
  updated_at = now()
WHERE id = 'fc65c005-9b7c-418a-a2e1-73131b875ec3';

INSERT INTO public.editorial_route_stops (route_id, position, day_number, entity_kind, entity_id, title, note, duration_minutes)
SELECT v.route_id::uuid, v.position, v.day_number, v.entity_kind, v.entity_id::uuid, v.title, v.note, v.duration_minutes
FROM (VALUES
  ('d3dcdaf6-87ec-4c44-9154-ace7d799fa90',1,1,'place','7dedc0f8-0bdc-485c-9bef-608bae559a9f','Cenote Zací','Primer chapuzón a unos pasos del centro.',90),
  ('d3dcdaf6-87ec-4c44-9154-ace7d799fa90',2,1,'business','eaf37375-29bd-4736-abe9-c79ca54df8e7','Comida en Yerbabuena del Sisal','Cocina yucateca de mercado.',75),
  ('d3dcdaf6-87ec-4c44-9154-ace7d799fa90',3,2,'place','b5c4be83-d674-477b-bb33-2a9c0c69de17','Cenote Suytun','Luz cenital a primera hora.',120),
  ('d3dcdaf6-87ec-4c44-9154-ace7d799fa90',4,3,'destination','11111111-aaaa-4aaa-8aaa-000000000002','Ek Balam','Acrópolis al amanecer.',180),
  ('96893479-7cc5-4694-8b3a-9b61c79c81ef',1,1,'destination','11111111-aaaa-4aaa-8aaa-000000000003','Río Lagartos','Avistamiento de flamencos en la ría.',180),
  ('96893479-7cc5-4694-8b3a-9b61c79c81ef',2,2,'destination','11111111-aaaa-4aaa-8aaa-000000000004','Las Coloradas','Salineras rosadas y atardecer.',150),
  ('fc65c005-9b7c-418a-a2e1-73131b875ec3',1,1,'place','1a089755-d6e6-4bfc-b0dc-f7f8b47a34c0','Calzada de los Frailes','Fachadas restauradas y talleres.',90),
  ('fc65c005-9b7c-418a-a2e1-73131b875ec3',2,1,'place','f7728d46-6e4b-4c24-927c-c44568e1fe6b','Ex Convento de San Bernardino','Historia colonial y video mapping.',80),
  ('fc65c005-9b7c-418a-a2e1-73131b875ec3',3,2,'destination','11111111-aaaa-4aaa-8aaa-000000000006','Uayma','Iglesia policromada y vida de pueblo.',120),
  ('fc65c005-9b7c-418a-a2e1-73131b875ec3',4,3,'business','58be51b7-ef57-4b39-89c3-dfb690ee7f91','Restaurante Kinich','Sobremesa yucateca en Izamal.',120),
  ('fc65c005-9b7c-418a-a2e1-73131b875ec3',5,4,'business','66666666-aaaa-4aaa-8aaa-000000000002','Villa Amarilla · Izamal','Noche final en casa completa.',null)
) AS v(route_id, position, day_number, entity_kind, entity_id, title, note, duration_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.editorial_route_stops s
  WHERE s.route_id = v.route_id::uuid AND s.position = v.position
);