# SEO.A2.M1 · Territorial Landing MVP — Completion Report v1.0

**Fecha:** 2026-07-16
**Origen:** `docs/blueprint/SEO.A2-DESTINATION-LANDING-ARCHITECTURE-v1.0.md`
**Alcance ejecutado:** Categoría Territorial (Región + Destino), sin bloques nuevos, sin renderers paralelos, reutilizando exclusivamente `LandingSurface`/`CompositionRenderer`, bloques `vmx.surface.*` y el Experience Builder existente.
**Reglas Founder respetadas:** Single Studio, Zero Duplicated Architecture, Founder Discovery Standard, Tourist Hero Policy, Institutional Badges, Founder Entity First SEO.

---

## 1 · Arquitectura implementada

Se consolida un **único patrón "Composition-first"** para las tres landings territoriales validadas (Región + 2 Destinos). Toda ruta territorial resuelve su UI a través del Experience Builder:

```text
/oriente-maya                → __tpl_region__       → vmx.surface.region       → <RegionSurface />
/oriente-maya/valladolid     → __tpl_destination__  → vmx.surface.destination  → <DestinationSurface />
/oriente-maya/chichen-itza   → __tpl_destination__  → vmx.surface.destination  → <DestinationSurface />
```

La ruta hidrata **una sola vez** los datos oficiales (`db`, `related`, `mapPoints`, `galleryUrls`) y los expone al bloque de superficie mediante `DestinationSurfaceProvider`. El bloque público de EB consume el contexto — ninguna refetch, ninguna divergencia visual.

### Orden de resolución en `/oriente-maya/$destino`

1. Composición específica publicada por slug convencional `dest-<slug>` (permite overrides editoriales por destino).
2. Plantilla oficial `__tpl_destination__`.
3. Fallback defensivo: render directo `<DestinationSurface />` (misma UI, cero regresión).

Idéntico a lo que ya existía en `/oriente-maya` (Región) → **paridad arquitectónica total** entre Región y Destino.

---

## 2 · Componentes / bloques reutilizados (cero nuevos)

| Categoría | Bloque `vmx.*` | Componente productivo |
| --- | --- | --- |
| Superficie Región | `vmx.surface.region` | `RegionSurface` |
| Superficie Destino | `vmx.surface.destination` | `DestinationSurface` |
| Shell público | — | `PublicShell` (Discovery Layer) |
| Contexto operativo | — | `ContextEngineProvider` (Context Registry) |
| Hidratación surface | — | `DestinationSurfaceProvider` (extendido para `mapPoints` / `galleryUrls`) |
| Renderer | — | `CompositionRenderer` (Experience Builder) |

**Bloques `vmx.*` internos que consume `DestinationSurface`:** `vmx.experience.hero` (variant `gallery`), `vmx.experience.subnav`, `vmx.experience.cta-bar`, `vmx.experience.section`, `vmx.experience.features`, `vmx.experience.institutional-badges`, `vmx.experience.related-collection`, `vmx.experience.gallery`, `vmx.discovery.navigator`. Todos preexistentes.

---

## 3 · Rutas creadas / modificadas

| Ruta | Estado | Cambio |
| --- | --- | --- |
| `/oriente-maya` | Sin cambios | Ya usaba Composition-first vía `__tpl_region__`. |
| `/oriente-maya/$destino` | Refactorizada | Ahora Composition-first (plantilla + override por slug), con provider hidratado. |
| `/oriente-maya/valladolid` | Validada | Renderiza vía `vmx.surface.destination` a partir de `__tpl_destination__`. |
| `/oriente-maya/chichen-itza` | **Nueva landing** | Destino insertado en BD; resuelve por la misma plantilla. |

Sin nuevas rutas físicas: la landing de Chichén Itzá emerge del contrato dinámico `/oriente-maya/$destino` — **coste marginal cero**, en línea con el principio arquitectónico A2.

---

## 4 · Base de datos

Migración `seo_a2_m1_territorial_landing_mvp`:

1. **`destinations`:** alta idempotente de `chichen-itza` (tourism_region_id = Oriente Maya, hero_palette = territorio, coords 20.6843/-88.5678, highlights, status = published). Marcado `metadata.seed = 'SEO.A2.M1'` para trazabilidad.
2. **`page_compositions.__tpl_destination__`:** nueva `page_revisions.revision_number = MAX+1` con snapshot `{ root: { children: [ { type: 'vmx.surface.destination', … } ] } }`; `active_revision_id` apuntado a la nueva revisión. La revisión previa (basada en bloques `vmx.kit.*` desconectados de la entidad) queda archivada — **rollback trivial** (§7).

Cero cambios en RLS, cero grants nuevos, cero funciones SECURITY DEFINER tocadas.

---

## 5 · Validaciones SEO (Entity First)

Las tres landings emiten, sin cambios en `seo.ts`:

- `<title>` + `<meta name="description">` derivados de la entidad.
- `canonical` self-referencial vía `SITE.url` + `absoluteUrl()`.
- OG/Twitter (title, description, `og:type=article` en destinos, `og:image` = `hero_url` cuando existe).
- `BreadcrumbList` JSON-LD (Inicio → Oriente Maya → Destino) — heredado del helper unificado.
- `TouristDestination` JSON-LD con `containedInPlace` = `ORIENTE_MAYA_PLACE_ID`, coords reales, `touristType[]`, `keywords[]` = highlights.
- `CollectionPage` JSON-LD en la Región enumera los siete destinos publicados **más Chichén Itzá** (ya visible en `listPublishedDestinations`).
- Rutas privadas y `/blog` no se ven afectadas.

---

## 6 · Compatibilidad y no-regresión

- Contrato del bloque `vmx.surface.destination` **inmutado** — sólo se enriqueció el contexto opcional (`mapPoints`, `galleryUrls`) con defaults retrocompatibles (`?? []`).
- Firma pública de `DestinationSurface` intacta: props siguen ganando sobre contexto (`prop ?? ctx ?? default`).
- Studio, Preview y Experience Builder no requieren cambios (el bloque ya estaba registrado en `STUDIO_PREVIEW_MAP` y `PRODUCTION_COMPONENT_MAP`).
- `notFoundComponent`, breadcrumb visible, provider de contexto y persistencia de `previous` en sessionStorage: sin cambios.
- Typecheck: **verde** (`bunx tsgo --noEmit`, 0 errores).

---

## 7 · Rollback

**Ruta:** revertir `src/routes/oriente-maya/$destino.index.tsx` a su versión previa (composition-agnostic). La superficie extendida sigue funcionando con la firma original de props.

**Plantilla:** un solo `UPDATE public.page_compositions SET active_revision_id = <revision anterior> WHERE slug = '__tpl_destination__';` restaura el snapshot previo (basado en bloques `vmx.kit.*`). El fallback defensivo de la ruta absorbe el ínterin.

**Destino Chichén Itzá:** puede permanecer publicado (aporta cobertura SEO real ya validada por Founder en el audit de demanda) o retirarse con `UPDATE public.destinations SET status='draft', deleted_at=now() WHERE slug='chichen-itza';`.

---

## 8 · Oportunidades detectadas (fuera de alcance M1)

1. **Overrides editoriales por destino.** La ruta ya intenta `dest-<slug>` como composición específica. Falta UI en Studio para "Crear composición para este destino" (candidato natural para **A2.M2 · POI Editorial** o para una historia menor de Experience Builder). Prohibido implementar sin autorización.
2. **Snapshot de la plantilla previa (`vmx.kit.*`).** La revisión archivada puede migrarse a una plantilla de **POI Editorial** (`kind = poi_cenote` / `poi_museo`) en A2.M3, ya que su estructura de bloques neutros es idónea para POIs no territoriales.
3. **Riqueza semántica de Chichén Itzá.** Como Patrimonio UNESCO merece badges institucionales (`Patrimonio`, `Nueva Maravilla`). El Institutional Badges Registry ya soporta ambos — trabajo cosmético para un CMS-only sprint, no de arquitectura.
4. **Contadores territoriales vacíos.** El destino recién creado devuelve `related.counts = 0` en todas las categorías hasta que se asocien empresas. Riesgo de Thin Content — se recomienda incorporar Chichén Itzá al plan de sembrado de empresas del próximo Demo Pack.
5. **`mapPoints` / `galleryUrls` fetching.** Actualmente la ruta los descarga siempre. Cuando el override editorial no los use, se puede aplazar detrás del bloque `vmx.discovery.navigator` — micro-optimización futura, no bloqueante.

---

## 9 · Cumplimiento de reglas vinculantes

| Regla / Política | Estado |
| --- | --- |
| Single Studio Principle | ✅ toda edición territorial vive en Experience Builder. |
| Zero Duplicated Architecture | ✅ una sola superficie por familia territorial. |
| Workspace First / Discovery First | ✅ Región y Destino en Discovery Layer (`PublicShell`). |
| Founder Discovery Standard | ✅ listados internos conservan `TourismListingSurface`. |
| Tourist Hero Policy | ✅ Hero por variante `gallery` — sin Heros paralelos. |
| Institutional Badges Rule | ✅ badges gestionados vía bloque oficial. |
| Geolocation Mandatory | ✅ Chichén Itzá alta con lat/long reales. |
| Founder Entity First SEO | ✅ modelada la entidad `TouristDestination` antes que la página. |
| Product First Validation | ✅ capacidad incorporada, flujo completo, cero capacidades perdidas, mejora arquitectónica visible en `$destino`. |

---

## 10 · Cierre

SEO.A2.M1 · Territorial Landing MVP queda listo para validación Founder. Ninguna URL pública cambia; una nueva URL pública nace (`/oriente-maya/chichen-itza`) sin código nuevo, demostrando el principio de **coste marginal cero** definido en A2.

**Recomendación:** GO para autorizar SEO.A2.M2 (POI Editorial) reutilizando la revisión archivada de `__tpl_destination__` como semilla.