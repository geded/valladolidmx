# G8-R1-F1L · Reconciliación READ-ONLY de Autoridades Visuales → Rutas Canónicas

Fecha: 2026-08-30 · Modo: READ-ONLY (cero cambios, cero publicación, flag `omxds_visual_v1_contracts_enabled` = OFF, piloto en `noindex,nofollow`).

Regla vinculante aplicada al diagnóstico: **la ausencia de fotografía sólo bloquea Cinematográfica**; nunca puede expulsar a una entidad elegible de su familia premium Editorial, que debe renderizar el marcador neutral piedra/caliza.

## 1 · Estado de datos verificado (lectura directa)

| Composición | Revisión activa | Bloques de nivel raíz | Lectura |
|---|---|---|---|
| `home` (published) | 30 | `vmx.hero`, `vmx.section.*` (9 legacy) | **La Home pública NO contiene `vmx.home.premium-g4`** |
| `home` (rechazada) | 31 | `vmx.hero`, `vmx.alux.planner`, `vmx.discovery.navigator`, `vmx.experience.map`, `vmx.smart.*` | Reconstrucción por bloques sueltos, **tampoco es la autoridad G4** |
| `__tpl_destination__` (published) | 3 | `vmx.surface.destination` | Plantilla de destino apunta a la superficie legacy, **no a `vmx.destination.premium-g4`** |
| `landing`: `hoteles`, `restaurantes`, `experiencias`, `oriente-maya` | — | draft, sin revisión activa | Sin composición publicada |

Conclusión de datos: **ninguna composición publicada referencia hoy un preset premium del registro**. Los presets G4 de Home y Destino existen en el registro pero están huérfanos en producción.

## 2 · Matriz de reconciliación

Columnas: (1) autoridad visual aprobada · (2) fixtures no promovibles · (3) preset + adaptador · (4) ruta pública objetivo · (5) qué consume hoy · (6) condición de fallback · (7) el fallback conserva Editorial · (8) estado.

### Home G4
1. `src/routes/lovable/g4-home-premium-preview.tsx` → `src/components/home-premium/HomePremiumSurface.tsx`
2. Todo `home-premium-content.ts` (contenido demo del preview)
3. `premium-template-registry.ts:76-90` · `premium-g4-approved` · `vmx.home.premium-g4` · `homePremiumG4DefaultConfig()`
4. `/` (`src/routes/index.tsx`)
5. `CompositionRenderer` sobre rev.30 (bloques legacy); sin composición → `LegacyHome`
6. `published?.snapshot` ausente o sin bloque premium (`index.tsx:87,95`)
7. **NO** — regresa a superficie legacy completa
8. **PARCIAL** (preset existe, ruta existe, la composición publicada no lo usa)

### Destino / micrositio G4
1. `src/routes/lovable/g4-destination-microsite-preview.tsx` → `src/components/destination-premium/DestinationPremiumSurface.tsx`
2. `destination-premium-content.ts` (demo)
3. `premium-template-registry.ts:91-106` · `destino-premium-g4-approved` · `vmx.destination.premium-g4`; adaptador real ya existe: `destination-premium-runtime.ts`
4. `/oriente-maya/$destino`
5. Plantilla `__tpl_destination__` rev.3 = `vmx.surface.destination` (legacy); los 7 destinos del piloto sí fuerzan `DestinationPremiumSurface` vía `DestinationSurface.tsx` (remediación F1K)
6. Fuera del allowlist F1K: plantilla legacy publicada
7. **Sí dentro del piloto** (Editorial + marcador neutral) · **NO fuera del piloto**
8. **PARCIAL** (7 destinos CONECTADA por allowlist; el resto legacy por composición)

### Seis listados G5 (hoteles, restaurantes, experiencias, eventos, casas-de-vacaciones, que-hacer)
1. `src/routes/lovable/g5-listing-readiness-preview.tsx` → `ListingPremiumSurface.tsx`
2. `listing-premium-content.ts` (demo)
3. `premium-template-registry.ts:126-149` (6 presets) · `vmx.listing.premium-g5` · `ListingPremiumSurfaceFromDTO` + `getPublicListing`
4. `/hoteles`, `/restaurantes`, `/experiencias`, `/eventos`, `/casas-de-vacaciones`, `/que-hacer`
5. Exactamente `ListingPremiumSurfaceFromDTO` con datos reales
6. Ninguna
7. N/A
8. **CONECTADA** (única familia plenamente productiva)

### Hotel
1. `src/routes/lovable/g4-hotel-premium-preview.tsx` (JSX standalone, no exporta componente reutilizable)
2. Todo el cuerpo del preview es demo declarado
3. `entity-premium-templates.ts:98-135` · `premium-entity-hotel` · `adaptHotelSurfaceContract`
4. `/oriente-maya/{destino}/{categoria}/{empresa}`
5. `BusinessSurface` con `PremiumHero` genérico; **no lee `family`/`presetId` del binding**
6. `premiumEligibility.eligible !== true` o `canonicalBinding.surface !== "premium"` (`canonical-entity-binding.ts:99`)
7. **NO** — premium genérico, distinto de la autoridad aprobada
8. **PARCIAL** (resolutor correcto, render desconectado)

### Restaurante
Idéntico a Hotel. Autoridad: `g4-restaurant-premium-preview.tsx`; preset `entity-premium-templates.ts:137-178`. Estado **PARCIAL**.

### Evento
1. `src/routes/lovable/g4-event-premium-preview.tsx`
2. Demo declarado
3. `entity-premium-templates.ts:242-276` · `createEventSurfaceContract`
4. `/eventos/$slug`
5. `bindEventRoute` real → `EventSurfaceContractBoundary` → `EventSurface`
6. Elegibilidad/medios en el boundary
7. Degrada a superficie estándar (no marcada como Editorial)
8. **PARCIAL**

### Experiencia y Tour
1. `g4-experience-premium-preview.tsx` · `g8p2-tour-premium-preview.tsx`
2. Demo
3. `entity-premium-templates.ts:278-322` y `:324-375` · `adaptExperienceSurfaceContract` / `adaptTourSurfaceContract`
4. `/producto/$slug`
5. `bindProductRoute` → `ProductSurfaceContractBoundary` → `ProductSurface`
6. Sin elegibilidad → superficie estándar
7. Degrada a estándar
8. **PARCIAL**

### Producto genérico
Sin autoridad visual propia; `canonical-entity-resolver.ts:158-165` resuelve `product_generic` → superficie estándar por diseño fail-closed. Estado **SIN MODELO PRODUCTIVO (por diseño)**.

### Casa de vacaciones
1. `g8p2-vacation-rental-premium-preview.tsx`
2. Fixture neutral
3. `entity-premium-templates.ts:180-241`, `autoAssign:false`, `status: pendiente_aceptacion_founder`
4. `/oriente-maya/{destino}/{categoria}/{empresa}`
5. `BusinessSurface` estándar
6. `autoAssign === false` (bloqueo permanente hasta aprobación Founder)
7. **NO**
8. **AISLADA EN PREVIEW**

### Empresa genérica
Autoridad `g8-r1f1c-business-generic-preview.tsx` (fixture). Sin preset propio (`g8-r1f1c-preview-hub.tsx:64`). Ruta compartida con hotel/restaurante; consume `BusinessSurface` estándar. **SIN MODELO PRODUCTIVO**.

### Lugar · seis variantes
1. `src/routes/lovable/g8-place-premium-visual-approval.tsx` → `PlacePremiumSurface.tsx`
2. `place-premium-content.ts` (demo)
3. `premium-template-registry.ts:107-125` (6 presets) + `canonical-entity-resolver.ts:83-120`
4. `/oriente-maya/$destino/lugares/$slug`
5. `bindPlaceRoute` + `PlacePremiumSurface` directo — cadena correcta
6. Cero lugares publicados ⇒ 404 permanente
7. Sí (Editorial por variante cuando hay dato)
8. **CONECTADA EN CÓDIGO · SIN DATOS PRODUCTIVOS**

### Landing SEO
Autoridad de paridad `g8-r1cl-seo-landing-parity.tsx`; sin preset propio. Rutas `/l/$slug`, `/p/$slug` con `CompositionRenderer`. Fallback = `notFound()`. **CONECTADA (motor genérico)**.

### Zona · Ruta/itinerario · Artículo/guía
Autoridades sólo como fixtures: `g8-r1f1c-zone-preview.tsx`, `g8-r1f1c-route-preview.tsx`, `g8-r1f1c-article-preview.tsx`. Sin preset, sin CMS, sin ruta pública. **SIN MODELO PRODUCTIVO** (declarado por el propio hub, líneas 82-141).

## 3 · Resumen por estado

- CONECTADA: seis listados G5; landing SEO (motor genérico).
- CONECTADA SIN DATOS: lugar (6 variantes).
- PARCIAL: Home G4, Destino G4 (7/N destinos), hotel, restaurante, evento, experiencia, tour.
- AISLADA EN PREVIEW: casa de vacaciones.
- SIN MODELO PRODUCTIVO: empresa genérica, producto genérico, zona, ruta, artículo.

## 4 · Violaciones de la regla vinculante

- **V1 · Hotel/Restaurante**: la falta de medios acreditados hace fallar la elegibilidad y expulsa la ficha de su familia premium hacia superficie estándar, en lugar de conservar Editorial con marcador neutral. (`business-premium-eligibility.server.ts` + `BusinessSurface.tsx`)
- **V2 · Evento/Experiencia/Tour**: mismo patrón en los boundaries de contrato.
- **V3 · Destino fuera del allowlist F1K**: la plantilla publicada `vmx.surface.destination` impone legacy con independencia de la elegibilidad.
- **V4 · Home**: rev.30 legacy y rev.31 reconstruida con bloques sueltos; en ningún caso se usa la autoridad `vmx.home.premium-g4`.

No hay violación en listados G5 ni en lugar.

## 5 · Plan único de promoción (sin renderers paralelos)

Principio: **cero diseños nuevos, cero hubs nuevos, cero superficies nuevas**. Sólo se promueven las autoridades existentes y se corrige la condición de fallback.

- **P0 · Desacoplar medios de familia (transversal).** Un único punto: la elegibilidad deja de decidir *familia* y pasa a decidir sólo *modo* (`cinematic` vs `editorial`). La familia premium se conserva siempre que la entidad sea públicamente elegible. Toca exclusivamente `premium-eligibility.ts`, `entity-presentation.ts` y los tres boundaries (business/event/product), sin crear componentes.
- **P1 · Home.** Nueva revisión borrador de `home` cuyo `root.children` sea exactamente `[{ type: "vmx.home.premium-g4", config: homePremiumG4DefaultConfig() }]`, con medios no acreditados neutralizados por la política F1K. Preview por token → aprobación Founder → publicación. Se descarta definitivamente el enfoque de rev.31 por bloques sueltos.
- **P2 · Destino.** Nueva revisión de `__tpl_destination__` con `vmx.destination.premium-g4` y el adaptador real ya existente (`destination-premium-runtime.ts`), de modo que los 7 destinos del piloto dejen de depender del allowlist y el resto herede la familia premium.
- **P3 · Hotel/Restaurante.** Extraer el layout aprobado de los previews standalone a un único componente reutilizable por familia y hacer que `BusinessSurface` consuma `family`/`presetId` del binding canónico. No se crea diseño: se mueve el aprobado.
- **P4 · Evento/Experiencia/Tour.** Igual criterio sobre `EventSurface`/`ProductSurface`: consumir el preset del binding y aplicar P0.
- **P5 · Lugar.** Publicar contenido acreditado; cero cambios de código.
- **P6 · Casa de vacaciones.** Requiere aprobación visual Founder para levantar `autoAssign:false`. Bloqueado por decisión, no por técnica.
- **P7 · Empresa genérica, producto genérico, zona, ruta, artículo.** Requieren autorización Founder de modelo y CMS antes de cualquier preset. Fuera de alcance hasta entonces.

Orden propuesto: P0 → P1 → P2 → P3 → P4, cada uno con Preview por token, evidencia 390/768/1440 y aprobación Founder antes del siguiente.

## 6 · Invariantes al cierre de esta auditoría

Flag global OFF · piloto `noindex,nofollow` · rev.30 intacta · rev.31 intacta y rechazada · cero publicaciones · cero archivos modificados.
