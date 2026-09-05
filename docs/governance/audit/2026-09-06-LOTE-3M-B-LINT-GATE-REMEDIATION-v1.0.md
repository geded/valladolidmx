# LOTE 3M-B · Remediación mecánica del Lint Gate

**Fecha:** 2026-09-06 (UTC) · **Rama:** `integration/lovable-valladolidmx` · **Estado:** PARCIAL — alcance autorizado CERRADO, gate completo AÚN EN ROJO por deuda fuera de alcance.

## 1. Preflight

| Dato                     | Valor                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| HEAD antes del lote      | `6eaacc4777b826076c98d263c4c83fa8ea22e847`                                                                    |
| Rama efectiva de edición | `edit/edt-d7dc33cc-a523-4823-b32e-7f31c1f2f0f0` (la plataforma integra en `integration/lovable-valladolidmx`) |
| Árbol antes              | limpio (`git status --short` vacío)                                                                           |
| `bun run lint` antes     | FAIL · 540 errores / 75 avisos visibles · 60 buckets NEW_DEBT + 1 `I3_NOT_CLEAN`                              |

El gate (`scripts/lint/lint-baseline.mjs`) compara contra `scripts/lint/lint-baseline.json` (commit base `7084b2a7`) y falla ante cualquier bucket nuevo, esté o no dentro del alcance autorizado.

### 1.1 Archivos del alcance autorizado (exactos, según el gate)

| Archivo                                                       | Reglas fallidas antes                   | Errores |
| ------------------------------------------------------------- | --------------------------------------- | ------- |
| `src/routes/lovable/g4-event-listing-premium-preview.tsx`     | prettier/prettier                       | 1       |
| `src/routes/lovable/g4-event-profile-premium-preview.tsx`     | prettier/prettier                       | 32      |
| `src/routes/lovable/g4-place-premium-preview.tsx`             | prettier/prettier                       | 2       |
| `src/routes/lovable/g8p2-vacation-rental-premium-preview.tsx` | prettier/prettier                       | 31      |
| `src/routes/restaurantes.tsx`                                 | prettier/prettier                       | 1       |
| `src/routes/rutas.$slug.tsx`                                  | prettier/prettier                       | 2       |
| `src/routes/rutas.index.tsx`                                  | prettier/prettier                       | 1       |
| `src/routes/oriente-maya/$destino.index.tsx`                  | prettier/prettier (`I3_NOT_CLEAN` 89:9) | 6       |
| **Total**                                                     | 100 % `prettier/prettier`               | **76**  |

Ningún otro archivo bajo esos directorios fue tocado. Cero reglas semánticas (`no-explicit-any`, `react-refresh`, `<parser>`) dentro del alcance.

## 2. Corrección aplicada

- Autofix canónico del proyecto, limitado a la lista exacta: `./node_modules/.bin/eslint <8 archivos> --fix` (prettier vía `prettier/prettier`).
- Resultado: **76 → 0** problemas en los 8 archivos.
- Sin cambios de lógica, JSX semántico, textos, clases visuales, rutas, imports, orden de ejecución, consultas ni tipos.
- Reglas NO CORREGIDAS por requerir decisión semántica: **ninguna** dentro del alcance.

## 3. Verificación de equivalencia

| Evidencia                                                                                                                 | Resultado                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `git diff -w --ignore-blank-lines` sobre los 8 archivos                                                                   | **vacío** → todos los hunks son puramente de espaciado/saltos; cero tokens añadidos o eliminados                          |
| Diff bruto                                                                                                                | 385 inserciones / 85 eliminaciones, todas re-envolturas de línea                                                          |
| Comparativa DOM antes/después (restauración temporal de los archivos originales, render real y re-aplicación del formato) | **8/8 rutas IGUAL** en `status`, texto renderizado normalizado, lista completa de `href`, número de `h1` y desbordamiento |

Rutas comparadas: `/lovable/g4-event-listing-premium-preview`, `/lovable/g4-event-profile-premium-preview`, `/lovable/g4-place-premium-preview`, `/lovable/g8p2-vacation-rental-premium-preview`, `/restaurantes`, `/rutas`, `/rutas/valladolid-ek-balam`, `/oriente-maya/valladolid`.

No se actualizó ningún snapshot para ocultar diferencias; la comparación se hizo contra el render real de la versión previa.

### 3.1 Smoke responsive (1440 / 834 / 430 / 390)

7 rutas × 4 anchos = 28 cargas: **status 200**, destino final = URL solicitada (sin redirecciones), **1 `h1`**, **desbordamiento horizontal 0**, **0 errores de consola** en los cuatro anchos.

## 4. Matriz de puertas

| Puerta                                   | Resultado                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Lint del alcance autorizado (8 archivos) | **PASS** (0 problemas)                                                                    |
| `bun run lint` completo                  | **FAIL** — 51 buckets NEW_DEBT ajenos al alcance (ver §5)                                 |
| Typecheck (`tsc --noEmit`)               | **PASS**                                                                                  |
| Suite completa (`bun test`)              | **PASS** — 896/896, 5 717 aserciones, 78 archivos                                         |
| Build (`vite build`)                     | **PASS**                                                                                  |
| Route Inventory                          | **PASS** — 247 rutas                                                                      |
| Smoke responsive 1440/834/430/390        | **PASS**                                                                                  |
| Escaneo de secretos en archivos tocados  | **PASS** — sin coincidencias                                                              |
| Datos sin cambios                        | **PASS** — cero migraciones, cero SQL, cero escrituras; el lote es sólo formato de código |
| Producción / cron / dominio publicado    | **NO TOCADO**                                                                             |

## 5. Deuda restante FUERA del alcance autorizado (detención sin ampliación)

El gate sigue en rojo por 51 buckets en 49 archivos que **no** pertenecen a los cuatro patrones autorizados. Conforme a la instrucción, se reportan y el lote se detiene sin ampliar el alcance. La deuda bajó de 540 a **464 errores** (75 avisos).

| Archivo                                                                                              | Delta      | Regla                                |
| ---------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------ |
| `scripts/maps/map-fallback.contract.test.tsx`                                                        | +2 error   | prettier/prettier                    |
| `scripts/omxds/g5/premium-presentation.contract.test.ts`                                             | +1 error   | prettier/prettier                    |
| `scripts/omxds/l3b-a/home-cms-materialization.contract.test.ts`                                      | +1 error   | prettier/prettier                    |
| `src/components/alux/TourismAluxPanel.tsx`                                                           | +1 warning | react-refresh/only-export-components |
| `src/components/cms/BusinessAttributesPanel.tsx`                                                     | +1 error   | prettier/prettier                    |
| `src/components/cms/places/PlaceEditor.tsx`                                                          | +2 error   | prettier/prettier                    |
| `src/components/cms/places/PlaceMediaPanel.tsx`                                                      | +2 error   | prettier/prettier                    |
| `src/components/destination-premium/destinations-atlas-content.ts`                                   | +1 error   | prettier/prettier                    |
| `src/components/destination-premium/DestinationsAtlasSurface.tsx`                                    | +28 error  | prettier/prettier                    |
| `src/components/experience-premium/ExperienceFiltersBar.tsx`                                         | +1 error   | prettier/prettier                    |
| `src/components/experience-premium/ExperiencePremiumSurface.tsx`                                     | +4 error   | prettier/prettier                    |
| `src/components/experience-premium/ExperiencesListingSurface.tsx`                                    | +4 error   | prettier/prettier                    |
| `src/components/home-premium/shared/PremiumShowcase.tsx`                                             | +2 error   | prettier/prettier                    |
| `src/components/layout/BreadcrumbTerritorial.tsx`                                                    | +4 error   | prettier/prettier                    |
| `src/components/layout/CompactCrumbs.tsx`                                                            | +2 warning | react-refresh/only-export-components |
| `src/components/listing-premium/PremiumDiscoveryListingSurface.tsx`                                  | +3 error   | prettier/prettier                    |
| `src/components/listing-premium/TerritorialListingReviewSurface.tsx`                                 | +54 error  | prettier/prettier                    |
| `src/components/maps/InteractiveMap.tsx`                                                             | +3 error   | prettier/prettier                    |
| `src/components/omxds/CategoryNavGrid.tsx`                                                           | +2 error   | prettier/prettier                    |
| `src/components/omxds/TourismChip.tsx`                                                               | +1 error   | prettier/prettier                    |
| `src/components/premium/PremiumHero.tsx`                                                             | +3 error   | prettier/prettier                    |
| `src/components/routes-premium/RoutePremiumSurface.tsx`                                              | +1 error   | prettier/prettier                    |
| `src/components/routes-premium/RoutesListingSurface.tsx`                                             | +3 error   | prettier/prettier                    |
| `src/components/surfaces/EventPremiumSurface.tsx`                                                    | +1 error   | prettier/prettier                    |
| `src/components/travel-plan/TravelPlanBand.tsx`                                                      | +1 error   | prettier/prettier                    |
| `src/lib/brand/brand-context.tsx`                                                                    | +3 warning | react-refresh/only-export-components |
| `src/lib/brand/brand-settings.functions.ts`                                                          | +1 error   | prettier/prettier                    |
| `src/lib/business-attributes/types.ts`                                                               | +1 error   | prettier/prettier                    |
| `src/lib/cms/editor-fields.ts`                                                                       | +1 error   | prettier/prettier                    |
| `src/lib/cms/editorial-route-stops.functions.ts`                                                     | +1 error   | prettier/prettier                    |
| `src/lib/destinations/atlas-taxonomy.ts`                                                             | +1 error   | prettier/prettier                    |
| `src/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry.ts` | +2 error   | prettier/prettier                    |
| `src/lib/experience-builder/home-materialization.ts`                                                 | +4 error   | prettier/prettier                    |
| `src/lib/experience-builder/route-inventory.ts`                                                      | +1 error   | prettier/prettier                    |
| `src/lib/experience-builder/smart-blocks.server.ts`                                                  | +1 error   | prettier/prettier                    |
| `src/lib/institutional/institutional-authority.functions.ts`                                         | +1 error   | prettier/prettier                    |
| `src/lib/listings/listing-family-taxonomy.functions.ts`                                              | +2 error   | prettier/prettier                    |
| `src/lib/listings/listing-public-reads.functions.ts`                                                 | +2 error   | prettier/prettier                    |
| `src/lib/places/place-public-contract.ts`                                                            | +7 error   | prettier/prettier                    |
| `src/lib/places/place-public-reads.server.ts`                                                        | +6 error   | prettier/prettier                    |
| `src/lib/places/place-review-fixtures.ts`                                                            | +1 error   | prettier/prettier                    |
| `src/lib/places/places-cms.functions.ts`                                                             | +2 error   | prettier/prettier                    |
| `src/lib/routes-editorial/route-public-reads.functions.ts`                                           | +2 error   | prettier/prettier                    |
| `src/lib/routes-editorial/route-public-reads.server.ts`                                              | +1 error   | @typescript-eslint/no-explicit-any   |
| `src/lib/routes-editorial/route-public-reads.server.ts`                                              | +1 warning | <parser>                             |
| `src/lib/routes-editorial/route-public-reads.server.ts`                                              | +3 error   | prettier/prettier                    |
| `src/routes/__root.tsx`                                                                              | +6 error   | prettier/prettier                    |
| `src/routes/_authenticated/cms/marca.tsx`                                                            | +1 error   | prettier/prettier                    |
| `src/routes/hoteles.tsx`                                                                             | +2 error   | prettier/prettier                    |
| `src/routes/lugares.index.tsx`                                                                       | +1 error   | prettier/prettier                    |
| `src/routes/oriente-maya/destinos.tsx`                                                               | +1 error   | prettier/prettier                    |

Observación: 47 de los 51 buckets son `prettier/prettier` (mecánicos, autocorregibles con el mismo procedimiento). Los 4 restantes exigen decisión semántica: `@typescript-eslint/no-explicit-any` y `<parser>` en `src/lib/routes-editorial/route-public-reads.server.ts`, y `react-refresh/only-export-components` en `TourismAluxPanel.tsx`, `CompactCrumbs.tsx` y `brand-context.tsx`.

**Se requiere autorización explícita del Founder** para extender el alcance a esos archivos (lote 3M-B.2). Sin ella, `bun run lint` no puede quedar en verde.

## 6. Rama y commit

- Commit del lote: `51a34101a173fa7bce1fd6f74c3b5e67c175b8a0` (8 archivos, sólo formato).
- Árbol de trabajo: **limpio**.
- Base previa: `6eaacc4777b826076c98d263c4c83fa8ea22e847`.
- Sin ramas manuales, PR, merge, despliegue ni `main`.

## 7. Cierre

**NO SE DECLARA CIERRE DEL LOTE**: el gate completo continúa en FAIL por deuda ajena al alcance autorizado. El alcance encomendado queda 100 % corregido y verificado como equivalente.
