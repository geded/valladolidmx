# G4-SYSTEM · De previews a runtime premium adoptado (plan incremental)

Base: HEAD `caeacf99`. Todo lo afirmado abajo fue verificado leyendo el repositorio en esta sesión.

## 1. Implementado vs faltante (verificado)

Implementado:
- Runtime premium compartido ya existe: `src/lib/omxds/presentation/premium-presentation.ts`, `premium-view-models.ts` y primitivas `src/components/premium/{PremiumHero,PremiumGallery,PremiumCard,PremiumSection,PremiumBadges,PremiumBreadcrumb,PremiumPresentationSelector,index}.tsx`.
- Preview integral del runtime: `src/routes/lovable/g4-system-runtime-preview.tsx` (419 líneas, 9 familias).
- Autorización `PCA-2026-031` aprobada, con `omxds_visual_v1_contracts_enabled=false` como flag requerido.
- Superficies públicas existentes: `DestinationSurface`, `BusinessSurface`, `EventSurface`, `ProductSurface`, `CategorySurface`, `RegionSurface`, `TourismListingSurface` + Surface Kit ViewModel-only.
- Listados públicos ya ruteados: `hoteles.tsx`, `restaurantes.tsx`, `experiencias.tsx`, `eventos.index.tsx`, `casas-de-vacaciones.tsx`, `que-hacer.tsx`, `empresas.tsx`.
- Micrositio territorial: `src/routes/oriente-maya/*` (índice, `$destino`, categoría, empresa, producto) con SSR y JSON-LD.
- Travel Plan canónico y Alux: `src/lib/traveler/travel-plans.functions.ts`, `alux-traveler.functions.ts`, `on-trip-concierge.ts`; CMS en `_authenticated/cms/travel-plans.tsx` y `cms/alux*`.
- Gates I1–I4, Governance Integrity, Product Authorization y sync en `package.json` + `scripts/governance/validate-full-suite.mjs`.

Faltante (verificado por ausencia):
- Los 6 previews G4 siguen con implementación local: 6.824 líneas en `g4-{home,destination-microsite,hotel,restaurant,experience,event}-*.tsx`, sin importar `src/components/premium/*`.
- Ninguna superficie de `src/components/surfaces/*.tsx` importa el runtime premium (`rg` sobre `PremiumHero|premium-presentation` no arroja coincidencias; sólo existe `premiumEligibility` en `BusinessSurface`).
- No existe ruta ni superficie de **rutas/itinerarios**: no hay `/rutas` en `src/routes` ni en `route-inventory.ts` (sólo `src/mocks/rutas.ts`).
- No hay selector Editorial/Cinematográfico expuesto por rol en CMS (el selector sólo vive en el preview interno).
- No hay reporte READY/BLOCKED de entidades ni script que lo genere.
- No hay QA responsive ni accesibilidad automatizada: `playwright`/`axe` no están en `package.json` (Playwright sí está en el sandbox).

## 2. Rutas mínimas

Sin rutas públicas nuevas salvo una:
- Nueva (opcional en P6): `src/routes/rutas.index.tsx` + `rutas.$slug.tsx` para itinerarios; obliga a alta en `src/lib/experience-builder/route-inventory.ts` y a un permiso explícito en el PCA.
- Modificadas: listados y fichas ya existentes (`hoteles`, `restaurantes`, `experiencias`, `eventos`, `casas-de-vacaciones`, `oriente-maya/*`) sólo a través de sus superficies, no de sus archivos de ruta cuando sea evitable.
- CMS: selector de presentación dentro de superficies ya existentes bajo `src/routes/_authenticated/cms/*`, jamás público.

## 3. Estrategia sin duplicación

1. Una sola familia por patrón en `src/components/premium/*`; evolución por `presentation` / `variant` / `capabilities` / `config`. Prohibido `-v2`, `-pro`, `-next`.
2. Cada preview G4 conserva sólo: constantes DEMO, su mapper `toPremiumVM()` y el panel de afinación; el resto se borra al adoptar primitivas. Meta medible: de 6.824 a <3.400 líneas.
3. Los mappers viven en `src/lib/omxds/presentation/vm/*.ts` y sólo leen contratos existentes de `src/lib/omxds/surfaces/*`; ninguna regla de negocio nueva.
4. Las superficies públicas consumen los mismos mappers, de modo que el dato es uno y las presentaciones dos.
5. Mapas: se preserva `ExperienceMapBlock` (`vmx.experience.map`) como único mapa; el gate G5 verifica que no aparezca ningún mapa alterno.
6. Travel Plan/Alux/Concierge: las primitivas sólo emiten acciones; la escritura pasa exclusivamente por el contrato Travel Plan (`addPlanItem`, `attachAluxSuggestion`, `promotePlanToCase` como única puerta al Concierge, con consentimiento explícito).

## 4. Paquetes (secuenciales, cada uno revertible por separado)

- **P1 — Mappers VM + gate.** `src/lib/omxds/presentation/vm/*` por familia y `validate:g5` (un solo eje de presentación, sin mapas alternos, sin URLs firmadas, sin primitivas duplicadas). Cero cambio visual.
- **P2 — Migración de los 6 previews G4** a primitivas, con capturas antes/después por preview.
- **P3 — Listados y fichas**: hoteles, restaurantes, experiencias, eventos y casas de vacaciones renderizan Tourism Card/listing sobre las primitivas, respetando `TourismListingSurface` y el Founder Discovery Standard.
- **P4 — Micrositios de destino** (`oriente-maya/$destino*`) sobre el runtime, con breadcrumb Inicio → Oriente Maya de Yucatán → Destino, sólo cuando `destination-premium-eligibility.server.ts` lo permita; ruta actual intacta en caso contrario.
- **P5 — Travel Plan / Alux / handoff**: acciones "Agregar al viaje" y "Hablar con Alux" en hero y cards; handoff a concierge humano sólo tras consentimiento explícito.
- **P6 — Rutas/itinerarios**: superficie de ruta con paradas, mapa preservado y alta en route inventory (única ruta pública nueva).
- **P7 — CMS por rol**: selector Editorial/Cinematográfico en CMS, visible para admin/super_admin/editor según rol, fail-closed a `editorial`.
- **P8 — QA responsive + accesibilidad automatizada** con evidencias.
- **P9 — Reporte READY/BLOCKED read-only** + cierre documental y `governance:sync`.

## 5. Pruebas

- Técnicas: `bun run lint`, `bun run typecheck`, `bun run build`, `bun run scripts/route-inventory-coverage.ts`.
- Gates: `validate:i1`, `i2a/b/c`, `i3:0/a/b/c/d`, `i4:0/a/b/c/…`, `governance:sync --check`, dependency map, knowledge graph, Governance Integrity y Product Authorization (+ `governance:product-test`), todo vía `bun scripts/governance/validate-full-suite.mjs`.
- Contractual G5: `scripts/omxds/g5/premium-presentation.contract.test.ts` + `.evidence.mjs`, `validate:g5`.
- Responsive: 390/768/1024/1280/1440 en previews G4, listados, fichas y micrositio; assert `scrollWidth <= clientWidth` y ausencia de huecos > 1 viewport.
- Accesibilidad: axe-core en Playwright (sandbox, no dependencia de build); cero violaciones críticas o serias; contraste de scrims con `scripts/omxds/i1/contrast.mjs`.
- Funcionales: Alux → Travel Plan → handoff consentido; breadcrumb territorial; mapa único presente; selector nunca visible en público.

## 6. Reporte de preparación (read-only)

`scripts/omxds/g5/entity-readiness.mjs` ejecuta sólo `SELECT`, reutiliza los criterios de `destination-premium-eligibility.server.ts` y `business-premium-eligibility.server.ts`, y escribe `docs/evidence/omxds-visual/g5/ENTITY-READINESS.{md,csv}` con familia, id, slug, `is_demo_seed`, `status`, presentación resuelta y READY/BLOCKED con razones. Los demos siempre BLOCKED por origen demo. Ninguna escritura, ningún `UPDATE`, ninguna migración.

## 7. Riesgos y bloqueos reales

- **I3-D** ya registra divergencia por propagación de `premiumEligibility` en `BusinessSurface.tsx`; P3/P4 deben reconciliar evidencia en el mismo paquete o quedarán fail-closed.
- **Route inventory** es fail-closed: P6 no puede cerrarse sin metadatos completos de la ruta nueva.
- **PCA-2026-031** no incluye permisos para superficies públicas ni CMS: P3–P7 requieren un PCA nuevo (`PCA-2026-032`) con rutas exactas, sin globs.
- **Regresión visual** al unificar hero/galería: mitigada con capturas obligatorias antes/después.
- **Playwright/axe** fuera de `package.json`: el QA corre como verificación local, nunca como dependencia de build.
- Riesgo de segunda fuente de verdad si un mapper replica lógica de contrato: prohibido; los mappers sólo leen `src/lib/omxds/surfaces/*`.

## Invariantes

`omxds_visual_v1_contracts_enabled` permanece **false**. Sin datos, sin migraciones, sin cambios de `status` ni `is_demo_seed`, sin producción, sin merge, sin deploy. Sólo medios gobernados por el proxy estable. Distintivo Pueblo Mágico únicamente textual mientras no exista asset acreditado.
