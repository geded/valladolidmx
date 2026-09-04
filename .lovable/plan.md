# Auditoría final read-only — sistema visual Premium

Sin ediciones de código, datos, medios, migraciones ni configuración. Todo lo afirmado
abajo procede de lecturas de archivo, consultas a la base o inspección real en navegador.
Lo que no pude demostrar aparece como **NO VERIFICADO**.

## D) Rama efectiva y HEAD

- HEAD: `67c61f963a1cf448df346e0802df175893212d12`
- Rama efectiva del entorno: `edit/edt-753d0559-3387-48d3-991f-5cdfa9f44847` (rama de trabajo del
  editor). La correspondencia exacta con `integration/lovable-valladolidmx` **NO VERIFICADA**
  desde este entorno: no hay acceso a remotos.

## E) Pruebas ejecutadas

| Control | Comando | Resultado |
|---|---|---|
| Typecheck | `bunx tsgo --noEmit -p tsconfig.json` | PASS (0 errores) |
| Build | `bun run build` | PASS (build de producción completo) |
| Pruebas | `bun test scripts/` | **755 pass / 4 fail / 3 errors** (759 en 70 archivos) |
| Barrido responsive | Playwright, 27 URLs × 390/834/1440 | ver §A |
| Navegación listado→ficha | Playwright, 6 listados | ver §A |
| Conteo de datos | consulta a la base por estado | ver §5 |

Fallo de pruebas (preexistente, no introducido hoy):
`scripts/omxds/r1-f1l-r2/premium-runtime-connection.contract.test.ts` exige que
`src/routes/oriente-maya/index.tsx` contenga `DestinationPremiumSurface`; la ruta hoy usa
`RegionDestinationsPremiumSurface`. El contrato quedó desincronizado tras el rediseño del Atlas.

## A) Matriz de plantillas

Leyenda: OK / PARCIAL / FAIL / n/d. "Home parity" evalúa PublicShell + contenedor + breadcrumb +
tokens, no sólo imports compartidos.

| Plantilla | Pública | Preview noindex | CMS | Desktop 1440 | iPad 834 | Móvil 390/430 | Home parity | Alux | Mi Viaje | Filtros | Medios | Comercio | Estado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home Premium | `/` | `/lovable/g4-home-premium-preview` | sí | OK | OK | OK | PARCIAL (**2 elementos `<main>` en `/`**) | no visible | sí | n/d | OK | n/d | PARCIAL |
| Atlas Destinos | `/oriente-maya/destinos` | `/lovable/g4-destination-listing-premium-preview` | sí (7 destinos publicados) | OK | OK | OK | OK | sí | sí | OK | 37 imgs, 0 rotas | n/d | OK |
| Región hub | `/oriente-maya` | — | sí | OK | OK | OK | OK | NO VERIFICADO | sí | n/d | OK | n/d | PARCIAL (test de contrato en rojo) |
| Micrositio destino | `/oriente-maya/valladolid` | `/lovable/g4-destination-microsite-preview` | sí | OK | OK | OK | OK | sí | sí | PARCIAL | OK | n/d | PARCIAL (**claves React duplicadas en consola**) |
| Hoteles listado | `/hoteles` | — | sí (2 fichas) | OK | OK | OK | PARCIAL | **no** | sí | PARCIAL | 3 imgs | descubrimiento | PARCIAL |
| Hotel perfil | `/oriente-maya/$destino/hoteles/$empresa` | `/lovable/g4-hotel-premium-preview` | sí | PARCIAL | PARCIAL | PARCIAL | **FAIL en el preview (0 `<main>`, sin PublicShell, selector de presentación visible)** | sí | sí | n/d | preview con medios gobernados | DEMO rotulado | FAIL |
| Restaurantes listado | `/restaurantes` | `/lovable/g4-restaurant-listing-premium-preview` | sí (3 fichas) | OK | OK | OK | PARCIAL | **no** | sí | PARCIAL | 4 imgs | descubrimiento | PARCIAL |
| Restaurante perfil | ruta canónica de empresa | `/lovable/g4-restaurant-premium-preview` | sí | PARCIAL | PARCIAL | PARCIAL | **FAIL (0 `<main>`, sin PublicShell)** | sí | sí | n/d | preview | DEMO rotulado | FAIL |
| Casas de vacaciones listado | `/casas-de-vacaciones` | `/lovable/g4-vacation-rental-listing-premium-preview` | sí | OK estructura | OK | OK | PARCIAL | **no** | sí | PARCIAL | **0 tarjetas: listado vacío** | descubrimiento | **FAIL (contenido)** |
| Casa perfil | ruta canónica de empresa | `/lovable/g8p2-vacation-rental-premium-preview` | sí | OK | **hero excesivo: H1 a y=737** | OK | PARCIAL | sí | sí | n/d | 8 imgs | DEMO | PARCIAL |
| Eventos listado | `/eventos` | `/lovable/g4-event-listing-premium-preview` | sí (8 publicados, 7 tarjetas) | OK | OK | OK | PARCIAL | **no** | sí | PARCIAL | 8 imgs | descubrimiento | PARCIAL |
| Evento perfil | `/eventos/$slug` | `/lovable/g4-event-premium-preview` | sí | OK | **hero excesivo: H1 a y=741** | OK | PARCIAL | sí | sí | n/d | 6 imgs | DEMO | PARCIAL |
| Lugares listado | `/lugares` | `/lovable/g4-place-listing-premium-preview` | sí (5 publicados, 4 tarjetas) | OK | OK | OK | PARCIAL (**preview sin breadcrumb**) | **no en la pública** | sí | OK | medios IA temporales | n/a | PARCIAL |
| Lugar perfil | `/oriente-maya/$destino/lugares/$slug` | `/lovable/g4-place-premium-preview` | sí | OK | OK | OK (H1 a y=459) | OK | sí | sí | n/d | IA temporal rotulada | n/a | OK |
| Experiencias listado | `/experiencias` | `/lovable/g4-experience-listing-premium-preview` | parcial | OK | OK | OK | PARCIAL (**preview sin breadcrumb**) | **no** | **no** | OK (barra/panel) | 14 imgs | descubrimiento | PARCIAL |
| Experiencia perfil | `/producto/$slug` | `/lovable/g4-experience-premium-preview` | parcial (8 en `in_review`) | OK | OK | OK | OK | sí | sí | n/d | IA temporal rotulada | sólo Mi Viaje | OK |
| Qué hacer / Mapa / Promociones | `/que-hacer`, `/mapa`, `/promociones` | — | parcial | OK | OK | OK | PARCIAL | no | no | n/d | `/mapa` y `/que-hacer` sin imágenes | n/d | PARCIAL |
| Catálogo de plantillas | — | `/lovable/g8e-premium-template-catalog` | n/a | OK | OK | OK | n/a | n/a | n/a | n/a | error de consola de Google Maps | n/a | PARCIAL |

Resultados transversales del barrido:
- **Sin overflow horizontal en ninguna de las 27 URLs × 3 anchos**: `scrollWidth === innerWidth` siempre.
- **Sin imágenes rotas** (`naturalWidth === 0`) en ninguna superficie.
- Errores de consola detectados: Google Maps `RefererNotAllowedMapError` (Home 1440, Atlas, catálogo,
  `/que-hacer`) y claves React duplicadas en el micrositio.
- Objetivos táctiles por debajo de 44 px: entre 9 y 26 elementos `a`/`button` por página en listados y
  micrositio. Nota: el conteo incluye enlaces de texto en línea, así que **la clasificación por elemento
  concreto queda NO VERIFICADA**; sí está verificado que existen controles interactivos <44 px.

## §4 Contenido y medios

- Vacío real: `/casas-de-vacaciones` renderiza **0 tarjetas**.
- `/experiencias` público muestra 4 productos (`published`); las 8 experiencias DEMO están en
  `in_review` y sólo se ven en el preview → dos fuentes distintas para la misma familia.
- Medios IA temporales correctamente rotulados en Lugares y Experiencias
  (`is_demo_seed`, batch `experiences-preview-2026-09-04`, alt conceptual).
- Los previews de Hotel y Restaurante usan medios gobernados vía
  `/api/public/studio-media/governed/v1p1c/*`, no CMS de la ficha real.
- Fixtures que siguen siendo segunda fuente: `src/mocks/*` importados por
  `restaurantes.tsx`, `hoteles.tsx`, `experiencias.tsx`, `eventos.index.tsx`, `lugares.index.tsx`,
  `casas-de-vacaciones.tsx`, `oriente-maya/$destino.index.tsx`, `RegionSurface.tsx` y los bloques de
  Home (`DestinosSection`, `CategoriasSection`, `EmpresasSection`, `ResenasSection`, `RutasSection`).
  **El grado exacto de dependencia por archivo (fallback vs fuente principal) queda NO VERIFICADO.**

## §5 Datos, CMS y portal (consulta directa)

| Entidad | published | in_review | draft | archived |
|---|---|---|---|---|
| businesses | 10 | — | 44 | — |
| products | 4 | 8 | 5 | — |
| events | 8 | — | — | 10 |
| points_of_interest | 5 | — | 2 | — |
| destinations | 7 | — | 3 | — |

Alta/edición, permisos RLS efectivos por rol, asignación territorial desde CMS y qué textos de marca
son administrables vs hardcodeados: **NO VERIFICADO** en esta pasada (requiere sesión autenticada en
`/cms` y `/portal`, fuera del alcance read-only ejecutado).

## §6–§7 Funcionalidad y comercio

- Listado→ficha verificado con 200 y H1 correcto en: Hoteles
  (`/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha`), Restaurantes, Eventos, Lugares,
  Experiencias. Sin 404 en los enlaces muestreados.
- La ficha de hotel real rinde sólo ~1.7 KB de texto: contenido muy por debajo de la plantilla premium.
- Experiencia: CTA correcto (`Agregar a Mi Viaje` con UUID canónico), sin reserva en línea, sin
  teléfonos/WhatsApp ficticios; el resto de familias **NO VERIFICADO** contra contrato de comercio.
- Mapas: la clave de Google Maps rechaza el referer del entorno de vista previa, así que el render real
  de marcadores/rutas queda **NO VERIFICADO**.

## B) Prioridades

**P0 — bloquean producción**
1. Previews Premium de Hotel y Restaurante fuera del shell canónico: 0 elementos `<main>`, sin
   PublicShell y con selector "Afinar plantilla" visible (prohibido).
   `src/routes/lovable/g4-hotel-premium-preview.tsx`, `src/routes/lovable/g4-restaurant-premium-preview.tsx`.
2. `/casas-de-vacaciones` sin resultados: familia completa vacía en producción.
   `src/routes/casas-de-vacaciones.tsx` + datos.
3. Home pública con dos landmarks `<main>` (SEO/accesibilidad y ambigüedad de shell). `src/routes/index.tsx`.
4. Suite en rojo: 4 fallos por contrato desactualizado del hub regional.
   `scripts/omxds/r1-f1l-r2/premium-runtime-connection.contract.test.ts` vs `src/routes/oriente-maya/index.tsx`.

**P1 — degradan paridad y confianza**
5. Alux ausente en los listados públicos de Hoteles, Restaurantes, Casas, Eventos, Lugares y
   Experiencias (sí está en Atlas y micrositio).
6. Hero excesivo en iPad 834 en tres fichas: H1 a y≈737–750 (`pv-vr`, `pv-event`; Experiencia ya corregida).
7. Breadcrumb territorial ausente en previews de listado (place, experiencia, evento, restaurante, casa).
8. Claves React duplicadas en el micrositio de destino.
9. Doble fuente en Experiencias: 4 productos publicados vs 8 DEMO en `in_review`.
10. Controles interactivos <44 px en listados y micrositio.

**P2 — deuda**
11. Google Maps `RefererNotAllowedMapError` en el entorno de vista previa.
12. `src/mocks/*` todavía enlazados desde 8 rutas y 5 bloques de Home.
13. 45 rutas de preview bajo `/lovable/*`, varias solapadas (tres previews de evento, dos de home).
14. Sin verificación autenticada de CMS/portal: cobertura de auditoría incompleta por diseño.

## C) Producción

- Listo: Atlas de Destinos, micrositio de destino (salvo claves duplicadas), ficha de Lugar, ficha de
  Experiencia, ausencia total de overflow horizontal, typecheck y build.
- Bloquea producción: los cuatro P0.

## F) Plan cerrado de reparación por lotes (no ejecutado)

- **Lote 1 · Paridad de shell (P0-1, P0-3):** migrar los previews de Hotel y Restaurante a PublicShell +
  breadcrumb territorial, retirar el selector de presentación; eliminar el `<main>` duplicado de la Home.
- **Lote 2 · Contenido vacío (P0-2, P1-9):** decidir origen de datos de Casas de vacaciones y resolver la
  doble fuente de Experiencias (publicar o mantener DEMO sólo en preview).
- **Lote 3 · Suite verde (P0-4):** actualizar el contrato del hub regional al componente vigente.
- **Lote 4 · Alux y breadcrumb transversales (P1-5, P1-7):** un solo panel oficial en los seis listados y
  breadcrumb en los previews de listado.
- **Lote 5 · Responsive fino (P1-6, P1-8, P1-10):** hero iPad, claves duplicadas, targets ≥44 px.
- **Lote 6 · Deuda (P2):** referer de Maps, retiro de `src/mocks/*`, consolidación de previews.
- **Lote 7 · Auditoría autenticada:** CMS, portal empresa, RLS, marca y textos administrables.

Cada lote se autoriza y cierra por separado, con typecheck + build + pruebas + captura antes/después.

## G) Previews verificadas (enlaces)

Base: `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app`

Públicas: `/` · `/oriente-maya` · `/oriente-maya/destinos` · `/oriente-maya/valladolid` · `/hoteles` ·
`/restaurantes` · `/casas-de-vacaciones` · `/eventos` · `/lugares` · `/experiencias` · `/que-hacer` ·
`/mapa` · `/promociones` · `/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha`

Previews noindex: `/lovable/g4-home-premium-preview` · `/lovable/g4-destination-listing-premium-preview` ·
`/lovable/g4-destination-microsite-preview` · `/lovable/g4-hotel-premium-preview` ·
`/lovable/g4-restaurant-premium-preview` · `/lovable/g4-restaurant-listing-premium-preview` ·
`/lovable/g4-vacation-rental-listing-premium-preview` · `/lovable/g8p2-vacation-rental-premium-preview` ·
`/lovable/g4-event-listing-premium-preview` · `/lovable/g4-event-premium-preview` ·
`/lovable/g4-place-listing-premium-preview` · `/lovable/g4-place-premium-preview` ·
`/lovable/g4-experience-listing-premium-preview` · `/lovable/g4-experience-premium-preview` ·
`/lovable/g8e-premium-template-catalog`
