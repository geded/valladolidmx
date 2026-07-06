# V4 · Founder Discovery Map Principle

Objetivo: convertir `vmx.experience.map` en la única familia oficial de mapas y activar el Sistema de Descubrimiento Territorial (mapa + Tourism Card + Context Engine + Navigation Contract + Alux).

Alcance grande → ejecución en 4 fases secuenciales, cada una con Completion Report + validación visual antes de continuar. Reutilizo la infraestructura ya existente (`InteractiveMap`, `StaticMap`, `DistanceBadge`, `useVisitorGeolocation`, `maps.functions.ts`, `BusinessLocationBlock`); no se crean motores paralelos.

---

## Fase V4.1 — Bloque oficial `vmx.experience.map` + adaptadores

- `src/lib/experience-builder/blocks/experience-map/contract.ts` — DTO Zod:
  - `variant`: `single | multi | list-sync | cluster`
  - `center`, `zoom`, `points[]` (id, lat, lng, kind, title, href, badge, price, thumb)
  - `capabilities`: `showDistance`, `showDirections`, `clustering`, `syncList`, `staticFallback`
  - `contract_version: "1.0.0"`, `extensions[]`, `permissions`.
- `src/components/experience-builder/blocks/experience-map/ExperienceMapBlock.tsx` — orquesta `StaticMap` (SSR/fallback) e `InteractiveMap` (progressive enhancement); toggle "Ver interactivo".
- Registro en `block-library.ts` + smoke.
- Adaptadores en `src/lib/experience-builder/adapters/`:
  - `entityToMapPoint.ts`: `businessToMapPoint`, `productToMapPoint`, `destinationToMapPoint`.

## Fase V4.2 — Ficha Empresa · Ficha Producto · Micrositio Destino

- Ficha Empresa: reemplazar `BusinessLocationBlock` inline por el bloque oficial (variant `single`, `showDistance`, `showDirections`). Sección "Qué hay cerca" (variant `multi`) alimentada por `business-related` en radio ≤ 2km.
- Ficha Producto: bloque `single` con dirección heredada de la empresa + DistanceBadge + CTA "Cómo llegar".
- Micrositio Destino: bloque `multi` con clusters por categoría del destino (usa items ya cargados por `destination-to-blocks`).

## Fase V4.3 — Vista Lista + Mapa sincronizada en `TourismListingSurface`

- Habilitar `mapSlot` del V3: `<ExperienceMapBlock variant="list-sync">` sincronizado con grid + facets.
- Clustering (Supercluster JS puro, sin native deps) por zona/destino.
- Toggle Lista | Mapa | Split — Split sólo en desktop; Mobile = tabs.
- Activar por defecto en `/hoteles` y `/restaurantes`; opt-in en el resto vía prop.

## Fase V4.4 — Alux territorial + validación final

- Nueva capability `distance` en `contextual-suggest.functions.ts`: si visitante tiene geo, Alux prepende "a X km · Y min caminando/en auto" en sugerencias.
- `AluxSuggestionCard` muestra pill con distancia (reusa `formatDistance`).
- Preview interno `src/routes/lovable/experience-map-preview.tsx` con las 4 variantes.
- Completion Report V4 + Completion Report U-VISUAL v1 consolidado (V1+V2+V3+V4).
- Validación visual (mobile + desktop) de las 9 superficies exigidas por el Founder.

---

## Fuera de alcance V4 (queda registrado como Founder Territorial Platform Principle → evolución futura)

Rutas sugeridas, itinerarios de Arma tu Viaje, recorridos optimizados por Alux, capas temáticas (cenotes, gastronomía, arqueología…), zonas de interés, disponibilidad contextual, información territorial enriquecida. Toda evolución futura sobre `vmx.experience.map`.

---

## Ejecución

Propongo empezar **ahora con Fase V4.1** (bloque + adaptadores + preview) y detenerme para validación antes de V4.2. ¿Autorizas arrancar V4.1?
