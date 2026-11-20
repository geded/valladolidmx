# Administrar el territorio desde el CMS

Objetivo: que Empresas, Productos, Eventos y Lugares se puedan filtrar y recorrer
con miles de registros, y que el CMS recuerde el destino con el que estás
trabajando aunque refresques la página.

## Qué cambia

### 1. Destino de trabajo recordado (barra territorial)

Una sola barra, arriba de cada listado, con **Destino** y **Zona**. Lo que elijas
queda guardado en el navegador y se reutiliza al entrar a Empresas, Productos,
Eventos y Lugares, también después de refrescar o cerrar la pestaña.

- Indicador visible: "Trabajando en: Valladolid · Centro" con un enlace
  "Ver todo el territorio" para salir del contexto.
- Zona siempre depende del destino elegido (regla territorial ya vigente).

### 2. Filtros adecuados por sección

| Sección | Filtros |
| --- | --- |
| Empresas | Destino, zona, categoría (hoteles, restaurantes, artesanías…), estado de publicación, verificadas |
| Productos | Destino, empresa, tipo (experiencia, hotel, restaurante, tour…), estado |
| Eventos | Destino, estado, periodo (próximos / pasados) |
| Lugares | Ya los tiene; solo se conecta al destino de trabajo recordado |

Buscador por nombre en todas, como hoy.

### 3. Listas preparadas para miles de registros

- Paginación real con "Anterior / Siguiente" y contador (hoy solo se ven los
  primeros 50 sin forma de avanzar).
- Columna de destino visible en Empresas, Productos y Eventos para ubicar cada
  ficha de un vistazo.
- Chips de filtros activos con opción de limpiar.

## Detalle técnico

- `src/lib/cms/territory-context.ts` (nuevo): estado del destino/zona activos con
  persistencia en `localStorage` (`vmx.cms.territory`), hook `useCmsTerritory()`.
  Sin backend nuevo, sin tablas nuevas.
- `src/components/cms/CmsTerritoryBar.tsx` (nuevo) y
  `src/components/cms/CmsFilters.tsx` (nuevo, reutiliza los estilos y `FilterChips`
  ya existentes en Media/Lugares).
- `src/lib/cms/reads.functions.ts`: `listBusinessesCms`, `listProductsCms` y
  `listEventsCms` aceptan filtros opcionales (`destinationId`, `zoneId`,
  `categoryId`, `businessId`, `productType`, `status`, `verified`, `period`) y
  devuelven `limit/offset` ya soportados. Filtrado en servidor con RLS intacta;
  categoría de empresa vía `business_category_links`.
- Nueva lectura `listCmsTerritoryOptions` (destinos, zonas, categorías de empresa,
  empresas) con `requireSupabaseAuth` + `assertEditorial`, cacheada por React Query.
- `CmsEntityPage` / `EntityListView`: soporte de `page`/`offset`, filtros
  adicionales y columna de destino. Se conservan columnas, orden y lenguaje
  editorial actuales; ningún listado se rediseña.
- Sin cambios en permisos, transiciones editoriales, plantillas públicas ni
  superficies del Portal.

## Verificación

`tsgo`, pruebas existentes, `git diff --check` y revisión visual de los cuatro
listados en 1440 / 834 / 430 / 390.
