ALTER TABLE public.restaurant_slot_holds ADD COLUMN IF NOT EXISTS table_id text;

CREATE OR REPLACE FUNCTION public._restaurant_free_table(_business_id uuid, _start timestamptz, _party integer, _zone text, _exclude uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.restaurant_booking_settings; free jsonb; t jsonb; occupied record; v_end timestamptz; chosen text;
BEGIN
 SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id=_business_id;
 IF NOT FOUND OR jsonb_array_length(COALESCE(s.floor_plan,'[]'::jsonb))=0 THEN RETURN NULL; END IF;
 free := s.floor_plan; v_end := _start + make_interval(mins=>s.duration_minutes);
 -- Respect fixed table assignments before allocating older unassigned bookings.
 FOR occupied IN
  SELECT r.table_id FROM public.restaurant_reservations r WHERE r.business_id=_business_id AND r.status IN ('pendiente','confirmada','llego','sentada') AND r.starts_at<v_end AND r.ends_at>_start AND (_exclude IS NULL OR r.id<>_exclude) AND r.table_id IS NOT NULL
  UNION ALL
  SELECT h.table_id FROM public.restaurant_slot_holds h WHERE h.business_id=_business_id AND h.expires_at>now() AND h.starts_at<v_end AND h.ends_at>_start AND (_exclude IS NULL OR h.token<>_exclude) AND h.table_id IS NOT NULL
 LOOP
  SELECT COALESCE(jsonb_agg(e),'[]'::jsonb) INTO free FROM jsonb_array_elements(free) e WHERE e->>'id'<>occupied.table_id;
 END LOOP;
 FOR occupied IN
  SELECT x.party_size FROM (
   SELECT r.party_size FROM public.restaurant_reservations r WHERE r.business_id=_business_id AND r.status IN ('pendiente','confirmada','llego','sentada') AND r.starts_at<v_end AND r.ends_at>_start AND (_exclude IS NULL OR r.id<>_exclude) AND r.table_id IS NULL
   UNION ALL
   SELECT h.party_size FROM public.restaurant_slot_holds h WHERE h.business_id=_business_id AND h.expires_at>now() AND h.starts_at<v_end AND h.ends_at>_start AND (_exclude IS NULL OR h.token<>_exclude) AND h.table_id IS NULL
  ) x ORDER BY x.party_size DESC
 LOOP
  SELECT e->>'id' INTO chosen FROM jsonb_array_elements(free) e WHERE (e->>'seats')::int>=occupied.party_size ORDER BY (e->>'seats')::int,e->>'id' LIMIT 1;
  IF chosen IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(e),'[]'::jsonb) INTO free FROM jsonb_array_elements(free) e WHERE e->>'id'<>chosen;
 END LOOP;
 SELECT e->>'id' INTO chosen FROM jsonb_array_elements(free) e WHERE (e->>'seats')::int>=_party AND (_zone IS NULL OR _zone='' OR btrim(e->>'zone')=_zone) ORDER BY (e->>'seats')::int,e->>'id' LIMIT 1;
 RETURN chosen;
END $$;
REVOKE ALL ON FUNCTION public._restaurant_free_table(uuid,timestamptz,integer,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public._restaurant_free_table(uuid,timestamptz,integer,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._restaurant_fits(_business_id uuid, _start timestamptz, _party integer, _exclude uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.restaurant_booking_settings; free int[]:='{}'; t jsonb; i int; p int; best int; idx int; v_end timestamptz;
BEGIN
 SELECT * INTO s FROM public.restaurant_booking_settings WHERE business_id=_business_id;
 IF NOT FOUND THEN RETURN false; END IF;
 IF jsonb_array_length(COALESCE(s.floor_plan,'[]'::jsonb))>0 THEN
  RETURN public._restaurant_free_table(_business_id,_start,_party,NULL,_exclude) IS NOT NULL;
 END IF;
 v_end:=_start+make_interval(mins=>s.duration_minutes);
 FOR t IN SELECT * FROM jsonb_array_elements(s.tables) LOOP
  FOR i IN 1..LEAST(GREATEST(COALESCE((t->>'count')::int,0),0),200) LOOP free:=free||COALESCE((t->>'seats')::int,0); END LOOP;
 END LOOP;
 FOR p IN SELECT x.party_size FROM (
  SELECT r.party_size FROM public.restaurant_reservations r WHERE r.business_id=_business_id AND r.status IN ('pendiente','confirmada','llego','sentada') AND (_exclude IS NULL OR r.id<>_exclude) AND r.starts_at<v_end AND r.ends_at>_start
  UNION ALL
  SELECT h.party_size FROM public.restaurant_slot_holds h WHERE h.business_id=_business_id AND h.expires_at>now() AND (_exclude IS NULL OR h.token<>_exclude) AND h.starts_at<v_end AND h.ends_at>_start
 ) x ORDER BY x.party_size DESC LOOP
  best:=NULL; idx:=NULL;
  FOR i IN 1..COALESCE(array_length(free,1),0) LOOP IF free[i]>=p AND (best IS NULL OR free[i]<best) THEN best:=free[i];idx:=i; END IF; END LOOP;
  IF idx IS NOT NULL THEN free:=free[1:idx-1]||free[idx+1:]; END IF;
 END LOOP;
 FOR i IN 1..COALESCE(array_length(free,1),0) LOOP IF free[i]>=_party THEN RETURN true; END IF; END LOOP;
 RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.restaurant_public_booking_config(_business_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN public._restaurant_booking_on(_business_id) THEN
 (SELECT jsonb_build_object('enabled',true,'max_party',r.max_party,'min_party',r.min_party,'max_days_ahead',r.max_days_ahead,'confirm_mode',r.confirm_mode,'duration_minutes',r.duration_minutes,'min_notice_minutes',r.min_notice_minutes,'policies',r.policies,
 'zones',COALESCE((SELECT jsonb_agg(z.zone ORDER BY z.first_pos) FROM (SELECT btrim(e->>'zone') zone,min(ord) first_pos FROM jsonb_array_elements(COALESCE(r.floor_plan,'[]'::jsonb)) WITH ORDINALITY AS plan(e,ord) WHERE NULLIF(btrim(e->>'zone'),'') IS NOT NULL GROUP BY btrim(e->>'zone')) z),'[]'::jsonb)) FROM public.restaurant_booking_settings r WHERE r.business_id=_business_id)
 ELSE jsonb_build_object('enabled',false) END;
$$;

CREATE OR REPLACE FUNCTION public.restaurant_public_slots(_business_id uuid,_date date,_party integer,_zone text)
RETURNS TABLE(slot_time text,starts_at timestamptz,available boolean,zones text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT x.slot_time,x.starts_at,x.available AND (_zone IS NULL OR _zone='' OR _zone=ANY(z.names)),z.names
 FROM public.restaurant_public_slots(_business_id,_date,_party) x
 CROSS JOIN LATERAL (SELECT COALESCE(array_agg(v.value),ARRAY[]::text[]) names FROM jsonb_array_elements_text(public.restaurant_public_booking_config(_business_id)->'zones') v WHERE x.available AND public._restaurant_free_table(_business_id,x.starts_at,_party,v.value,NULL) IS NOT NULL) z;
$$;
REVOKE ALL ON FUNCTION public.restaurant_public_slots(uuid,date,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_public_slots(uuid,date,integer,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.restaurant_hold_slot(_business_id uuid,_starts_at timestamptz,_party integer,_replace uuid,_zone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; chosen text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:'||_business_id::text));
 result:=public.restaurant_hold_slot(_business_id,_starts_at,_party,_replace);
 IF NULLIF(btrim(_zone),'') IS NOT NULL THEN
  chosen:=public._restaurant_free_table(_business_id,_starts_at,_party,btrim(_zone),(result->>'token')::uuid);
  IF chosen IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
  UPDATE public.restaurant_slot_holds SET table_id=chosen WHERE token=(result->>'token')::uuid AND business_id=_business_id;
 END IF;
 RETURN result||jsonb_build_object('zone',NULLIF(btrim(_zone),''));
END $$;
REVOKE ALL ON FUNCTION public.restaurant_hold_slot(uuid,timestamptz,integer,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_hold_slot(uuid,timestamptz,integer,uuid,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.restaurant_book(_business_id uuid,_starts_at timestamptz,_party integer,_name text,_phone text,_email text,_occasion text,_note text,_source text,_hold uuid,_zone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb; chosen text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:'||_business_id::text));
 IF NULLIF(btrim(_zone),'') IS NOT NULL THEN
  chosen:=public._restaurant_free_table(_business_id,_starts_at,_party,btrim(_zone),_hold);
  IF chosen IS NULL THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 END IF;
 result:=public.restaurant_book(_business_id,_starts_at,_party,_name,_phone,_email,_occasion,_note,_source,_hold);
 IF chosen IS NOT NULL THEN UPDATE public.restaurant_reservations SET table_id=chosen WHERE id=(result->>'id')::uuid; END IF;
 RETURN result||jsonb_build_object('zone',NULLIF(btrim(_zone),''));
END $$;
REVOKE ALL ON FUNCTION public.restaurant_book(uuid,timestamptz,integer,text,text,text,text,text,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restaurant_book(uuid,timestamptz,integer,text,text,text,text,text,text,uuid,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.restaurant_assign_table(_id uuid,_table_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.restaurant_reservations;
BEGIN
 SELECT * INTO r FROM public.restaurant_reservations WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 IF NOT public._restaurant_staff(r.business_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('restaurant_book:'||r.business_id::text));
 IF _table_id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.restaurant_reservations o WHERE o.business_id=r.business_id AND o.id<>r.id AND o.table_id=_table_id AND o.status IN ('pendiente','confirmada','llego','sentada') AND o.starts_at<r.ends_at AND o.ends_at>r.starts_at)
 OR EXISTS (SELECT 1 FROM public.restaurant_slot_holds h WHERE h.business_id=r.business_id AND h.table_id=_table_id AND h.expires_at>now() AND h.starts_at<r.ends_at AND h.ends_at>r.starts_at)) THEN RAISE EXCEPTION 'table_taken'; END IF;
 UPDATE public.restaurant_reservations SET table_id=NULLIF(btrim(_table_id),''),updated_at=now() WHERE id=_id;
END $$;