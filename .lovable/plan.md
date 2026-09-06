# Plan corregido · Reparación final visual / responsive / CMS

## Lote 0 — Preflight (ya ejecutado, read-only)

Evidencia verificada en este turno:

| Comprobación | Resultado |
|---|---|
| HEAD efectivo | `e9a7ceb66d32288da44fdc80b3b752254e8dd466` |
| `integration/lovable-valladolidmx` (local) | `e9a7ceb6…` — **idéntico a HEAD** |
| `origin/integration/lovable-valladolidmx` | `e9a7ceb6…` — **idéntico a HEAD** |
| `git rev-list --left-right --count origin/integration/lovable-valladolidmx...HEAD` | `0 0` (ni adelante ni atrás) |
| `git diff --stat origin/integration/…...HEAD` | vacío |
| Árbol de trabajo | limpio (`git status --porcelain` sin salida) |
| Rama con nombre local | `edit/edt-b731cc99-…`, puntero gestionado por la plataforma **sobre el mismo commit**; no es un fork ni introduce commits |

Conclusión: el HEAD efectivo **sí** corresponde a `integration/lovable-valladolidmx`. No se crearán ramas nuevas; todo commit posterior aterriza en ese mismo ref.

Inventario del trabajo visual consolidado (últimos commits sobre `src/`):
`67c61f96` ficha Experiencia · `4a8d9fbd` UX listado Experiencias · `aaa69181`/`8e669044` `ExperienceFiltersBar` ·
`1eb82fe0`/`eca11442`/`efbd9787`/`a5aa2523`/`dc041cd0`/`162daa72`/`89405d99`/`4e2f60e4` `ExperiencesListingSurface` ·
`cc944a40` VM premium · `44c59096` `ProductAttributesPanel` · `1b50d5aa`/`ce9a0197` portal catálogo ·
`3701c1d0` `/experiencias` + preview.

Nota de proceso: `roadmap.md` no se modifica en este turno porque el modo actual sólo autoriza escribir el plan; la
tarea de auditoría/reparación se registra allí como primer paso del Lote 1.

## Lote 1 — Integridad técnica y contratos

Punto de partida medido: typecheck PASS, build PASS, `bun test scripts/` = **755 pass / 4 fail / 3 errors**.

Trabajo:
1. Enumerar y explicar **individualmente** los 7 resultados no verdes (4 fail + 3 errors) con archivo, aserción y causa.
   Causa ya identificada para el bloque principal: `scripts/omxds/r1-f1l-r2/premium-runtime-connection.contract.test.ts`
   exige `DestinationPremiumSurface` en `src/routes/oriente-maya/index.tsx`, que hoy usa `RegionDestinationsPremiumSurface`.
2. Decidir por caso: actualizar el contrato al componente vigente o corregir la ruta.
3. Registrar la tarea en `roadmap.md`.

Aceptación: `bun test scripts/` 100 % verde; typecheck y build verdes. Parada: suite en verde antes del Lote 2.

## Lote 2 — Auditoría autenticada CMS / Portal / Marca / Constructor / Medios

Cobertura hoy **NO VERIFICADA** (la auditoría fue anónima). Con sesión:
- `/cms`, `/cms/experience-builder`, `/portal/catalogo`, medios y roles.
- Por familia: alta, edición, asignación territorial (destino + subzona), operador/empresa, atributos que alimentan
  filtros, estados draft/in_review/published, RLS efectiva y lectura pública.
- Inventario explícito de qué textos/medios/distintivos son administrables y qué sigue hardcodeado
  (`src/config/brand.ts`, `src/config/regions.ts`, contenidos de atlas y home).

Aceptación: matriz familia × capacidad con evidencia. Parada: sin abrir código de producto.

## Lote 3 — Autoridad visual única (Home Premium)

Referencia obligatoria: Home Premium aprobada. Correcciones ya diagnosticadas:
- **Doble `<main>` en `/`** (`src/routes/index.tsx`) → un solo landmark.
- **Previews Hotel y Restaurante sin PublicShell** (0 `<main>`): `src/routes/lovable/g4-hotel-premium-preview.tsx`,
  `src/routes/lovable/g4-restaurant-premium-preview.tsx`. Migrar a `PublicShell` + breadcrumb territorial y
  **retirar el selector público "Afinar plantilla" / Editorial-Cinematográfica**.
- **Alux ausente** en listados públicos de hoteles, restaurantes, casas, eventos, lugares y experiencias → un único
  `TourismAluxPanel` oficial, sin duplicar con el flotante.
- **Breadcrumb faltante** en previews de listado (place, experiencia, evento, restaurante, casa).
- Footer, contenedor, tokens y dock Mi Viaje verificados como compartidos, no re-implementados.

Aceptación: por plantilla, PASS con captura antes/después en 1440/834/430/390. Parada tras validación del Founder.

## Lote 4 — Listados, datos, filtros y navegación

- **`/casas-de-vacaciones` renderiza 0 tarjetas** (P0 de contenido): determinar si es dato ausente o consulta.
- Desajustes de conteo a investigar: eventos 8 publicados → 7 tarjetas; lugares 5 publicados → 4 tarjetas;
  experiencias 4 publicadas en público vs 8 DEMO en `in_review` (doble fuente).
- Filtros con atributos estructurados (`filter_attributes`), conteos, omisión de valores vacíos y alcance territorial:
  desde micrositio filtra al destino activo; desde región permite todos con selector.
- Navegación listado → ficha → regreso en las seis familias (hoy verificada con 200 en hoteles, restaurantes, eventos,
  lugares y experiencias).

Aceptación: conteo publicado = conteo visible o causa documentada; filtros cambian resultados y conteos.

## Lote 5 — Perfiles y plantilla maestra de destinos

- `/oriente-maya/{slug}` como plantilla maestra real: nombre, tagline, descripción, highlights, distintivos, imágenes,
  galería, coordenadas, presentación, SEO y relaciones **desde CMS/Medios**.
- Eliminar fallbacks visuales exclusivos de Valladolid y listas fijas de slugs en código
  (revisar `src/config/regions.ts`, `src/mocks/destinos.ts`, contenido de atlas y badges institucionales).
- "Pueblo Mágico" y demás distintivos pasan a atributo administrable.
- Editorial/Cinematográfica sólo desde administrador/constructor.
- Prueba obligatoria: Valladolid, Izamal, Espita y un destino no Pueblo Mágico.
- Contenido relacionado del destino activo primero; cercanías sólo como fallback explícito.
- Perfiles: heroes de iPad 834 excesivos en casa de vacaciones (H1 y≈737) y evento (y≈741).

Aceptación: cambiar un campo en CMS se refleja en los cuatro destinos sin tocar código.

## Lote 6 — Mapas, rutas y configuración

- `RefererNotAllowedMapError` observado en Home 1440, Atlas, `/que-hacer` y catálogo de plantillas. Es la clave
  gestionada de Google Maps restringida a `*.lovable.app`; en el dominio propio requiere clave propia del Founder.
  Se documenta como **P0 de configuración** con instrucciones, no como bug de código.
- Verificar marcadores, rutas y sincronización mapa↔tarjetas una vez habilitada la clave.

## Lote 7 — Confinamiento de mocks y previews

- `src/mocks/*` sigue importado por `hoteles.tsx`, `restaurantes.tsx`, `experiencias.tsx`, `eventos.index.tsx`,
  `lugares.index.tsx`, `casas-de-vacaciones.tsx`, `oriente-maya/$destino.index.tsx`, `RegionSurface.tsx` y cinco bloques
  de Home. Clasificar fallback vs fuente y retirar de rutas públicas.
- 45 rutas bajo `/lovable/*` con solapes (tres previews de evento, dos de home): consolidar y mantener `noindex`.
- Fixtures demo: etiquetados, administrables o confinados a preview.

## Lote 8 — QA final y gate de producción

- Capturas y verificación en 1440 / 834 / 430 / 390 de todas las familias.
- Controles: `scrollWidth === innerWidth` (hoy ya PASS en 27 URLs × 3 anchos), touch targets ≥44 px (hoy hay entre 9 y
  26 controles menores por página en listados y micrositio), header/hamburguesa, breadcrumb comprimido, hero móvil
  compacto, densidad de tarjetas, filtros, mapa, Alux, footer, consola limpia (pendiente: claves React duplicadas en
  el micrositio).
- Entregable: **matriz final** plantilla × desktop/iPad/celular × visual/CMS/filtros/navegación/Alux/medios con PASS
  verificable, más enlaces completos.

## Restricciones aplicadas

Sin `main`, PR, merge ni producción. Sin modificar datos reales ni activar flags. Sin ampliar producto. Cada lote se
autoriza y cierra por separado con typecheck + build + suite + capturas antes/después y Completion Report.
