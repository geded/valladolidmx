# Lote 3D · Auditoría delta read-only posterior a 3A–3C

Fecha: 2026-09-05 · Modo: **sólo lectura** (sin cambios de código, datos, medios, migraciones, configuración, usuarios ni roles)
Árbol de trabajo: estado actual correspondiente a `integration/lovable-valladolidmx`

> Este informe **sustituye** el inventario antiguo. Los hallazgos ya corregidos en
> 3A/3B/3C se listan en §7 como resueltos y **no** se arrastran como pendientes.

---

## 1. Rama, autoridad y trazabilidad documental

| Punto | Resultado | Evidencia |
|---|---|---|
| Correspondencia del árbol con `integration/lovable-valladolidmx` | **NO VERIFICADO** | El entorno opera sobre la rama de edición gestionada por la plataforma; no se ejecutan comandos de estado de git. La correspondencia se verifica por **contenido** (§7), no por SHA. |
| HEAD exacto y árbol limpio | **NO VERIFICADO** | Misma causa. Última base declarada en el cierre 3C: `7a8c640bc9ebae13ebf7f441e010866110a9d70f`. |
| Informe final 3A | PASS | `docs/governance/audit/2026-09-04-LOTE-3A-REMEDIACION-P0-RLS-v1.0.md` |
| Informes finales 3B | PASS | `…2026-09-04-LOTE-3B-CMS-FIRST-MARCA-DESTINOS-BADGES-v1.0.md`, `…2026-09-04-LOTE-3B-OBJETIVO-A-HOME-CMS-FIRST-COMPLETION-REPORT-v1.0.md` |
| Informes finales 3C | PASS | `…2026-09-05-LOTE-3C-CASAS-Y-RUTAS-CMS-FIRST-COMPLETION-REPORT-v1.0.md`, `…-CORRECCION-FINAL-AUTORIDAD-CMS-v1.0.md`, `…-V-VERIFICACION-END-TO-END-v1.0.md`, `…-CIERRE-VERIFICACION-ROLES-v1.0.md` |

---

## 2. Inventario funcional CMS-first (matriz consolidada)

Leyenda: ✅ PASS · ❌ FAIL · ⚠️ NO VERIFICADO en esta auditoría (requiere prueba autenticada dedicada, fuera del alcance read-only)

| Plantilla | Tabla canónica | Alta/edición CMS | Portal Empresa | Lectura pública real | Listado→perfil (slug) | Atributos de filtro | Medios administrables | Estado editorial / autoridad | Alux | Mi Viaje |
|---|---|---|---|---|---|---|---|---|---|---|
| Home | `page_compositions` | ✅ | n/a | ✅ (rev. publicada) | n/a | n/a | ✅ | ✅ (editor/admin) | ✅ | n/a |
| Marca / institucionales | `platform_settings`, `banners` | ✅ | n/a | ✅ | n/a | n/a | ✅ | ✅ | n/a | n/a |
| Destinos / micrositios | `destinations`, `destination_zones` | ✅ | n/a | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Hoteles | `businesses` (+`business_*`) | ✅ | ✅ (campos permitidos) | ✅ `getPublicListing` | ✅ | ✅ | ✅ | ✅ (3A: reservados bloqueados) | ✅ | ⚠️ |
| Restaurantes | `businesses` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Casas de vacaciones | `businesses` | ✅ | ✅ (verificado por UI en 3C) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Eventos | `events` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Lugares / sitios de interés | `points_of_interest` | ✅ | n/a (autoridad CMS) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Experiencias | `products` (`product_type=experiencia`) | ✅ | ✅ | ✅ + **dataset DEMO local** | ✅ | ❌ ejes de filtro DEMO, no CMS | ✅ | ✅ | ✅ | ⚠️ |
| Rutas | `editorial_routes`, `editorial_route_stops` | ✅ | ❌ por diseño (sólo editorial) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Notas:
- Los listados de hoteles, restaurantes, casas, eventos y lugares comparten un único lector público (`src/lib/listings/listing-public-reads.functions.ts`) → coherencia CMS-first confirmada por lectura.
- Experiencias mantiene un lector propio (`src/lib/experiences/experience-public-reads.*`) que **sí** consulta tablas reales, pero convive con `src/lib/experiences/experience-demo-dataset.ts`, cuyos ejes de filtro son DEMO porque el CMS aún no define atributos turísticos para el tipo. Es la **doble fuente** que sigue vigente.

---

## 3. Auditoría visual y QA responsive (ejecutada)

14 superficies × 4 anchos (1440 / 834 / 430 / 390) = **56 casos**, todos HTTP 200, con contenido y controles renderizados.

| Criterio | Resultado |
|---|---|
| Overflow horizontal | **0 px en los 56 casos** ✅ |
| Imágenes rotas (`naturalWidth=0`) | **0** ✅ |
| Páginas vacías | **0** ✅ (`/arma-tu-viaje` ~1 708–1 854 caracteres) |
| Hero verde público | Ausente ✅ (único `emerald` restante es el token de badge `success`) |
| Selectores Editorial/Cinematográfico visibles al público | Ausentes ✅ (sólo lógica interna de presentación y previews `/lovable/*`) |
| Alux oficial sin duplicados | ✅ un único `AluxFloatingTrigger` montado en `__root.tsx` |
| Breadcrumb compacto con casita | ✅ `CompactCrumbs` transversal |
| `<h1>` único | ✅ salvo `/arma-tu-viaje` (**2 h1** en los 4 anchos) ❌ |
| Landmarks `main` duplicados | ❌ **8 superficies con 2 `main`** |
| Errores de consola | ❌ 2 clases (ver P1) |

### 3.1 Landmarks `main` duplicados (evidencia)

`PublicShell` renderiza `<main id="main">` y, anidado, `TerritorialListingReviewSurface`
(`src/components/listing-premium/TerritorialListingReviewSurface.tsx:453, 1077, 1626`)
renderiza un segundo `<main class="bg-[#f7f2e8] pb-12 …">`.

Afecta a `/hoteles`, `/restaurantes`, `/casas-de-vacaciones`, `/eventos`, `/lugares`.
`/` y `/marketplace` presentan también 2 `main` (segundo contenedor sin `id`).

### 3.2 Errores de consola observados

1. `Google Maps JavaScript API error: RefererNotAllowedMapError` — en `/hoteles`, `/`, `/marketplace` (1440/834/430/390 según ruta). Causa conocida: la clave gestionada está restringida a `*.lovable.app` / `*.lovableproject.com`; en entorno local y en dominio propio la API se deniega.
2. `Encountered two children with the same key` — en `/oriente-maya/valladolid` en los 4 anchos (clave React duplicada en una colección del micrositio).

### 3.3 Objetivo táctil ≥44 px

**NO VERIFICADO como conforme.** La medición automática reporta entre 13 y 50
elementos interactivos con alto < 44 px por página/ancho. La medición no
distingue enlaces de texto en línea (no sujetos al criterio) de controles
críticos, por lo que se reporta como pendiente de auditoría manual dirigida,
no como FAIL.

---

## 4. Navegación territorial

| Punto | Resultado |
|---|---|
| Home → listados globales con selector de destino | ✅ (`loaderDeps: ({search}) => ({destino})` en los 7 listados) |
| Micrositio: primero contenido del destino activo | ✅ (`/oriente-maya/valladolid` proyecta 3 595–3 736 caracteres de contenido propio) |
| Cercanías sólo bajo la regla aprobada | ⚠️ NO VERIFICADO (requiere revisión de datos por destino) |
| Breadcrumb y regreso a Home / Oriente Maya / destino | ✅ |
| Destinos y subzonas canónicos | ✅ contrato en `src/lib/navigation` |

---

## 5. Pendientes previos a producción · revalidación

| Pendiente antiguo | Estado hoy | Evidencia |
|---|---|---|
| Paridad de perfiles/listados Hotel, Restaurante, Casas, Eventos, Lugares | ✅ resuelto (lector y superficie únicos) | `listing-public-reads.functions.ts` + `TerritorialListingReviewSurface` |
| Paridad Experiencias | ❌ **sigue** | lector y superficie propios |
| Dependencia pública de `src/mocks/*` | ❌ **sigue** | `CategoriasSection`, `EmpresasSection`, `RutasSection`, `ResenasSection`, `HeroSearchPill` usan los mocks como `initialData` **y** como *fallback* cuando la consulta vuelve vacía |
| Doble fuente / estados inconsistentes de Experiencias | ❌ **sigue** | `experience-demo-dataset.ts` (ejes de filtro DEMO) |
| Alux ausente en listados | ✅ resuelto | trigger global montado; contexto abierto a `/rutas/*` y `/casas-de-vacaciones` en 3C |
| Google Maps `RefererNotAllowedMapError` | ❌ **sigue** | consola en `/hoteles`, `/`, `/marketplace` |
| Previews duplicados u obsoletos | ❌ **sigue** | 40 rutas bajo `src/routes/lovable/*` + `src/routes/preview/*` publicadas en el mismo dominio |
| Errores React | ❌ **1 caso** | clave duplicada en `/oriente-maya/valladolid` |
| Contratos y Route Inventory | ✅ | `246 rutas cubiertas`, exit 0 |
| Textos hardcodeados administrables | ⚠️ NO VERIFICADO | requiere barrido dirigido por superficie |

---

## 6. Gates ejecutados (resultados exactos)

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `bunx tsgo --noEmit` | **exit 0**, sin diagnósticos |
| Build | `bun run build` | **exit 0** · `✓ built in 4.59s` · PWA `precache 619 entries (7813.53 KiB)` · `dist/sw.js` generado |
| Suite | `bun test` | **761 pass · 0 fail · 5 318 expect() · 71 archivos · 3.49 s** |
| Route Inventory | `bun run scripts/route-inventory-coverage.ts` | **exit 0** · `✔ Route Inventory: 246 rutas cubiertas` |
| QA responsive | Playwright, 14 rutas × 4 anchos | 56/56 HTTP 200 · overflow 0 · 0 imágenes rotas |

> Nota metodológica: `bunx vitest run` no es un gate válido en este repositorio
> (51 archivos usan sintaxis `bun:test`); la suite oficial es `bun test`.

---

## 7. Evidencia de problemas ya resueltos en 3A–3C

| Hallazgo | Lote | Evidencia hoy |
|---|---|---|
| `business_owner` podía autopublicarse, autoverificarse y subir `visibility_level` | 3A | Disparadores `trg_enforce_reserved_business_fields` / `trg_enforce_reserved_product_fields` activos; verificado por Data API y por UI del Portal Empresa en 3C |
| Home no editable CMS-first | 3B | Revisión publicada, equivalencia visual verificada en 4 anchos |
| Casas y rutas fuera del CMS | 3C | `businesses` / `editorial_routes` con autoridad CMS y lectura pública real |
| `/arma-tu-viaje` renderizaba vacía | 3C | Bloques singleton registrados en `INITIAL_BLOCK_LIBRARY_SOURCE`; hoy 1 708–1 854 caracteres |
| Hydration mismatch del dock "Mi Viaje" | 3C | Sin errores de hidratación en los 56 casos medidos |
| Cuentas temporales de prueba | 3C | 0 cuentas con prefijo `lote3c.` |

---

## 8. Lista priorizada de problemas vigentes

### P0 — bloquean producción
- **P0-1 · Google Maps `RefererNotAllowedMapError`.** El mapa no carga fuera de `*.lovable.app`; afecta a dominio propio publicado.
- **P0-2 · Dependencia pública de `src/mocks/*` como *fallback*.** Si la consulta CMS vuelve vacía, la Home muestra contenido ficticio como si fuera real.

### P1 — calidad y accesibilidad
- **P1-1 · Landmarks `main` duplicados** en 7 superficies públicas.
- **P1-2 · Dos `<h1>` en `/arma-tu-viaje`.**
- **P1-3 · Clave React duplicada** en `/oriente-maya/valladolid`.
- **P1-4 · Doble fuente de Experiencias**: ejes de filtro DEMO sin respaldo CMS.
- **P1-5 · Previews internos publicados** (40 rutas `/lovable/*` + `/preview/*`) accesibles en el dominio público.

### P2 — deuda ordenada
- **P2-1 · Objetivo táctil ≥44 px** sin auditoría manual dirigida.
- **P2-2 · Textos hardcodeados** que deberían ser administrables.
- **P2-3 · Regla de "cercanías"** en micrositios sin verificación de datos.
- **P2-4 · Paridad de superficie de Experiencias** con el resto de listados.

---

## 9. Propuesta de lotes cerrados de reparación (requieren autorización del Founder)

### Lote 3E · Confianza de datos públicos (P0-2, P1-4)
- Alcance: eliminar el *fallback* a mocks en superficies públicas y sustituirlo por estado vacío/skeleton administrable; migrar los ejes de filtro DEMO de Experiencias a `tourism_attribute_definitions`/`options`.
- Archivos/entidades: `src/components/home/{CategoriasSection,EmpresasSection,RutasSection,ResenasSection,HeroSearchPill}.tsx`, `src/mocks/*`, `src/lib/experiences/experience-demo-dataset.ts`, tablas de atributos turísticos.
- Aceptación: ninguna superficie pública importa `@/mocks/*`; con base vacía la Home muestra estado vacío, nunca datos ficticios; los filtros de Experiencias provienen del CMS; gates en verde.

### Lote 3F · Mapas en dominio propio (P0-1)
- Alcance: clave de Google Maps propia con allowlist de referidos del dominio, y degradación elegante si el mapa no carga.
- Archivos/entidades: conexión del conector Google Maps, componentes de mapa.
- Aceptación: `/hoteles`, `/` y `/marketplace` sin `RefererNotAllowedMapError` en dominio propio; fallback visible si la clave falla.

### Lote 3G · Semántica y accesibilidad (P1-1, P1-2, P1-3, P2-1)
- Alcance: un único `main` por página, un único `h1`, clave React única en el micrositio, auditoría manual de objetivos táctiles críticos.
- Archivos/entidades: `TerritorialListingReviewSurface.tsx`, `PublicShell.tsx`, `arma-tu-viaje.tsx`, superficie de micrositio.
- Aceptación: 1 `main` y 1 `h1` por superficie en los 4 anchos; consola limpia; controles críticos ≥44 px; sin cambio visual perceptible.

### Lote 3H · Higiene de previews (P1-5)
- Alcance: restringir `/lovable/*` y `/preview/*` a sesión con permisos internos y retirar previews obsoletos.
- Archivos/entidades: `src/routes/lovable/*`, `src/routes/preview/*`, Route Inventory.
- Aceptación: previews inaccesibles de forma anónima; Route Inventory actualizado; sitemap y `robots.txt` sin previews.

### Lote 3I · Contenido administrable (P2-2, P2-3, P2-4)
- Alcance: barrido de textos hardcodeados, verificación de la regla de cercanías y unificación de la superficie de Experiencias con `TourismListingSurface`.
- Aceptación: textos migrados a CMS con inventario; regla de cercanías demostrada con datos; Experiencias con paridad de listado/perfil.

---

## 10. Declaración

Ninguna reparación fue ejecutada. No se modificaron código, datos, medios,
migraciones, configuración, usuarios ni roles. No se publicó, desplegó, creó PR
ni fusionó nada. Ningún problema se declara corregido sin la evidencia citada.
