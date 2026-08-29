-- G8-R1-F1B-B3 · Geolocalización acreditada del lote público (Nominatim/OSM · ODbL)
ALTER TABLE public.entity_field_provenance DROP CONSTRAINT IF EXISTS efp_source_kind_allowlist;
ALTER TABLE public.entity_field_provenance ADD CONSTRAINT efp_source_kind_allowlist CHECK (
  source_kind = ANY (ARRAY['official_site','official_social','tourism_registry','chamber','press_release','owner_provided','licensed_editorial','open_geodata'])
);

DO $$
DECLARE
  rec record;
  v_business uuid;
  v_prev_lat double precision;
  v_prev_lon double precision;
  accepted jsonb := '[
    {"loc":"6de4976d-412c-48c6-9c1d-cd7e78532e38","lat":20.689368,"lon":-88.1918608,"osm":"way/50548503","q":"Calle 41, Valladolid, Yucatán, México","km":0.961},
    {"loc":"fa470695-2bfd-418c-9a32-6687dce9fb78","lat":20.68896,"lon":-88.1931993,"osm":"way/373349918","q":"Calle 28, Santa Ana, Valladolid, Yucatán, México","km":0.825},
    {"loc":"ceaf8a00-2281-4232-9c81-9949078cddb1","lat":20.6878504,"lon":-88.2021476,"osm":"way/1367354345","q":"Calle 42, Centro, Valladolid, Yucatán, México","km":0.223},
    {"loc":"d82a55da-7c24-4125-8cf9-66b1783400cd","lat":20.6842325,"lon":-88.2011007,"osm":"way/357571415","q":"Calle 40 211, San Juan, Valladolid, Yucatán, México","km":0.597},
    {"loc":"9f457d4e-6871-4b31-9094-0b0a875f978a","lat":20.6896271,"lon":-88.2022629,"osm":"way/1367354353","q":"Calle 42 159, Valladolid, Yucatán, México","km":0.121},
    {"loc":"864540f9-b77a-40f2-ba56-9ce8ada3c6c2","lat":20.6854548,"lon":-88.2108002,"osm":"way/373152124","q":"Calle 49, Sisal, Valladolid, Yucatán, México","km":1.109}
  ]'::jsonb;
BEGIN
  FOR rec IN SELECT * FROM jsonb_to_recordset(accepted)
    AS x(loc uuid, lat double precision, lon double precision, osm text, q text, km numeric)
  LOOP
    SELECT business_id, latitude, longitude INTO v_business, v_prev_lat, v_prev_lon
    FROM public.business_locations WHERE id = rec.loc;
    IF v_business IS NULL THEN CONTINUE; END IF;
    -- Nunca sobrescribir una coordenada acreditada existente (idempotente).
    IF v_prev_lat IS NOT NULL AND v_prev_lon IS NOT NULL THEN CONTINUE; END IF;

    UPDATE public.business_locations
    SET latitude = rec.lat,
        longitude = rec.lon,
        metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
          'coordinates','geocoded_accredited',
          'coordinates_precision','calle',
          'coordinates_source','nominatim.openstreetmap.org',
          'coordinates_license','ODbL-1.0',
          'coordinates_attribution','© OpenStreetMap contributors · ODbL 1.0',
          'coordinates_osm_ref', rec.osm,
          'coordinates_query', rec.q,
          'coordinates_distance_km_from_center', rec.km,
          'coordinates_batch','G8-R1-F1B-B3',
          'coordinates_recorded_at', now(),
          'coordinates_snapshot_previous', jsonb_build_object('latitude', v_prev_lat, 'longitude', v_prev_lon)
        ),
        updated_at = now()
    WHERE id = rec.loc;

    INSERT INTO public.entity_field_provenance
      (entity_type, entity_id, field_path, source_url, source_owner, source_kind,
       observed_at, verification_level, evidence_ref, metadata)
    SELECT 'business', v_business, f,
      'https://nominatim.openstreetmap.org/search?q=' || replace(replace(rec.q,' ','%20'),',','%2C'),
      'OpenStreetMap contributors', 'open_geodata', now(), 'editorially_verified',
      'docs/governance/evidence/g8-r1-f1b-b3/geocode-cache.json',
      jsonb_build_object(
        'license','ODbL-1.0',
        'attribution','© OpenStreetMap contributors · ODbL 1.0',
        'osm_ref', rec.osm,
        'precision','calle',
        'distance_km_from_center', rec.km::text,
        'batch','G8-R1-F1B-B3',
        'location_id', rec.loc::text)
    FROM unnest(ARRAY['business_locations.latitude','business_locations.longitude']) AS f
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entity_field_provenance p
      WHERE p.entity_id = v_business AND p.field_path = f
        AND p.source_kind = 'open_geodata' AND p.superseded_at IS NULL
    );

    INSERT INTO public.content_audit_log (entity_kind, entity_id, action, notes, metadata)
    VALUES ('business', v_business, 'geolocation_accredited',
      'G8-R1-F1B-B3 · coordenada acreditada por geocodificación OSM validada manualmente',
      jsonb_build_object('location_id', rec.loc::text, 'osm_ref', rec.osm, 'precision','calle',
        'license','ODbL-1.0','previous', jsonb_build_object('latitude', v_prev_lat, 'longitude', v_prev_lon),
        'rollback','UPDATE public.business_locations SET latitude=NULL, longitude=NULL WHERE id=''' || rec.loc::text || ''''));
  END LOOP;
END $$;

-- Fichas sin coordenada acreditada: bloqueo explícito de publicación.
UPDATE public.business_locations l
SET metadata = coalesce(l.metadata,'{}'::jsonb) || jsonb_build_object(
      'coordinates','pending_manual_confirmation',
      'coordinates_batch','G8-R1-F1B-B3',
      'coordinates_blocker','operator_confirmation_required')
FROM public.businesses b
WHERE b.id = l.business_id
  AND b.record_origin = 'public_source'
  AND l.deleted_at IS NULL
  AND (l.latitude IS NULL OR l.longitude IS NULL);