# Lote 3C · Casas de Vacaciones y Rutas/Itinerarios CMS-first — Completion Report v1.0

Rama: `integration/lovable-valladolidmx` · Alcance: aditivo y reversible · Sin pagos, sin PR, sin Lote 3D.

## 1. Migraciones (aditivas)

- **A · Casas de Vacaciones**: `business_categories.listing_family_key` (backfill por `lower(slug)`), atributos `beds` / `bathrooms` / `accessibility` con sus opciones, y dos casas demo publicadas (`demo_seed_batch = 'lote-3c-casas-demo'`).
- **B · Rutas**: `editorial_routes` ampliado (`region_slug`, `origin_destination_id`, `zone_ids`, `duration_hours`, `pace`, `difficulty`, `interests`, `audiences`, `seasons`, `gallery_media_ids`, marcas demo) y nueva tabla `editorial_route_stops` con RLS pública de lectura sobre rutas publicadas y escritura para editores/admins (`is_editor_or_admin`). GRANTs explícitos.

Reversión: eliminar columnas/tabla añadidas y las filas con `demo_seed_batch` correspondiente.

## 2. Autoridad CMS-first

- La pertenencia categoría→familia de listado se lee desde `business_categories.listing_family_key` (`getListingFamilyTaxonomy`) y sustituye a las constantes, que quedan como fallback fail-safe. Comparación normalizada a minúsculas (corrige el listado vacío por `"Casas-de-vacaciones"`).
- Rutas: lectura pública `listPublicRoutes` / `getPublicRoute`; superficies `/rutas` y `/rutas/$slug` sobre `PublicShell`, contexto declarativo y breadcrumb compacto en móvil.
- CMS: `/cms/rutas`, `/cms/rutas/nueva`, `/cms/rutas/$id/editar` sobre `CmsEntityPage` + `EntityEditor` (workflow y auditoría existentes) y `EditorialRouteStopsPanel` para las paradas. Entrada "Rutas e itinerarios" añadida al registry de navegación del CMS. Sin editores ni motores paralelos.
- Mi Viaje admite el tipo `route` en contratos, iconos y etiquetas (referencias canónicas, no copia editorial).

## 3. Verificación autenticada (sesión activa del preview, rol admin)

- `/cms/rutas` lista las rutas demo; `/cms/rutas/$id/editar` carga campos y paradas reales.
- Edición → guardado → lectura pública: el texto de prueba `QA3C` apareció en `/rutas/valladolid-ek-balam` y se restauró el valor original (verificado).
- Público: `/casas-de-vacaciones` muestra las dos casas demo; `/rutas` muestra las rutas demo con portada. HTTP 200, sin errores de consola.

## 4. Calidad

- Typecheck `bunx tsgo --noEmit`: limpio.
- Build de producción: OK.
- Suite `bun test`: 761/761.
- Inventario de rutas: 246 rutas cubiertas (`scripts/route-inventory-coverage.ts`).
- QA responsive 1440 / 834 / 430 / 390 en listado y perfil públicos: sin desbordes.

## 5. Datos demo

Marcados con `is_demo_seed` y `demo_seed_batch` (`lote-3c-casas-demo`, `lote-3c-rutas-demo`). No se eliminan hasta autorización literal del Founder.
