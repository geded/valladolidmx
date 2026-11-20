# Mapa de ruta con marca Valladolid.mx en la ficha de ruta

## Qué falta hoy

La ficha pública de una ruta (`/rutas/valladolid-ek-balam`) muestra portada, etiquetas, "Agregar a Mi Viaje" y la lista de paradas por día — **pero no tiene mapa**. El trazo vial con paradas ya existe y funciona en la portada; esta mejora lo reutiliza tal cual, sin componentes nuevos.

## Qué se va a hacer

Una sola mejora, dentro de la plantilla Premium ya aprobada de rutas:

1. **Mapa de la ruta dentro de la ficha**, justo antes del itinerario de paradas.
   - Mismo componente de mapa oficial que ya usa la portada (misma cartografía de marca, mismos pines).
   - Paradas en orden real publicado en el CMS, con letra (A, B, C…) que corresponde a la lista de abajo.
   - Trazo por carretera entre paradas; si el proveedor no responde, línea aproximada entre coordenadas publicadas; si tampoco hay, el mapa no se muestra (nunca se inventa una ubicación).

2. **Panel de marca con tiempos y distancia**, debajo del mapa.
   - Distancia total y tiempo en auto, tomados del mismo cálculo que ya hace el mapa.
   - Número de paradas y días de la ruta.
   - Cuando el trazo es aproximado, se indica con una nota discreta en vez de mostrar cifras falsas.

3. **Correlación lista ↔ mapa**.
   - Cada parada del itinerario muestra su letra; al tocarla, el mapa centra ese pin.
   - Etiqueta por tipo de parada (destino, lugar, empresa, evento) con los tonos semánticos del sistema de diseño, sin colores nuevos.

4. **Acción secundaria "Cómo llegar"**, al pie del panel, que abre la ruta con sus paradas en la app de mapas del visitante. Nunca como acción principal: la principal sigue siendo "Agregar a Mi Viaje".

## Qué se preserva

Hero, etiquetas, "Agregar a Mi Viaje", itinerario por días, enlaces de cada parada, breadcrumb, Alux, header/footer, SEO y JSON-LD de la ruta. No se toca la portada, ni la plantilla de destinos, ni el CMS.

## Detalle técnico

- `src/components/routes-premium/RoutePremiumSurface.tsx`: nueva sección `ruta-mapa` que monta `InteractiveMap` con los puntos de `route.stops` y consume `MapRouteStatus` (`mode`, `distanceMeters`, `durationSeconds`) para el panel.
- `src/lib/routes-editorial/route-public-contract.ts` / `route-public-reads.functions.ts`: exponer `lat`/`lng` acreditados por parada resolviendo `destinations`, `points_of_interest` y `businesses`, con la misma lógica ya escrita en `resolveRouteStopPoints` de `smart-blocks.server.ts` (se extrae a un helper compartido, no se duplica).
- Sin migraciones, sin tablas nuevas, sin llamadas de Maps adicionales fuera del componente oficial (el mapa sigue montándose sólo cuando el visitante lo pide).

## Validación

Typecheck, build y revisión visual en 1440 / 834 / 430 / 390 px sobre `/rutas/valladolid-ek-balam` y una ruta sin coordenadas completas. No se publica nada sin tu autorización.
