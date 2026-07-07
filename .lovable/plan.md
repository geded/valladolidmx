## Objetivo

Convertir la ficha de categoría en destino (ej. `/oriente-maya/valladolid/hoteles`) — a donde llega el buscador tipo Airbnb — en una experiencia de descubrimiento tipo Airbnb: **mapa arriba con todos los hoteles encontrados** + **grid de tarjetas abajo** con corazón de favoritos y "Ver info" que abre un **modal** (sin salir de la página).

## Alcance

Aplica a `src/routes/oriente-maya/$destino.$categoria.index.tsx` (categoría en destino). Reutilizamos la infraestructura oficial:

- `ExperienceMapBlock` (bloque oficial `vmx.experience.map`)
- `TourismListingSurface` (ya tiene `mapSlot` y `renderActions` para el corazón)
- `FavoriteButton` (Airbnb-style, ya existe)
- `getMarketplaceBusinessBySlug` para hidratar el modal
- `Dialog` de shadcn para el modal

No creamos motores ni componentes paralelos.

## Cambios

### 1. Datos — exponer coordenadas en el listado
- `listMarketplaceBusinesses` (server fn en `marketplace-reads.functions.ts`): joinear `business_locations` (primary) y devolver `latitude`, `longitude`, `address_line1` en `MarketplaceBusinessCard`.
- Sin regresiones: campos opcionales; superficies existentes no rompen.

### 2. Adapter → puntos de mapa
- En el loader de la ruta, mapear los `items` filtrados a `ExperienceMapPoint[]` con `businessToMapPoint` (ya existe en `entity-to-map-point.ts`). Descartar los que no tengan coordenadas.

### 3. Superficie de categoría — insertar mapa
- En `$destino.$categoria.index.tsx`, pasar `mapSlot={<ExperienceMapBlock dto={{ variant: "list-sync", points, heading: "Mapa de <cat> en <destino>", ... }} />}` a `TourismListingSurface`.

### 4. Modal "Ver info" — no navegar
- Nuevo componente `BusinessQuickViewDialog` (`src/components/discovery/BusinessQuickViewDialog.tsx`) con `Dialog` de shadcn:
  - Recibe `slug` y `open`; al abrirse hace `useQuery` sobre `getMarketplaceBusinessBySlug`.
  - Muestra cover, nombre, tagline, descripción corta, badges, dirección, mapa mini (opcional Fase 2), lista de productos con precios, y CTAs:
    - **"Ver ficha completa"** → link a `/oriente-maya/{destino}/{cat}/{empresa}`
    - **"Agregar a mi viaje"** (usa `AddToTravelPlanButton` existente)
    - **Corazón favorito** (usa `FavoriteButton`)
- La superficie inyecta un `renderActions`/`onOpenDetail` que abre el modal en lugar de navegar. Requiere una pequeña extensión de `TourismListingSurface` o envolver `TourismCard` en un wrapper local en la ruta que intercepte el click.

**Enfoque mínimamente invasivo:** en la ruta creamos un `CategoryHotelsView` cliente que:
  1. Renderiza el `ExperienceMapBlock` arriba.
  2. Renderiza el grid de `TourismCard` directamente (sin `TourismListingSurface`) para poder interceptar la acción primaria → `setDialogSlug(vm.slug)`.
  3. Mantiene el corazón visible con `FavoriteButton`.

Esto evita ampliar contratos del surface oficial en esta iteración.

### 5. Modal sobre la tabla o página completa (mobile)
- En desktop: `Dialog` estándar (max-w 720px, scrollable).
- En mobile: mismo Dialog full-screen (h-full).

## Detalles técnicos

- **Ubicación obligatoria**: hoteles sin lat/lng no aparecen en el mapa pero sí en el grid (con badge "Ubicación no disponible" opcional).
- **Sin cambios de ruta ni URL**: se conservan las URLs existentes; la ficha completa sigue funcionando en su ruta.
- **Sin cambios en RLS ni migraciones**: los datos ya existen en `business_locations`.
- **Typecheck**: `bunx tsgo --noEmit` al final.

## Riesgos / no incluido

- No se implementa sincronización avanzada mapa↔lista (hover para resaltar). Queda para siguiente iteración.
- No se rediseña `TourismListingSurface`; en esta ruta usamos composición local para no forzar props nuevos globales.
- El modal no permite reservar directamente en esta iteración — sólo "Ver ficha completa" y "Agregar a mi viaje" (que ya cumple lo que pediste).

¿Apruebas para implementar?
