DO $$
DECLARE
  _dest_id uuid := '11111111-aaaa-4aaa-8aaa-000000000001';
  _cat_id  uuid;
  _biz_id  uuid;
  _now     timestamptz := now();
  _comp_id uuid;
  _snapshot jsonb;
  _new_rev uuid;
BEGIN
  SELECT id INTO _cat_id FROM public.business_categories WHERE slug='cenotes' LIMIT 1;
  IF _cat_id IS NULL THEN RAISE NOTICE 'cenotes not found'; RETURN; END IF;

  INSERT INTO public.businesses (
    destination_id, primary_category_id, slug, display_name, tagline,
    description, status, verified, published_at, metadata, can_self_publish
  ) VALUES (
    _dest_id, _cat_id, 'zazil-tunich'::citext, 'Zazil Tunich',
    'El primer Cenote Museo del mundo — puerta al Inframundo Maya, a 20 minutos de Chichén Itzá.',
    E'## Un cenote hecho memoria\n\nZazil Tunich —"piedra que resplandece" en maya— es el primer Cenote Museo del mundo. Un santuario natural donde el agua, la piedra y la historia se encuentran para contar la cosmovisión del Xibalbá, el Inframundo Maya.\n\nUbicado a 20 minutos de Valladolid y 25 minutos de Chichén Itzá, es una experiencia curada para viajeros que buscan profundidad, silencio y cultura viva.\n\n## Historia\n\nDurante siglos, este cenote permaneció oculto bajo la selva yucateca. Su redescubrimiento en la última década reveló vestigios ceremoniales mayas: cerámica ritual, restos de ofrendas y estalactitas de más de 10,000 años. Hoy, su acceso está regulado por el INAH y protegido por la comunidad local.\n\n## El Cenote Museo\n\nEl recorrido interpretativo integra cédulas museográficas, iluminación arquitectónica y guías bilingües especializados en cultura maya. Cada estación revela una capa de la relación entre los antiguos mayas y el agua sagrada.\n\n## El recorrido del Xibalbá\n\nUn descenso guiado por pasillos naturales que evocan las nueve regiones del Inframundo descritas en el Popol Vuh. La experiencia culmina en la cámara principal, donde un espejo de agua turquesa refleja formaciones que parecen esculpidas por dioses.\n\nZazil Tunich es un destino de conservación, no un balneario. Cada visita apoya la investigación arqueológica y a las familias mayas de la región.',
    'published', true, _now,
    jsonb_build_object('authority_landing', true, 'seo_a3_m1', true, 'external_booking_domain','zaziltunich.com'),
    false
  )
  ON CONFLICT (slug) DO UPDATE SET
    destination_id=EXCLUDED.destination_id, primary_category_id=EXCLUDED.primary_category_id,
    display_name=EXCLUDED.display_name, tagline=EXCLUDED.tagline, description=EXCLUDED.description,
    status='published', verified=true,
    published_at=COALESCE(public.businesses.published_at,_now),
    metadata=public.businesses.metadata||EXCLUDED.metadata
  RETURNING id INTO _biz_id;

  DELETE FROM public.business_locations WHERE business_id=_biz_id;
  INSERT INTO public.business_locations (business_id,label,address_line1,postal_code,latitude,longitude,is_primary)
  VALUES (_biz_id,'Entrada principal','Carretera Yalcobá–Cuncunul km 4, Yalcobá','97780',20.7167,-88.2500,true);

  DELETE FROM public.business_contacts WHERE business_id=_biz_id;
  INSERT INTO public.business_contacts (business_id,contact_type,value,is_public,sort_order) VALUES
    (_biz_id,'website','https://zaziltunich.com',true,0),
    (_biz_id,'whatsapp','+52 985 100 0000',true,1),
    (_biz_id,'email','reservas@zaziltunich.com',true,2);

  DELETE FROM public.business_hours WHERE business_id=_biz_id;
  INSERT INTO public.business_hours (business_id,day_of_week,opens_at,closes_at,is_closed)
  SELECT _biz_id, d, '09:00'::time, '17:00'::time, false FROM generate_series(0,6) AS d;

  DELETE FROM public.products WHERE business_id=_biz_id;
  INSERT INTO public.products (
    business_id, product_type, slug, name, tagline, description,
    price_amount, price_currency, duration_minutes, status, published_at,
    conversion_mode, primary_action_label, secondary_action_mode,
    secondary_action_label, accepts_online_payment, requires_availability, visibility_level, metadata
  ) VALUES
    (_biz_id,'experiencia','recorrido-cenote-museo','Recorrido Cenote Museo',
     'Tour interpretativo guiado por el primer Cenote Museo del mundo.',
     'Recorrido bilingüe (español/inglés) por las estaciones museográficas del cenote, con inmersión histórica en la cosmovisión maya del Xibalbá.',
     450,'MXN',60,'published',_now,'sitio_externo','Reservar en Zazil Tunich','contact','Contactar',
     false,false,'standard', jsonb_build_object('external_url','https://zaziltunich.com/recorrido')),
    (_biz_id,'experiencia','nado-en-cenote','Nado en el Cenote Sagrado',
     'Nado consciente en aguas turquesa de más de 40 metros de profundidad.',
     'Experiencia acuática guiada con chaleco salvavidas incluido. Se realiza posterior al recorrido interpretativo.',
     650,'MXN',90,'published',_now,'sitio_externo','Reservar en Zazil Tunich','contact','Contactar',
     false,false,'standard', jsonb_build_object('external_url','https://zaziltunich.com/nado')),
    (_biz_id,'experiencia','cena-romantica-en-cenote','Cena Romántica en Cenote',
     'Cena privada de siete tiempos bajo la bóveda del cenote iluminado.',
     'Menú maya contemporáneo maridado con mezcales artesanales. Ambientación con velas, música en vivo opcional y servicio dedicado. Ideal para aniversarios y pedidas de mano.',
     6500,'MXN',180,'published',_now,'sitio_externo','Reservar experiencia privada','contact','Contactar',
     false,true,'destacado', jsonb_build_object('external_url','https://zaziltunich.com/cena-romantica','romantic',true)),
    (_biz_id,'experiencia','ceremonia-maya','Ceremonia Maya',
     'Ceremonia oficiada por sacerdotes mayas en el corazón del cenote.',
     'Ritual de sanación, bodas simbólicas o agradecimiento oficiado por J-Meen (sacerdote maya). Incluye ofrenda ceremonial y copal.',
     8500,'MXN',120,'published',_now,'sitio_externo','Solicitar ceremonia','contact','Contactar',
     false,true,'destacado', jsonb_build_object('external_url','https://zaziltunich.com/ceremonia','ritual',true));

  _snapshot := jsonb_build_object(
    'root', jsonb_build_object(
      'children', jsonb_build_array(
        jsonb_build_object('id','biz-zazil-surface','type','vmx.surface.business','version','1.0.0','config', jsonb_build_object())
      )
    )
  );

  INSERT INTO public.page_compositions (slug,title,description,status,page_type,kind,variant_key,current_draft,published_at)
  VALUES ('biz-zazil-tunich','Zazil Tunich — Cenote Museo del Xibalbá',
          'Landing de autoridad SEO/GEO para la empresa Premium Zazil Tunich.',
          'published','business','business','zazil-tunich',_snapshot,_now)
  ON CONFLICT (slug) DO UPDATE SET
    title=EXCLUDED.title, description=EXCLUDED.description, status='published',
    page_type=EXCLUDED.page_type, kind=EXCLUDED.kind, variant_key=EXCLUDED.variant_key,
    current_draft=EXCLUDED.current_draft,
    published_at=COALESCE(public.page_compositions.published_at,_now)
  RETURNING id INTO _comp_id;

  INSERT INTO public.page_revisions (composition_id,revision_number,snapshot,notes)
  VALUES (_comp_id,
          COALESCE((SELECT MAX(revision_number)+1 FROM public.page_revisions WHERE composition_id=_comp_id),1),
          _snapshot,
          'SEO.A3.M1 · Authority Business Landing seed.')
  RETURNING id INTO _new_rev;

  UPDATE public.page_compositions SET active_revision_id=_new_rev WHERE id=_comp_id;
END $$;