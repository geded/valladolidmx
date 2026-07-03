
-- Enriquecer los 6 destinos legacy con contenido completo tipo micrositio.

UPDATE public.destinations SET
  description = 'Valladolid, fundada en 1543 sobre el pueblo maya de Zací, es la puerta colonial del oriente de Yucatán y sede oficial del Pueblo Mágico más completo de la Península. Su traza colonial gira en torno al Parque Francisco Cantón Rosado, la Catedral de San Servacio y la Calzada de los Frailes que baja hasta el ex convento de San Bernardino. Combina cenotes urbanos como Zací, gastronomía yucateca de autor, textiles y guayaberas artesanales, y una vida nocturna cultural en torno al video mapping "Noche de las Ánimas". Es la base ideal para conocer Chichén Itzá, Ek Balam, Río Lagartos y decenas de cenotes.',
  highlights = ARRAY['Pueblo Mágico desde 2012','Catedral de San Servacio','Cenote Zací a 3 cuadras del centro','Calzada de los Frailes','Base para Chichén Itzá y Ek Balam','Video mapping nocturno en San Bernardino'],
  latitude = 20.6896, longitude = -88.2020,
  hero_palette = 'territorio',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/Valladolid_(Yucat%C3%A1n)'
WHERE slug = 'valladolid';

UPDATE public.destinations SET
  description = 'Izamal, la "Ciudad Amarilla", es Pueblo Mágico y uno de los pocos lugares donde conviven tres culturas visibles en una misma plaza: la pirámide maya Kinich Kakmó (con base de más de 200 metros por lado), el Convento de San Antonio de Padua construido en 1553 sobre otra pirámide y trazado colonial en su totalidad pintado de amarillo ocre y blanco. Fue capital religiosa de los mayas y sede de la primera visita papal a un pueblo indígena (Juan Pablo II, 1993). Talleres de hamacas, joyería en filigrana y cochinita pibil en horno de tierra completan la experiencia.',
  highlights = ARRAY['Ciudad Amarilla Pueblo Mágico','Convento de San Antonio de Padua (1553)','Pirámide Kinich Kakmó','Trazado colonial pintado a mano','Talleres de hamacas y filigrana','Recorridos en calesa por el centro'],
  latitude = 20.9297, longitude = -89.0175,
  hero_palette = 'atardecer',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/Izamal'
WHERE slug = 'izamal';

UPDATE public.destinations SET
  description = 'Ek Balam ("jaguar negro" en maya) es una ciudad amurallada del Clásico Tardío (700–1000 d.C.) a 30 km al norte de Valladolid. Su rasgo distintivo es la Acrópolis de 32 metros de altura y 160 de largo —una de las estructuras mayas más grandes que aún se pueden escalar— con un friso de estuco excepcionalmente preservado que representa a figuras aladas custodiando la tumba del gobernante Ukit Kan Le''k Tok''. El sitio conserva juego de pelota, plazas ceremoniales y muralla defensiva, y se suele combinar con un baño en el cenote X''Canché a un kilómetro de la entrada.',
  highlights = ARRAY['Acrópolis escalable de 32 m','Friso de estuco original con figuras aladas','Muralla defensiva completa','Cenote X''Canché a 1 km','Menos concurrida que Chichén Itzá','Recorrido en bicicleta desde la comunidad'],
  latitude = 20.8917, longitude = -88.1367,
  hero_palette = 'selva',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/Ek_Balam'
WHERE slug = 'ek-balam';

UPDATE public.destinations SET
  description = 'Las Coloradas es una comunidad pesquera dentro de la Reserva de la Biosfera Ría Lagartos, célebre mundialmente por sus piscinas de salmuera de tonos rosados y magenta —producto de las microalgas, el plancton y la halobacteria concentrados por la evaporación en las salineras industriales que operan desde el siglo XIX. El acceso a las piscinas requiere tour guiado autorizado por la comunidad. Alrededor se observan flamencos rosados, garzas, cocodrilos y playas vírgenes del Golfo de México. A 10 minutos está la playa de Punta Ostiones y las salinas activas.',
  highlights = ARRAY['Piscinas rosadas únicas en México','Reserva de la Biosfera Ría Lagartos','Flamencos rosados todo el año','Salineras industriales del siglo XIX','Acceso solo con tour comunitario','Combina con Río Lagartos'],
  latitude = 21.6167, longitude = -87.9833,
  hero_palette = 'atardecer',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/Las_Coloradas_(Tizim%C3%ADn)'
WHERE slug = 'las-coloradas';

UPDATE public.destinations SET
  description = 'Río Lagartos es un puerto pesquero y la puerta de entrada a la Reserva de la Biosfera Ría Lagartos, un humedal RAMSAR de 60,000 hectáreas donde anidan más de 400 especies de aves, incluida la mayor colonia de flamenco rosado del Caribe. Los recorridos en lancha atraviesan manglares, ojos de agua dulce en medio del mar, salineras y —en noches sin luna de julio a octubre— zonas de bioluminiscencia. En el pueblo la cocina se centra en pescado fresco, ceviches y el emblemático "chile x''catic" relleno de cazón.',
  highlights = ARRAY['Reserva de la Biosfera Ría Lagartos','Mayor colonia de flamencos rosados del Caribe','Bioluminiscencia julio–octubre','Baño de arcilla maya (Chan Ha)','Cocina de pescado y ceviches','Base para Las Coloradas'],
  latitude = 21.6033, longitude = -88.1592,
  hero_palette = 'cenote',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/R%C3%ADo_Lagartos'
WHERE slug = 'rio-lagartos';

UPDATE public.destinations SET
  description = 'Uayma es un pueblo maya a 20 minutos de Valladolid, célebre por su Iglesia y ex Convento de la Purísima Concepción, un templo franciscano del siglo XVI cuya fachada barroca fue restaurada en 2005 con pintura roja y blanca y decorada con más de 300 estrellas y flores de ocho pétalos —motivos que hacen que "parezca bordada". Es uno de los ejemplos más fotogénicos de arquitectura religiosa novohispana en Yucatán. El pueblo mantiene tradiciones de bordado en hilo contado y ofrece talleres para visitantes.',
  highlights = ARRAY['Fachada barroca restaurada con estrellas y flores','Ex convento franciscano del siglo XVI','A 20 minutos de Valladolid','Talleres de bordado en hilo contado','Fotogénica de día y de noche','Combina con ruta de conventos'],
  latitude = 20.7181, longitude = -88.3097,
  hero_palette = 'selva',
  is_demo_seed = true, demo_seed_batch = 'demo_fund_2026_07_v1_destinos',
  demo_source_url = 'https://es.wikipedia.org/wiki/Uayma'
WHERE slug = 'uayma';
