# Mapa del Oriente Maya — de lista de destinos a mapa territorial útil

Hoy `/mapa` sólo muestra tarjetas de destinos. La convertimos en una herramienta real de reconocimiento del territorio, sin crear plantillas nuevas: se reutilizan el mapa oficial (`InteractiveMap`), el cálculo de rutas ya existente y los datos de destinos del CMS (los 7 destinos ya tienen coordenadas reales).

## Qué se verá

1. **Mapa territorial con caminos desde Valladolid**
   Un mapa de marca (paleta Valladolid.mx) con un pin por destino y el trazo vial real Valladolid → cada destino, calculado con el servicio de rutas ya integrado. Si el proveedor no responde, se dibuja la línea aproximada, como ya hace el mapa oficial.

2. **Tabla/tarjetas de distancias y tiempos desde Valladolid**
   Para cada destino: kilómetros por carretera, tiempo estimado en auto y una etiqueta de "ida y vuelta en el día" o "conviene dormir allá". Datos reales del servicio de rutas, nunca inventados; si un destino no devuelve ruta, no se muestra cifra.

3. **Selector de origen**
   Por defecto Valladolid (base del territorio). El visitante puede elegir otro destino como origen o usar "mi ubicación" (con permiso), reutilizando el componente de geolocalización existente.

4. **Filtro por tiempo de traslado**
   Chips: hasta 30 min · hasta 1 h · hasta 2 h · más. Filtra pines y lista a la vez, para responder "qué alcanzo a ver hoy".

5. **Enlaces útiles por destino**
   Ver destino, "Cómo llegar" (Google Maps) y "Agregar a Mi Viaje", con la misma jerarquía de botones de las fichas Premium.

6. **Puente con Alux y Mi Viaje**
   Un acceso "Arma una ruta con estos destinos" que lleva a Arma tu Viaje conservando el contexto territorial, sin backend nuevo.

## Detalles técnicos

- Ruta afectada: `src/routes/mapa.tsx` (única superficie tocada) + un componente nuevo de sección en `src/components/discovery/`.
- Datos: `listPublishedDestinations()` (CMS) para pines y nombres.
- Rutas y métricas: server fn existente `computeRoute` (Routes API por gateway), cacheada por par origen/destino; sin claves nuevas.
- Mapa: `InteractiveMap` oficial con markers y capa de ruta ya soportada. Sin componentes V2/paralelos.
- La página sigue `noindex` como hoy; se preservan header, footer, breadcrumb, marca y tokens OMXDS.
- Verificación en 1440 / 834 / 430 / 390, un solo H1, sin desbordes, typecheck limpio.

## Fuera de alcance

Sin cambios en otras plantillas, sin nuevos modelos de datos, sin precios ni reservación, sin publicar.
