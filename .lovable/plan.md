# Plan · Qué hacer como portada editorial configurable

## Clasificación

Extensión localizada de la superficie Premium existente `/que-hacer`; no es un rediseño ni un segundo catálogo de Lugares.

## Criterio de destacados

- Modelo híbrido: cada sección permite fijar manualmente contenidos y su orden desde el Experience Builder.
- Los espacios no fijados se completan con rotación automática diaria y estable durante todo el día.
- Sólo son elegibles fichas publicadas, visibles, con portada acreditada y datos mínimos completos.
- Eventos: prioridad por vigencia y proximidad de fecha; nunca mostrar eventos vencidos.
- Experiencias: prioridad para venta aprobada o ficha completa, sin inventar disponibilidad, precio ni autorización comercial.
- Lugares: prioridad editorial y calidad de ficha; `/lugares` permanece como catálogo autoritativo.
- Destinos: equilibrio territorial para evitar que un solo destino monopolice la selección.
- Desempate: orden editorial, calidad de ficha, actualidad y variedad; no usar pago o comisión como criterio oculto.
- Si faltan candidatos válidos, la sección reduce elementos o se oculta; nunca usa fixtures ni contenido incompleto.

## Scope Gate

- Modernizar únicamente `/que-hacer` sobre su autoridad `ListingPremiumSurfaceFromDTO → TerritorialListingReviewSurface`.
- Incorporar encabezados y carriles compactos: Destinos recomendados, Eventos, Experiencias y Lugares de interés.
- Reutilizar cards, medios, rutas y lecturas CMS-first ya aprobadas para cada familia.
- Habilitar en el Experience Builder la selección, orden, visibilidad, límite y modo de relleno de cada sección.
- Reutilizar el contrato oficial de colección relacionada para selección y orden; no crear otro motor de destacados.

## Preservation Gate

- Conservar header, footer, breadcrumb, búsqueda, idioma, Alux global, Mi Viaje, marca y responsive vigentes.
- No modificar las plantillas ni los datos de Destinos, Eventos, Experiencias o Lugares.
- No convertir `/que-hacer` en un listado duplicado de `/lugares`.
- Constructor, preview y ruta pública deben consumir la misma composición publicada.
- No publicar ni desplegar sin autorización expresa.

## Implementación por aprobación

1. Capturar la línea base completa en 1440, 834, 430 y 390 px.
2. Extender la composición oficial de `/que-hacer` con las cuatro colecciones configurables.
3. Añadir controles editoriales claros: fijar, ordenar, ocultar, límite y completar automáticamente.
4. Renderizar carriles compactos y navegables con las tarjetas oficiales; cada tarjeta conduce a su ficha completa.
5. Mantener la rotación determinista por día para medición, caché y consistencia entre usuarios.

## Validación

- Comparativa antes/después en 1440, 834, 430 y 390 px.
- Un H1, cero overflow, targets táctiles accesibles y navegación por teclado.
- Verificar selección manual, orden, rotación diaria, estados vacíos y contenido no elegible.
- Verificar paridad Experience Builder, preview y `/que-hacer` pública.
- Ejecutar typecheck, pruebas focalizadas, Route Inventory y controles de gobernanza disponibles.