# G8-R1-C+L · Manifiesto de evidencia

Instrumento: `PCA-2026-050` · Blueprint `19.46`
Fecha efectiva: 2026-08-28

## Autoridad visual acreditada

- Composición: `biz-zazil-tunich`
- Revisión: #2 · `SEO.A3.M2`
- SHA-256: `61913a4fa92bdb1c671a392caabc0b08f55a6ec946ed737abcd9038e01113d9c`
- Uso autorizado: estructura narrativa de 17 bloques. El contenido de la
  entidad de origen no se copia a la plantilla (cero contenido inventado).

## Entregables

| Paso | Entregable | Ruta |
|---|---|---|
| C1 | Resolutor canónico de 8 familias | `src/lib/experience-builder/canonical-entity-resolver.ts` |
| L1 | Plantilla reusable `premium-seo-landing` | `src/lib/experience-builder/seo-landing/seo-landing-template.ts` |
| L2 | Preview interna de paridad (noindex) | `src/routes/lovable/g8-r1cl-seo-landing-parity.tsx` |
| Gate | Contrato + evidencia estática | `scripts/omxds/r1-cl/*` |

## Invariantes verificadas

- Cero publicación · ninguna entidad, destino o composición cambia de estado.
- Cero redirects y cero rutas públicas nuevas; la única ruta añadida es interna
  y `noindex,nofollow,noarchive`, ausente del sitemap.
- `omxds_visual_v1_contracts_enabled = false` — sin cambios de flags.
- cero migración de esquema: el metadato editorial vive en `chrome.seo.landing`
  (jsonb ya existente).
- cero contenido inventado: todo slot sin datos reales se omite por contrato.
- Chichén Itzá y Ek' Balam permanecen en `draft`.
- Una sola superficie y un solo renderer: Studio, preview y rutas públicas
  comparten `CompositionRenderer`.

## Verificación

```
bun run validate:r1:cl
```

## STOP CONDITION

Ejecución detenida tras L2. Se requiere aprobación visual del Founder sobre la
paridad Caso A / Caso B antes de iniciar C2 (conexión de entidades reales).

## CL3 · Creación contextual de Landings SEO (2026-08-28)

Autorización: `PCA-2026-050-ADDENDUM-B`.

| Requisito Founder | Implementación | Acreditación |
| --- | --- | --- |
| 1 · Botón contextual en el administrador | `src/components/cms/SeoLandingAction.tsx`, integrado en `BusinessEditor`, `ProductEditor` y `PlaceEditor` | Visible sólo para `super_admin`/`admin`/`editor` (`canManageSeoLandings`); RLS y `eb_create_composition` aplican la autorización dura |
| 2 · Comportamiento | `createSeoLandingDraft` crea `page_type=landing` + `kind=landing`, plantilla `premium-seo-landing`, variante `authority-editorial-zazil`, presentación Editorial | Árbol generado por `buildSeoLandingComposition` (18 slots, omisión por vacío) |
| 3 · Idempotencia | Búsqueda por `chrome.seo.landing.entityRef`; si existe, la acción abre la landing existente y `created=false` | Tests `CL3 · idempotencia` |
| 4 · SEO y anticanibalización | `robots_directive="noindex,nofollow"` + `canonical_override` hacia la ficha canónica real | `buildSeoLandingSeoPolicy`, tests dedicados |
| 5 · Pilotos configurables | `SEO_LANDING_PILOTS`: Zazil Tunich, Chichén Itzá, Cenote Suytún, producto genérico | Declarativos, sin contenido embebido |
| 6 · Borradores legacy | `listLegacySeoLandingDrafts` (diagnóstico) y `archiveLegacySeoLandingDrafts` (archivado transaccional, fail-closed si hubo publicación) | Inventario real verificado: `hoteles`, `restaurantes`, `experiencias`, `oriente-maya` — los cuatro en `draft`, `published_at = null` |

Cero contenido inventado: los slots se llenan sólo con `display_name`/`name`, `tagline`, `description` y media real; sin dato, el bloque no se genera.

Invariantes verificadas: cero publicación, cero redirects, cero sitemap, cero rutas públicas nuevas, cero migración de esquema, `omxds_visual_v1_contracts_enabled=false`.

Gates: `bun run lint` PASS · `bun run typecheck` PASS · `bun run build` PASS · `bun run validate:r1:cl` PASS (33 tests).
