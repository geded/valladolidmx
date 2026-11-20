# Corrección localizada de “Qué hacer”

## Diagnóstico confirmado

- **Ruta pública:** `/que-hacer`.
- **Familia:** listado territorial Premium `que-hacer`.
- **Cadena actual:** lectura pública CMS → `PublicListingDTO` → `ListingPremiumSurfaceFromDTO` → `TerritorialListingReviewSurface`.
- **Problema de tarjetas:** la ruta sí entra por la plantilla Premium vigente, pero la variante de “Qué hacer” termina usando una tarjeta interna propia (`ListingCard`) en vez de presentar el contenido con la familia compartida `TourismCard`. Por eso se siente más grande, recargada y distinta al patrón compacto aprobado.
- **Problema de imágenes:** el CMS sí entrega `image_url` para destinos con portada acreditada, pero `destinationToTourismCard()` la descarta y asigna siempre `mediaUrl: null`. No está buscando una foto antigua: la conexión actual pierde la foto antes de llegar a la tarjeta.

## Scope Gate

Cambio autorizado únicamente en la presentación de tarjetas de `/que-hacer` y en la conexión de sus portadas de destino.

Archivos previstos:
- `src/lib/experience-builder/adapters/tourism-listing-adapters.ts`
- `src/components/listing-premium/TerritorialListingReviewSurface.tsx`
- pruebas contractuales directamente relacionadas

No se modificarán Home, listados de categorías, fichas, header, footer, breadcrumb, mapa, Alux, Mi Viaje, datos del CMS, contratos de visibilidad ni publicación.

## Implementación

1. Conectar `Destination.image_url` acreditada a `TourismCardVM.mediaUrl` y conservar un texto alternativo editorial correcto.
2. Hacer que la variante `que-hacer` use la tarjeta turística compartida en presentación compacta, con fotografía protagonista, corazón sobre la foto y navegación completa al abrir la tarjeta.
3. Retirar de esa variante los botones de decisión prematura dentro de la tarjeta; la tarjeta servirá para entrar a la ficha, como ya se acordó.
4. Mantener “Recomendado” fuera de la fotografía cuando corresponda a visibilidad contratada; no inventar medios ni contenido.
5. Conservar el fallback editorial digno cuando un destino realmente no tenga una portada acreditada.

## Preservation Gate

Validar la plantilla completa en 1440, 834, 430 y 390 px:
- breadcrumb, encabezado, búsqueda y filtros;
- Alux y Mi Viaje;
- tarjetas, imágenes, navegación y mapa;
- header y footer;
- ausencia de cambios colaterales en otros listados Premium.

Ejecutar pruebas contractuales afectadas, suite relevante, typecheck, formato, `git diff --check`, inventario de rutas y controles de gobernanza disponibles. No publicar.
