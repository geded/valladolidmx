# Programa G5 · Sistema Premium Unificado (Editorial | Cinematográfica)

Base leída: HEAD `caeacf99`. Todo lo afirmado abajo fue verificado en el repositorio.

## 1. Inventario real (verificado)

Ya implementado:
- Previews G4 internos, no indexables: `src/routes/lovable/g4-home-premium-preview.tsx` (1518 líneas), `g4-destination-microsite-preview.tsx` (1001), `g4-hotel-premium-preview.tsx` (1176), `g4-restaurant-premium-preview.tsx` (921), `g4-experience-premium-preview.tsx` (1077), `g4-event-premium-preview.tsx` (1131). Total ~6.8k líneas con datos DEMO en constantes locales y panel de afinación con `useState`.
- Medios gobernados servidos por el proxy estable `/api/public/studio-media/governed/v1p1c/*`; sin URLs firmadas.
- Mapa único oficial: `ExperienceMapBlock` (`vmx.experience.map`), usado por los previews.
- Superficies públicas: `src/components/surfaces/{DestinationSurface,BusinessSurface,EventSurface,ProductSurface,CategorySurface,RegionSurface,TourismListingSurface}.tsx` + Surface Kit ViewModel-only en `src/components/surfaces/kit/*`.
- Contratos OMXDS en `src/lib/omxds/surfaces/*` (surface-contract, business/event/product contracts, adapters hotel/restaurant/experience) y elegibilidad premium por entidad: `business-premium-eligibility.server.ts`, `destination-premium-eligibility.server.ts`.
- Rutas públicas territoriales: `src/routes/oriente-maya/*` (índice, `$destino`, categoría, empresa, producto), ya con SSR, JSON-LD, contexto y fallback de composición EB.
- Gates de gobernanza I1–I4 y validadores en `scripts/omxds/*` y `scripts/governance/*`, orquestados por `scripts/governance/validate-full-suite.mjs`; cobertura de rutas por `scripts/route-inventory-coverage.ts`.

Faltante (no existe hoy en el repositorio):
- No existe un eje de presentación compartido: la única coincidencia de "cinemat*" está dentro de los previews y de `experience-hero`; no hay tipo, registro ni contrato `presentation: editorial | cinematic`.
- No existen primitivas premium compartidas: cada preview reimplementa hero, galería, secciones y CTAs localmente.
- Las superficies públicas no consumen las composiciones premium aprobadas ni el nombre territorial de forma unificada.
- No hay reporte de preparación de entidades (READY/BLOCKED) ni script que lo genere.
- No hay QA responsive/accesibilidad automatizado en scripts (no hay Playwright ni axe en `package.json`).

## 2. Mínimo conjunto a crear/modificar

Nuevo (primitivas compartidas, sin lógica de negocio nueva):
- `src/lib/omxds/presentation/presentation.ts` — tipo `PremiumPresentation = "editorial" | "cinematic"`, default y resolución por rol (selector nunca público).
- `src/components/premium/PremiumHero.tsx`, `PremiumGallery.tsx`, `PremiumSection.tsx`, `PremiumFactsBar.tsx`, `PremiumCtaRail.tsx`, `PremiumBreadcrumb.tsx`, `index.ts` — todos ViewModel-only, alineados al contrato del Surface Kit.
- `src/lib/omxds/presentation/vm/*.ts` — mappers `toPremiumVM()` por familia (destino, hotel, restaurante, experiencia, evento, casa de vacaciones, ruta), consumiendo los contratos existentes de `src/lib/omxds/surfaces/*`.
- `scripts/omxds/g5/entity-readiness.mjs` + `scripts/omxds/g5/premium-presentation.contract.test.ts` (+ `.evidence.mjs`) y scripts `test:g5` / `validate:g5` en `package.json`.
- `scripts/qa/responsive-a11y.mjs` — QA con Playwright ya disponible en sandbox, contra 390/768/1024/1280/1440.

Modificado (mínimo):
- Los 6 previews `g4-*`: sustituyen su implementación local por las primitivas, conservando sus datos DEMO y su panel interno.
- `src/components/surfaces/DestinationSurface.tsx`, `BusinessSurface.tsx`, `EventSurface.tsx`, `ProductSurface.tsx`: renderizan primitivas premium sólo cuando la elegibilidad por entidad ya existente lo permite; ruta actual intacta si no.
- `src/lib/experience-builder/route-inventory.ts` para cualquier ruta nueva.
- CMS: exponer el selector de presentación sólo en superficie autenticada existente bajo `src/routes/_authenticated/cms`, por rol.

## 3. Cómo promover previews a primitivas sin copiar bloques

Extracción por identidad visual, no por copia:
1. Diff estructural de los 6 previews para identificar los patrones repetidos (hero, mosaico/carrusel/cuadrícula/tira, fajas de datos, secciones editoriales, riel de CTAs, breadcrumb territorial).
2. Cada patrón se implementa una sola vez en `src/components/premium/*` con `presentation` como prop y variantes por `variant`/`capabilities` (prohibido `-v2`, `-pro`).
3. Cada preview conserva únicamente: constantes DEMO, mapper `toPremiumVM()` y el panel de afinación. Objetivo medible: reducir el total de ~6.8k líneas a menos de la mitad, con cero regresión visual verificada por capturas antes/después.
4. Las superficies públicas usan los mismos mappers, garantizando un solo modelo de datos y dos presentaciones.

## 4. Pruebas

- Técnicas: `bun run typecheck`, `bun run lint`, `bun run build`, `bun run scripts/route-inventory-coverage.ts`.
- Gates: `validate:i1`, `i2a/b/c`, `i3:0/a/b/c/d`, `i4:0/a/b/c/r/d`, `governance:sync --check`, dependency map, knowledge graph, Governance Integrity, Product Authorization (+ sus tests) — todo vía `bun scripts/governance/validate-full-suite.mjs`.
- Nuevo gate `validate:g5`: un solo eje de presentación, ausencia de mapas alternos, ausencia de URLs firmadas, cero duplicación de primitivas.
- Responsive: 390/768/1024/1280/1440 en las 6 rutas G4 y en destino/empresa/evento/producto públicos; assert de `scrollWidth <= clientWidth` y ausencia de vacíos > 1 viewport.
- Accesibilidad automatizada: axe-core inyectado desde CDN en Playwright; cero violaciones críticas o serias; contraste de scrims verificado con el script existente `scripts/omxds/i1/contrast.mjs`.
- Funcional: Alux → Travel Plan canónico (invitado local-first, registro posterior, handoff a Concierge sólo con consentimiento explícito), breadcrumb Inicio → Oriente Maya de Yucatán → Destino, mapa preservado.

## 5. Reporte de preparación de entidades (read-only)

`scripts/omxds/g5/entity-readiness.mjs` ejecuta sólo `SELECT` y reutiliza los criterios ya codificados en `destination-premium-eligibility.server.ts` y `business-premium-eligibility.server.ts`. Salida en `docs/evidence/omxds-visual/g5/ENTITY-READINESS.{md,csv}` con: familia, id, slug, `is_demo_seed`, `status`, presentación resuelta, READY o BLOCKED y razones acreditadas. Los demos siempre se reportan BLOCKED por origen demo. Ninguna escritura, ningún `UPDATE`, ninguna migración, ningún cambio de `status` ni de `is_demo_seed`.

## 6. Paquetes (secuenciales, recuperables, sin aprobaciones intermedias)

- P1 — Eje de presentación + tipos + gate `validate:g5` (sin cambios visuales).
- P2 — Primitivas premium compartidas y mappers VM.
- P3 — Migración de los 6 previews G4 a primitivas, con capturas antes/después.
- P4 — Adopción en superficies públicas bajo elegibilidad por entidad; flag global intacto.
- P5 — Selector Editorial/Cinematográfica en CMS por rol, nunca público.
- P6 — QA responsive y accesibilidad automatizada + evidencias.
- P7 — Reporte de preparación read-only + cierre documental y sync de gobernanza.

Cada paquete es un commit propio, revertible de forma aislada. Sólo se detiene la ejecución ante un bloqueo real de gobernanza o seguridad.

## Invariantes

`omxds_visual_v1_contracts_enabled` permanece **false**. Sin migraciones, sin datos, sin secretos, sin producción, sin merge ni despliegue. Sólo medios gobernados por el proxy estable. Distintivo Pueblo Mágico únicamente textual mientras no exista asset acreditado configurable.

## Gobernanza

Si P4/P5 tocan rutas públicas o CMS, se crea un PCA nuevo (`docs/governance/product-authorizations/PCA-2026-031.json`, siguiente al `PCA-2026-030.json` existente) con permisos por ruta exacta, sin globs, y `required_tests` incluyendo la suite completa.

## Riesgos

- Regresión visual al unificar hero/galería: mitigada con capturas obligatorias antes/después por preview.
- I3-D ya registra divergencia previa por propagación de `premiumEligibility` en `BusinessSurface.tsx`; P4 debe reconciliar evidencia en el mismo paquete o quedará fail-closed.
- Route inventory fail-closed ante cualquier ruta nueva.
- Playwright/axe no están declarados en `package.json`; el QA se ejecuta como script de verificación local, no como dependencia de build.
- Riesgo de crear una segunda fuente de verdad si un mapper duplica lógica de contrato: prohibido, los mappers sólo leen `src/lib/omxds/surfaces/*`.
