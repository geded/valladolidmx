# G8-R1-D-R1 · Remediación y Cierre Definitivo de Alux IA Canónico — Completion Report v1.0

**Ola:** G8-R1-D-R1 (remediación autorizada del Control Final G8-R1-D)
**Carril:** A · Producto
**Alcance autorizado:** exclusivamente los defectos DEF-R1D-001..005 y los
gates GATE-01..03. No se inició R1-E ni R1-F, no se publicó contenido, no se
cambiaron flags, no se modificaron estados de contenido, 0 migraciones.

---

## 1. Defectos remediados

| Defecto | Remediación | Evidencia |
|---|---|---|
| **DEF-R1D-001** · headers múltiples (2–9) | Marcador canónico `data-omxds-chrome` con **un único emisor por rol**: `site-header` (SiteHeader), `public-footer` (SiteFooter), `alux-dock` (AluxFloatingTrigger), `alux-planner` (AluxPlannerBlock). Los `<header>` internos de sección permanecen intactos: son semántica legítima de contenido, no chrome. El conteo de chrome ya no se contamina con ellos. | `validate:r1:d` + QA DOM 390/768/1440 |
| **DEF-R1D-002** · candidato publicado con ficha 404 | Fail-closed **estructural** en `canonical-catalog.server.ts`: un producto sólo es candidato si su empresa contenedora está publicada y su ruta canónica completa (destino + categoría + empresa) es construible. Cero peticiones HTTP por candidato. Los descartes se registran en `rejected` con razón auditable. `tour-manglar-amanecer-demo` queda excluido sin alterar ni despublicar el dato demo. | tests 10–15 |
| **DEF-R1D-003** · URL canónica con plantillas literales | Fuente **única**: `buildCanonicalEntityUrl` en `canonical-entity-binding.ts`, que delega en `resolveCanonicalPath` (contrato N1). El catálogo no contiene ninguna plantilla literal de ruta; si el binding devuelve `null`, el candidato se excluye. | tests 1–9 |
| **DEF-R1D-004** · `zoneSlug` siempre `null` | `resolveZoneSlug` (catálogo) y `resolveContextZoneSlug` (contexto) validan pertenencia territorial real: la zona se acredita sólo si pertenece al destino activo; si no, `null` — sin bloquear la recomendación. | tests 16–17 + atributo `data-alux-zone` |
| **DEF-R1D-005** · contexto no consumido | `buildAluxUnifiedContext` se compone en **un solo lugar**: el dock de Alux, montado en todas las superficies públicas. El contrato anterior (`AluxContext`) queda como fuente territorial de entrada, nunca como segunda autoridad. El contexto se acredita en runtime vía `data-alux-context-*` y **gatea** la sugerencia: contexto insuficiente ⇒ Alux no sugiere. | tests 18–23 + QA DOM |

---

## 2. Gates

| Gate | Resultado |
|---|---|
| `validate:r1:d` (**nuevo**) | **PASS** — 24 escenarios formales + evidencia de chrome (4 emisores únicos, 4 documentos) |
| typecheck | PASS |
| build | PASS |
| lint | **PASS** — 0 nueva deuda; además −1 warning histórico |
| governance:check / sync | PASS (este reporte admitido en el índice 06) |
| route inventory | PASS |

### Matriz de 24 escenarios (`scripts/omxds/r1-d/alux-canonical.contract.test.ts`)
1–9 URL canónica por familia (hotel, restaurante, lugar, evento, experiencia,
tour, producto sin empresa ⇒ null, destino, ausencia de literales) ·
10–15 fail-closed (publicado, draft, empresa no publicada, eliminado, ruta no
construible, zonas/rutas fuera del catálogo) · 16–17 zona validada ·
18–23 contexto unificado (consentimiento, coordenadas, continuidad anónima,
insuficiencia, fechas/etapa/grupo sin PII, versión única) · 24 unicidad de chrome.

---

## 3. QA DOM 390 / 768 / 1440

12 mediciones (4 superficies × 3 anchos), todas **PASS**:

| Superficie | header | footer | dock | planner | overflow | contexto |
|---|---|---|---|---|---|---|
| Home | 1 | 1 | 1 | 0 | 0 | v1.0.0 · suficiente=false (no sugiere) |
| Destino | 1 | 1 | 1 | 0 | 0 | v1.0.0 · destino=valladolid · kind=destination |
| Listado | 1 | 1 | 1 | 0 | 0 | v1.0.0 · destino=valladolid · kind=category |
| Eventos | 1 | 1 | 1 | 0 | 0 | v1.0.0 · suficiente=false |

Idéntico en los tres anchos. Alux no cubre contenido; overflow 0 universal.

---

## 4. Invariantes preservadas

`omxds_visual_v1_contracts_enabled = false` · 0 publicaciones · 0 redirects ·
0 sitemap nuevo · 0 cambios de estado de contenido · 0 migraciones ·
0 rutas añadidas/modificadas/eliminadas · R1-E y R1-F no iniciadas.

---

## 5. Veredicto

**R1-D CERRADA Y ACREDITADA.** Los cinco defectos están remediados con
evidencia reproducible, el gate `validate:r1:d` existe y pasa, la matriz de
escenarios se ejecuta en CI y la QA DOM acredita un solo chrome por documento
en los tres anchos.

**STOP CONDITION activa** — se requiere autorización del Founder para iniciar R1-E.
