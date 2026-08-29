# G8-R1-F1C-0 · Cierre visual pendiente — Acceso directo y QA 1440

**Estado:** entregado · read-only sobre diseños, contratos, datos, presets, flags, rutas productivas, sitemap y redirects (sin cambios).
**Único añadido:** hub interno de enlaces `/lovable/g8-r1f1c-preview-hub` (índice, no renderer) + evidencia QA 1440.

## 1 · Hub único de acceso

`/lovable/g8-r1f1c-preview-hub` — noindex,nofollow,noarchive. Sólo lista enlaces, preset/familia, datos, modos y bloques visibles/omitidos. No renderiza superficies ni duplica bloques.

## 2 · URLs directas por familia

| # | Familia | Preset / familia exacta | URL interna (noindex) | Modos | Datos |
|---|---|---|---|---|---|
| A | Casa de vacaciones | `premium-entity-vacation-rental` · `vacation-rental-surface.adapter` · JSON-LD `VacationRental` | `/lovable/g8p2-vacation-rental-premium-preview` | Editorial (default) · Cinematográfica con portada aprobada | Fixture neutral interno |
| B | Empresa turística genérica | sin preset · `BusinessSurface` + adaptador genérico por categoría (pendiente) · `LocalBusiness` | `/lovable/g8-r1f1c-business-generic-preview` | Editorial (default) · Cinematográfica fail-closed | Fixture neutral interno |
| C | Producto genérico | sin preset · `ProductSurface` + adaptador genérico (pendiente) · `Product` sin `offers` | `/lovable/g8-r1f1c-product-generic-preview` | Editorial (default) · Cinematográfica fail-closed | Fixture neutral interno |
| D | Zona territorial | sin preset ni ruta pública · `TouristDestination` + `containedInPlace` | `/lovable/g8-r1f1c-zone-preview` | Editorial (default) · Cinematográfica fail-closed | Fixture neutral interno |
| E | Ruta / itinerario | sin preset ni CMS · `TouristTrip` + `ItemList` | `/lovable/g8-r1f1c-route-preview` | Editorial (default) · Cinematográfica fail-closed | Fixture neutral interno |
| F | Artículo / guía editorial | sin preset ni `/blog/$slug` · `Article` | `/lovable/g8-r1f1c-article-preview` | Editorial (default) · Cinematográfica fail-closed | Fixture neutral interno |

Ningún preview usa contenido publicable, fotografía de terceros ni fichas reales del lote B1-B4.

## 3 · Bloques visibles / omitidos

Listado breve por familia publicado en el propio hub (tarjeta de cada familia), fuente única para evitar divergencia documental.

## 4 · QA visual 390 / 768 / 1440 px

7 rutas × 3 anchos = **21 escenarios**.

- Overflow horizontal: **0 px** en los 21 escenarios.
- Consola: **0 errores** y 0 `pageerror` en los 21 escenarios.
- Chrome: **1 header** (`role=banner`) y **1 footer** por ruta.
- Dock: **1 solo dock Alux** (`Alux · Concierge IA`) y un único planner Mi Viaje.
- Breadcrumb territorial presente en las seis familias.
- Guardar / Agregar a Mi Viaje: A, C, D, E, F; en B como acción secundaria.
- Marcador neutral cuando falta medio gobernado; Cinematográfica fail-closed sin portada.
- Vista de estado vacío: colecciones y campos sin acreditar se omiten explícitamente (precio, stock, horarios, disponibilidad).

Capturas generadas: `<familia>-390.png`, `-768.png`, `-1440.png` para hub y las seis familias (artefactos de ejecución Playwright).

## 5 · Casa de vacaciones vs Hotel

Incluida en el mismo paquete: su contrato se emite como `business` (no `hotel`) y su ficha declara propiedad completa, capacidad, dormitorios/camas/baños, cocina, reglas, estancia mínima, check-in/out y ubicación aproximada por privacidad — campos ausentes en la ficha de Hotel — con JSON-LD `VacationRental`. No es un hotel renombrado.

## STOP CONDITION

Sin cambios en diseños, contratos, datos, rutas productivas, presets, flags, contenido, sitemap ni redirects. Se espera aprobación visual expresa del Founder, familia por familia.
