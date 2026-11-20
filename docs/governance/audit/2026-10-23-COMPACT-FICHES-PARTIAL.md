# Reconciliación y compactación de fichas — entrega parcial

## Alcance y resultado

Autorización: reconciliar y compactar hoteles, restaurantes, casas de vacaciones, lugares y eventos; conservar estructura, orden, contenido, medios, marca, acciones y controles editoriales. No publicar.

Lugares: se registró el bloque Premium ya existente en la biblioteca runtime. Se añadió la lectura de entidades reales al Preview Registry existente, usando el mismo adaptador público y PlacePremiumSurface; sin reemplazar árboles CMS. La selección autenticada de Calzada de los Frailes mostró su título, fotos, contenido, Guardar, Mi Viaje y Alux reales.

Compactación localizada en PlacePremiumSurface: menores márgenes entre secciones y separación del relato; interlineado del cuerpo 24px móvil/28px desde tableta, fuente de marca conservada. Hero, galería, estructura de mapas y recomendaciones intactos.

No se modificaron BusinessSurface ni EventPremiumSurface. Su composición editorial granular no equivale al renderer público fijo; falta ownership lossless de secciones que preserve orden, visibilidad y edición. Sustituir el árbol por una ficha completa sería una regresión editorial, no una reconciliación.

## Muestras y controles

- Hotel: `/oriente-maya/valladolid/hoteles/hotel-sutuk`.
- Restaurante: `/oriente-maya/valladolid/restaurantes/kuran-japonesa-oriental`.
- Casa: `/oriente-maya/valladolid/casas-de-vacaciones/casa-colonial-sisal`.
- Lugar: `/oriente-maya/valladolid/lugares/calzada-de-los-frailes`.
- Evento: `/eventos/zazil-tunich`.
- Constructor autenticado: plantilla `__tpl_place__`, entidad `valladolid/calzada-de-los-frailes`; selección real verificada sin guardar.
- Comparativa pública completa por desplazamiento y snapshots en 1440/834/430/390: las cinco fichas conservan textos, enlaces y número de secciones, cero desbordamiento. Fotos de Lugares idénticas. Cuatro familias no modificadas conservan alturas.
- Lugares: altura acumulada de secciones 3074→3062 (1440), 3772→3744 (834), 4292→4220 (430), 4491→4411 (390); reducciones adicionales entre secciones no incluidas en esa suma.
- Capturas móviles públicas y constructor inspeccionadas; evidencia temporal en `/tmp/browser/compact-approved/`.
- 45 pruebas, 0 fallos; runtime registration, contract, public connection y editorial authoring.
- Build automático: OK, último resultado observado 04:59:03 UTC.
- Route Inventory: FAIL previo, tres rutas no registradas (`generate-image`, `stt`, `tts`); no se crearon rutas en esta entrega.
- Governance: FAIL previo, artefactos ausentes y gap obsoleto; 610 warnings. No se alteran registros fuera de alcance.
- Lint dirigido: quedan hook condicional previo en RenderNode y regla react/no-danger no instalada; cambios nuevos formateados.

## Gates y pendientes

Scope Gate: PASS para delta localizado de Lugares. Preservation pública comparada: PASS de contenido, enlaces, medios y estructura fuera del espaciado autorizado. Paridad editorial completa y aceptación humana: pendientes; no se declara cierre global.

Pendientes: ownership de negocios/eventos, compactación de esas cuatro familias, aceptación visual, prueba 360 y controles globales históricos. La selección y estructura editorial de Lugar se conservan por traversal normal; no se probaron escrituras, reordenamiento persistido ni reservas. El entorno tuvo un fallo transitorio ECONNRESET y un aviso Google Maps por dominio localhost; reintento exitoso, mapa real no certificado.

Rollback: retirar el delta local de clases, el provider de Lugar y su lectura contextual, junto al registro aditivo. Ninguna migración, dato CMS, original multimedia ni publicación que revertir.