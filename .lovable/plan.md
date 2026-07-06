
# Explorador de categorías dentro del micrositio de destino

## Objetivo (Founder Experience)
Cuando el visitante está en `/oriente-maya/valladolid` y toca un chip del explorador (Hoteles, Restaurantes, Experiencias, etc.), NO debe salir del micrositio ni ver una avalancha de 100 tarjetas. Debe ver, **debajo del explorador**, un panel controlado que responde: "¿qué tipo?", "¿qué tan lejos?", "¿cuál elijo primero?".

## Reglas que se respetan (sin excepción)
- **DSL Colonial bloqueado**: sin nuevos tokens, tipografías ni colores.
- **Compatibility Evolution**: se reutiliza `TourismListingSurface`, `TourismCard`, facets, `useVisitorGeolocation` y `DistanceBadge` existentes. Cero componentes nuevos de listado.
- **Single Studio**: la configuración del panel (categorías visibles, orden, límite por página) se administra desde `DiscoveryNavigatorBlock` en el Experience Builder — no se hardcodea.
- **Founder Discovery Standard**: mismo patrón de listado que ya usan `/hoteles`, `/restaurantes`, etc.
- **Alux-ready**: el chip activo actualiza `contextRefs` (destino + categoría) para que Alux sepa qué está mirando el viajero.
- **Cero triplicación**: se elimina el listado paralelo del mapa y las tarjetas duplicadas de "Sigue descubriendo" cuando el explorador está activo.

## Comportamiento (UX)

1. **Chips del explorador** (Hoteles, Restaurantes, Casas, Experiencias, Qué hacer…): quedan como están arriba, pero al tocarse **NO navegan**. Solo actualizan un search param `?explora=hoteles` y hacen scroll suave al panel.
2. **Panel "Explorando: Hoteles en Valladolid"** debajo del explorador:
   - Sub-filtros contextuales (facets del surface): tipo de hotel (boutique, colonial, hostal, hacienda), rango de precio, servicios.
   - Orden por defecto: **más cercanos primero** cuando hay geolocalización; si no, "recomendados".
   - Tarjetas compactas (variant `compact` de `TourismCard`): foto pequeña, nombre, 1 línea de descripción, `DistanceBadge` ("a 1.2 km · 4 min a pie"), CTA discreto.
   - **Paginación real**: 8 por página en móvil, 12 en desktop, con "Cargar más" + navegación `?explora=hoteles&page=2`.
   - Estado vacío colonial: "Aún no hay hoteles registrados en Valladolid".
3. **Cuando hay categoría activa**: se ocultan los bloques `related-collection` que repiten esa misma categoría más abajo (evita triplicación).
4. **Cerrar categoría**: chip "✕ Ver todo el destino" restaura la vista narrativa completa.

## Cambios técnicos (mínimos)

### 1. `DiscoveryNavigator` (presentacional)
- Los chips reciben `onSelect(categorySlug)` en lugar de `href` cuando `mode="inline"`.
- Prop nueva `activeCategory` para marcar chip seleccionado (variant visual ya existente).

### 2. `DiscoveryNavigatorBlock` (EB wrapper)
- Nuevo `config.mode`: `"navigate"` (actual, default) | `"inline"` (nuevo).
- En `inline`: lee/escribe `?explora` con `useNavigate` + `useSearch`, y renderiza debajo `<InlineCategoryPanel />`.

### 3. `InlineCategoryPanel` (nuevo, presentacional, ~120 líneas)
- Reutiliza `TourismListingSurface` en modo embebido (sin Hero, sin breadcrumbs, sin badges).
- Recibe `destinationSlug` + `categorySlug` + `page`.
- Usa `useVisitorGeolocation` + orden por distancia si disponible.
- Paginación via search param `?page`.

### 4. Server fn `listTourismItemsByCategory`
- Ya existe base en `src/lib/catalog/category-related.functions.ts`. Se añade parámetro `page`, `pageSize`, `sortByDistance` (lat/lon opcional del visitante para calcular distancia server-side vía PostGIS `ST_Distance`).
- Devuelve `{ items: TourismCardVM[], totalCount, page, pageSize }`.

### 5. `DestinationSurface`
- Cuando `?explora` está presente, colapsa los `related-collection` de esa misma categoría (regla anti-triplicación).

### 6. Persistencia en EB
- El bloque `DiscoveryNavigatorBlock` gana campos editables en el Studio: `mode`, `pageSize`, `defaultSort`.

## No cambios
- No se toca DSL, tokens, tipografía.
- No se crean nuevas tarjetas ni nuevos Hero.
- No se toca la navegación del header ni las rutas `/hoteles`, `/restaurantes` (siguen funcionando como acceso global).
- No se toca `BusinessLocationPanel` ni la regla de geolocalización obligatoria.

## Alcance de esta entrega
Sub-ola única, una PR. Solo `DestinationSurface` + `DiscoveryNavigator(Block)` + nuevo `InlineCategoryPanel` + extensión del server fn de listado por categoría.

## Preguntas al Founder antes de implementar
1. ¿Confirmas **8 tarjetas por página en móvil / 12 en desktop** como default (editable en el Studio)?
2. ¿Orden por defecto: **distancia si hay GPS, "recomendados" si no**? ¿O prefieres "recomendados" siempre y distancia como opción manual?
3. ¿Confirmo que al activar una categoría se **colapsen los bloques `related-collection` duplicados** más abajo, para eliminar la triplicación?
4. ¿Alcance limitado a `DestinationSurface` en esta entrega (Regiones y otras superficies vienen después)?
