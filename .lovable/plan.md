# Google Maps — Primitivos + Demo

Construir 3 primitivos reutilizables usando las keys ya conectadas, y montarlos en la ficha de Empresa como demo funcional. Todo servidor-first para funcionar en `quehacerenvalladolid.com` sin depender del referrer de la browser key.

## Qué se entrega

### 1. Server functions (`src/lib/maps/*.functions.ts`)
- `geocodeAddress({ address })` → `{ lat, lng, formatted }` vía Geocoding API (gateway).
- `computeRoute({ originLat, originLng, destLat, destLng, mode? })` → `{ distanceMeters, durationSeconds, polyline }` vía Routes API v2 (`routes/directions/v2:computeRoutes`, gateway).
- `getStaticMapUrl({ lat, lng, zoom?, size?, marker? })` → URL firmada al gateway Static Maps para `<img>`. La URL apunta al gateway (no expone key), o al endpoint proxy `/api/public/maps/static` (opción B, mejor para custom domain).

### 2. Proxy de Static Maps (`src/routes/api/public/maps/static.ts`)
Endpoint público que hace stream de la imagen Static Maps desde el gateway server-side. Ventajas:
- No expone ni la browser key ni el token del gateway.
- Funciona idéntico en `*.lovable.app` y `quehacerenvalladolid.com`.
- Cachea con `Cache-Control: public, max-age=86400`.

Validación estricta: lat/lng numéricos, zoom 1–20, size ≤ 640x640, formato png|jpg.

### 3. Componentes UI (`src/components/maps/*`)
- `<StaticMap lat lng zoom? size? className? />` — `<img>` que apunta al proxy. SSR-safe, cero JS.
- `<DistanceBadge originLatLng destLatLng />` — muestra "a 4.2 km · 8 min en auto" con skeleton mientras carga vía `useSuspenseQuery(computeRoute)`.
- `<InteractiveMap lat lng markerTitle? className? />` — carga Maps JS (browser key), un `google.maps.Marker`, sin AdvancedMarker, `loading=async` + callback global. Cliente puro (dynamic import).

### 4. Demo en ficha de Empresa
En `src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` (o el componente que renderiza el detalle):
- Sección **Ubicación**: `<StaticMap>` grande + dirección + `<DistanceBadge>` (si el viajero compartió ubicación) + botón "Cómo llegar" (link a `https://www.google.com/maps/dir/?api=1&destination=lat,lng`).
- Toggle "Ver mapa interactivo" que monta `<InteractiveMap>` on-demand (evita cargar Maps JS por defecto).

## Detalles técnicos

- **Gateway URLs**:
  - Geocoding: `GET /google_maps/maps/api/geocode/json?address=...`
  - Static: `GET /google_maps/maps/api/staticmap?...`
  - Routes: `POST /google_maps/routes/directions/v2:computeRoutes` con `X-Goog-FieldMask: routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline`.
- **Headers gateway** (leer dentro del handler, nunca a nivel de módulo):
  - `Authorization: Bearer ${process.env.LOVABLE_API_KEY}`
  - `X-Connection-Api-Key: ${process.env.GOOGLE_MAPS_API_KEY}`
- **Interactive map**: script `https://maps.googleapis.com/maps/api/js?key=${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY}&loading=async&callback=vmxInitMap`. No `mapId`. Marker clásico.
- **Cache Query**: `computeRoute` y `geocodeAddress` con `staleTime: 24h` (coordenadas no cambian).
- **Ubicación del viajero**: hook `useVisitorGeolocation()` que pide `navigator.geolocation.getCurrentPosition` con consentimiento explícito; si no hay, `DistanceBadge` muestra CTA "Compartir mi ubicación".

## Validaciones al cerrar

1. `bunx tsgo --noEmit` → 0 errores.
2. `GET /api/public/health/maps` sigue devolviendo ok:true.
3. `GET /api/public/maps/static?lat=20.68&lng=-88.20&zoom=15` devuelve `image/png` HTTP 200.
4. En preview: la ficha de una empresa muestra mapa estático + botón "Cómo llegar" + distancia si comparto ubicación.
5. Toggle interactivo carga Maps JS sin errores de consola.

## Fuera de alcance (siguiente iteración)
- Autocomplete Places en CMS de Empresa (I2).
- Mapa de destino con múltiples pines (E7).
- Isochrones / matriz de distancias para "cerca de mí" en Marketplace.

## Rollback
Cada archivo es aditivo; revertir borrando `src/lib/maps/`, `src/components/maps/`, `src/routes/api/public/maps/`, y el bloque agregado a la ficha de empresa.

¿Procedo?