# LOTE 3F-PREFLIGHT · GOOGLE MAPS Y DOMINIOS · DIAGNÓSTICO READ-ONLY v1.0

- **Fecha:** 2026-09-05
- **Alcance:** preflight de diagnóstico autorizado por el Founder. **No se modificó** código, datos, medios, claves, allowlists, APIs, cuotas, variables, usuarios ni dominios. **No se declara el Lote 3F implementado.**
- **Estado auditado:** HEAD `50c16d8210385adccf9967080b5fb29e47f62eb3` · rama de edición `edit/edt-6c0d6c59-2830-438d-b88d-705ee34c0e2f` (estado correspondiente a `integration/lovable-valladolidmx`; la publicación de rama la realiza la plataforma) · árbol limpio (`git status --porcelain` = 0 líneas) antes y después del preflight (el único archivo nuevo es este informe).
- **Secretos:** ningún valor de clave se imprimió en consola, logs, capturas ni en este documento. Sólo se registran nombres de variables.

---

## 0. Resumen ejecutivo

1. **El `RefererNotAllowedMapError` NO se reproduce en producción.** En `https://quehacerenvalladolid.com` el SDK de Maps JavaScript carga, dibuja teselas y controles (zoom, pantalla completa) en 1440 y 390 sin ningún error de consola. El P0-1 del Lote 3D ("el mapa no carga fuera de `*.lovable.app`; afecta a dominio propio publicado") queda **corregido por evidencia**: la denegación observada proviene del origen `http://localhost:8080` (sandbox de QA/preview local), no del dominio propio.
2. **El preview de Lovable (`id-preview--fd89b51f-…lovable.app`) queda NO VERIFICADO**: responde `401 Unauthorized` sin sesión de Lovable y en este turno no había registros de consola/red del preview del Founder con peticiones a `maps.googleapis.com`. Verificación de 30 s propuesta en §8.
3. **`valladolid.mx` / `www.valladolid.mx` no son este proyecto**: sitio legado en Apache con certificado autofirmado (CN=valladolid.mx, sin SAN para `www`), contenido "Despierta en Valladolid" distinto al sitio Lovable y sin vínculo en `domain_status`. No deben entrar en ninguna allowlist hasta que se migren.
4. **Producción corre una build anterior a la rama de integración**: `/oriente-maya/destinos` devuelve 404 ("Destino no disponible") y la portada aún usa mapa estático + botón "Ver mapa interactivo". Esto no es un defecto de Maps; es contexto necesario para interpretar la evidencia.
5. **Propiedad de la clave de navegador: NO VERIFICADO.** La clave `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` conserva la misma terminación registrada el 5-jul-2026, cuando el Founder editó la conexión y pegó sus propias claves del proyecto Google Cloud `zaziltunich`; la clave de servidor sí cambió. Que producción funcione y `localhost` falle es consistente con una allowlist propia del Founder, pero sólo Google Cloud › Credenciales puede confirmarlo.
6. **Degradación actual: parcial.** Hay mensaje propio ("El mapa no está disponible en este dominio de revisión.") pero sin `role="status"`, sin lista alternativa de puntos en los mapas puros (`InteractiveMap` directo) y con un `gm_authFailure` global que sólo notifica al último mapa montado; en móvil, dos listados cargan el SDK con el contenedor oculto (coste sin beneficio). Corrección mínima definida en §6, **no implementada**.

---

## 1. Inventario de mapas

### 1.1 Componentes base (`src/components/maps/`)

| Archivo | Rol | Clave / origen de datos | Observaciones |
|---|---|---|---|
| `InteractiveMap.tsx` | Loader único del SDK (`SCRIPT_ID="vmx-google-maps-js"`, callback global `vmxInitGoogleMaps`, cola `window.__vmxGmapsCbList`), `google.maps.Map` + `google.maps.Marker`, `DirectionsService`/`DirectionsRenderer` cuando `connectByRoad`/`routeStops` | `import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (L273) | `gm_authFailure` (L279) → `setError("El mapa no está disponible en este dominio de revisión.")`; fallback en L404-410 (`div` con texto, sin `role`/`aria-live`) |
| `LocationPickerMap.tsx` | Selector de coordenadas del CMS (`BusinessLocationPanel`, `DestinationLocationPanel`) | misma clave; **loader duplicado** (L18-51) | Sólo superficies autenticadas |
| `StaticMap.tsx` | `<img src="/api/public/maps/static?…">` | sin clave en cliente | `onError` → "Mapa no disponible por ahora. Prueba Ver mapa interactivo." |
| `BusinessLocationBlock.tsx` | Estático por defecto + botón "Ver mapa interactivo"/"Ver mapa estático" + "Cómo llegar" | — | Degradación correcta |
| `DistanceBadge.tsx` + `useVisitorGeolocation` | "X km · Y min" | server function `computeRoute` | Sin SDK |

### 1.2 Lado servidor (nunca expone clave al navegador)

| Archivo | API de Google | Mecanismo |
|---|---|---|
| `src/routes/api/public/maps/static.ts` | Maps Static API | Proxy a `connector-gateway.lovable.dev/google_maps/maps/api/staticmap`; exige `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` (L41-45) |
| `src/lib/maps/maps.functions.ts`, `src/lib/maps/routes.server.ts` | Geocoding API, Routes API v2 (`routes/directions/v2:computeRoutes`) | Gateway, cabeceras `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $GOOGLE_MAPS_API_KEY` |
| `src/routes/api/public/health/maps.ts` | Diagnóstico Geocoding + Static + Routes | Protegido (admin/super_admin o `x-cron-secret`) |

### 1.3 Superficies que montan mapas

| Superficie / componente | Ruta pública | Modo | SDK al cargar |
|---|---|---|---|
| `HomePremiumSurface.tsx:959` (`ExperienceMapBlock interactiveOnly connectByRoad`) | `/` | Interactivo por defecto + Directions si ≥2 puntos | **Sí** |
| `RegionDestinationsPremiumSurface.tsx:284` | `/oriente-maya` | Interactivo por defecto | **Sí** |
| `DestinationsAtlasSurface.tsx:530` (+ `routeStops`) | `/oriente-maya/destinos` | Interactivo por defecto + Directions | **Sí** |
| `PremiumDiscoveryListingSurface.tsx:394` → `MapPanel` | `/oriente-maya/valladolid/hoteles` (familias por destino) | Interactivo; panel `hidden xl:block` + botón "Ver mapa" (<1280) | **Sí, incluso oculto** |
| `ListingPremiumSurface.tsx:218` (`mapSlot` → `TourismListingSurface`) | `/hoteles`, `/lugares`, listados globales | Interactivo sólo si hay coordenadas en el DTO; hoy `/hoteles` no las trae → sin mapa ni mensaje | No |
| `ListingMapHeader.tsx:39`, `InlineCategoryExplorer.tsx:227/429/464` | `/oriente-maya/$destino/$categoria` | Bajo demanda | No |
| `DestinationPremiumSurface.tsx:200`, `PlacePremiumSurface.tsx:226` (`ExperienceMapBlock`) | `/oriente-maya/valladolid`, perfiles de lugar | Estático + botón "Ver mapa interactivo" + lista "Puntos en el mapa" + enlaces "Cómo llegar" | No |
| `BusinessSurface.tsx:521` (`BusinessLocationBlock`) | perfiles de empresa/hotel | Estático + toggle | No |
| `composition-renderer.tsx:961-962`, `SmartTerritoryMap.tsx:46` | composiciones del Constructor | Estático + toggle | No |
| `cuenta/mi-viaje.tsx:1264` | autenticada | Interactivo | Sí (autenticada) |
| `routes/lovable/*-preview.tsx` (5 archivos) | previews internas | Variado | Interno |

### 1.4 APIs consumidas y paralelos

- **Cliente (clave de navegador):** Maps JavaScript API; Directions API (vía `DirectionsService` en portada, Atlas y Mi Viaje cuando hay ≥2 paradas). Sin Places/Autocomplete, sin AdvancedMarker, sin `libraries=`.
- **Servidor (clave de servidor vía gateway):** Geocoding, Maps Static, Routes v2. Diagnóstico ejecutado hoy con `x-cron-secret` (local): `geocoding.ok=true (200)`, `staticMaps.ok=true (image/png)`, `routes.ok=true (158 733 m · 6804 s)`.
- **Implementaciones paralelas:** un solo proveedor (Google). Dos loaders del SDK (`InteractiveMap`, `LocationPickerMap`). Fallbacks: mapa estático (proxy servidor), lista de puntos (`ExperienceMapBlock`), enlaces `google.com/maps/dir` (9 archivos) y `maps/search` (Alux).
- **CSP:** no existe cabecera/meta `Content-Security-Policy` en `src/`, `index.html` ni `vite.config.ts`; no hay bloqueo por CSP.

### 1.5 Carga de la clave y configuración

- Conector: `std_01kvrm7h4retgv99px8a2rmnas` ("Armando's Google Maps Platform", `google_maps`, `auth_type=api_key`, gateway `https://connector-gateway.lovable.dev`).
- Variables presentes en sandbox: `LOVABLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, `EB_CRON_SECRET`; `.env` contiene `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` (39 caracteres) y `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`. Ausentes: `GOOGLE_MAPS_API_KEY_2`. El `TRACKING_ID` **no se envía** como `channel` en el loader (no requerido para BYOK; sólo aplica a conexión gestionada).
- Clave de navegador y de servidor son distintas (terminaciones distintas, sin imprimir).

---

## 2. Dominios y entornos · matriz por URL

| URL | Clasificación | Evidencia | Referer que produciría | Resultado del mapa | Causa | Corrección propuesta |
|---|---|---|---|---|---|---|
| `https://quehacerenvalladolid.com/` | **PRODUCCIÓN** | `domain_status`: active/connected, `project_published: true`; Cloudflare 185.158.133.1; `valladolidmx.lovable.app` → 301 aquí; título "Valladolid.mx · Despierta en el Oriente Maya" | `https://quehacerenvalladolid.com/…` | **PASS** — SDK carga, `.gm-style`=1, 19 teselas (1440) / 10 (390), zoom+pantalla completa, 0 errores de consola (`/oriente-maya/valladolid/hoteles`) | Referer permitido por la clave | Mantener en allowlist exacta |
| `https://www.quehacerenvalladolid.com/` | **PRODUCCIÓN (alias, 301 → apex)** | `curl -I` → 301 `Location: https://quehacerenvalladolid.com/`; `domain_status` active | Nunca renderiza documento (redirige) | N/A | — | No requerido; opcional por robustez |
| `https://valladolidmx.lovable.app/` | **Alias de publicación Lovable (301 → producción)** | `curl -I` → 301 a `https://quehacerenvalladolid.com/` | Nunca renderiza documento | N/A | — | No requerido |
| `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/` | **PREVIEW de Lovable** (patrón `id-preview--<project-id>`; requiere sesión) | HTTP 401 "Unauthorized" sin sesión; `project--fd89b51f-….lovable.app` → 403 | `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/…` | **NO VERIFICADO** (sin acceso autenticado desde el sandbox; sin registros de consola/red del preview con `maps.googleapis.com` en este turno). Evidencia histórica no reverificada: 5-jul-2026 el mapa interactivo se validó en preview con la misma clave | Depende de la allowlist actual | Incluir en allowlist exacta (§4.3) y verificar con el paso de 30 s (§8) |
| `http://localhost:8080/` (sandbox de QA / preview local) | **DESARROLLO** | Servidor Vite local | `http://localhost:8080/…` | **FAIL controlado** — `RefererNotAllowedMapError` en `/`, `/oriente-maya`, `/oriente-maya/destinos`, `/oriente-maya/valladolid/hoteles` (1440) y en los toggles; fallback propio visible | Origen no permitido por la clave | Opcional: `http://localhost:8080/*` sólo si se desea QA automatizada del mapa en sandbox |
| `https://valladolid.mx/` | **NO ES ESTE PROYECTO (sitio legado externo)** | TLS error 18 (autofirmado; C=MX, CN=valladolid.mx, sin SAN); `http://` → 302 Apache a `https://`; con `-k` responde 200 Apache, 73 633 bytes, "Despierta en Valladolid", huella social; **no aparece** en `domain_status` | — | N/A | No añadir a la allowlist; migración de dominio es decisión separada (fuera de 3F) |
| `https://www.valladolid.mx/` | **NO ES ESTE PROYECTO** | TLS error 1 (el certificado sólo cubre `valladolid.mx`) | — | N/A | Ídem |

**Referers exactos observados:**
- Producen `RefererNotAllowedMapError`: `http://localhost:8080/` (todas las superficies con SDK visible).
- El mapa sí carga: `https://quehacerenvalladolid.com/` (1440 y 390).
- Sin observación posible: `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/` (401).

**Sonda sintética de Referer (descartada como evidencia):** se intentó reescribir la cabecera `Referer` en Playwright para 5 orígenes; el resultado fue idéntico en todos (error), incluido el control, y no hubo llamada a `AuthenticationService` (la v3.66 valida en `maps/api/js` + `GetViewportInfo`). Se clasifica **NO CONCLUYENTE** y no se usa para inferir la allowlist.

---

## 3. Configuración y seguridad

| Aspecto | Estado | Clasificación |
|---|---|---|
| Restricciones HTTP referrer de la clave de navegador | No inspeccionables desde Lovable (sólo Google Cloud Console). Inferencia empírica: **permite** `quehacerenvalladolid.com`, **deniega** `localhost:8080` | **NO VERIFICADO** (lista exacta) |
| APIs autorizadas en la clave de navegador | Maps JavaScript API funciona en producción. Directions API (necesaria para `connectByRoad`/`routeStops` en portada, Atlas y Mi Viaje) no pudo probarse: producción no sirve aún esas superficies | Maps JS: **PASS** · Directions: **NO VERIFICADO** |
| APIs autorizadas en la clave de servidor | Geocoding 200, Static 200 image/png, Routes 200 (health endpoint, hoy) | **PASS** |
| Exposición de secretos | Clave de servidor sólo en servidor/gateway; clave de navegador en bundle por diseño (protección = referrer + restricción de API). Health endpoint protegido. Ningún valor impreso | **PASS** |
| Propiedad de la clave de navegador (BYOK vs gestionada) | Misma terminación que la detectada el 5-jul-2026 tras editar la conexión; clave de servidor sí cambió. Producción funciona (incompatible con una allowlist sólo `*.lovable.app`) | **NO VERIFICADO** — confirmar en Google Cloud › Credenciales (proyecto `zaziltunich`) |
| Amplitud de la allowlist | La lista entregada el 29-ago (G8-R1-F1A) incluía `https://*.lovable.app/*` (comodín global: permitiría a cualquier proyecto Lovable consumir cuota). Si se aplicó, es **demasiado amplia**; si no, es **insuficiente** para el preview. Contiene además `valladolidmx.lovable.app` y `www` (obsoletos: sólo redirigen) | **FAIL de diseño** (pendiente de confirmar aplicación) |
| Cuotas / protección contra abuso | No visible desde Lovable | **NO VERIFICADO** |
| Aislamiento preview/producción | Hoy una sola clave de navegador para ambos entornos (`VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` se resuelve igual en preview y producción) | Recomendación de separación en §4.3 |

### 3.1 Allowlist mínima exacta recomendada (sin comodines globales)

**Opción A — clave única (mínimo viable, sin cambio de código):**
```text
https://quehacerenvalladolid.com/*
https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/*
```
Opcional (sólo si se quiere QA automatizada del mapa en sandbox): `http://localhost:8080/*`.
Excluir explícitamente: `https://*.lovable.app/*`, `*.lovableproject.com`, `https://www.quehacerenvalladolid.com/*` (301), `https://valladolidmx.lovable.app/*` (301), `valladolid.mx` y `www.valladolid.mx`.

**Opción B — aislamiento por entorno (recomendada para producción):**
- Clave `browser-prod`: `https://quehacerenvalladolid.com/*` · APIs: Maps JavaScript API + Directions API.
- Clave `browser-preview`: `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/*` (+ `http://localhost:8080/*` opcional) · mismas APIs.
- Requiere en código una selección por `window.location.hostname` en el loader (ver §7-B2). Ambas claves viven en el bundle; cada una sólo sirve en su origen. Cuotas y alertas separables por clave.

**Restricción de API recomendada:** clave de navegador → sólo Maps JavaScript API (+ Directions API mientras `connectByRoad` siga en cliente); retirar Static/Geocoding de la clave de navegador (ya van por servidor). Clave de servidor → Geocoding, Maps Static, Routes; sin restricción de referrer (uso servidor) y **nunca** en variables `VITE_*`.

---

## 4. Degradación elegante (estado actual)

| Situación | Qué ocurre hoy | Evaluación |
|---|---|---|
| Referer no permitido (`gm_authFailure`) | `InteractiveMap` sustituye el contenedor por un `div` con "El mapa no está disponible en este dominio de revisión." | Mensaje visible y propio (sin tarjeta gris de Google) ✔ · sin `role="status"`/`aria-live` ✘ · texto orientado a "dominio de revisión" (en producción sería engañoso) ✘ · sin enlace alternativo ("Cómo llegar"/lista) en mapas puros ✘ |
| Varios mapas en la misma página | `gm_authFailure` es una asignación global: sólo el último mapa montado recibe el error; los demás quedan como contenedor vacío `data-ready="true"` sin teselas | ✘ (observado en `/oriente-maya/valladolid/hoteles` 1440: `dataReady=[null]` + fallback único) |
| Contenedor oculto (<1280 px) en `PremiumDiscoveryListingSurface` y Atlas móvil | El SDK se descarga igualmente (8 peticiones a `maps.googleapis.com`), no dispara error ni fallback porque el mapa no se renderiza; al pulsar "Ver mapa" el contenedor mide 0×0 en 390 | ✘ coste sin beneficio; P2 |
| `ExperienceMapBlock` (destino, lugar, composiciones) | Estático + lista "Puntos en el mapa" (21 en `/oriente-maya/valladolid`) + 7 enlaces "Cómo llegar"; toggle a interactivo | ✔ patrón de referencia |
| `BusinessLocationBlock` (perfiles) | Estático + toggle + "Cómo llegar" | ✔ |
| Listado global sin coordenadas (`/hoteles`) | Sin `mapSlot` → sin mapa, sin bloque vacío, sin mensaje | Aceptable (no hay bloque vacío) pero se pierde descubrimiento por mapa; P2 de datos (coordenadas en DTO) |
| Mapa estático (proxy) falla | Texto "Mapa no disponible por ahora. Prueba Ver mapa interactivo." | ✔ (hoy el proxy responde 200) |

### 4.1 Corrección mínima necesaria (definida, **no implementada**)

1. `InteractiveMap.tsx`: registrar `gm_authFailure` una sola vez y notificar a **todas** las instancias montadas (mismo patrón de cola que `__vmxGmapsCbList`); fallback con `role="status"` y texto neutro ("El mapa interactivo no está disponible en este momento.") + enlace "Abrir en Google Maps" (`maps/dir`) al primer marcador.
2. `PremiumDiscoveryListingSurface.tsx` y `DestinationsAtlasSurface.tsx`: montar `InteractiveMap` sólo cuando el panel es visible (`showMapMobile || ≥ xl`), evitando descargar el SDK con el contenedor oculto; en `MapPanel`, mostrar la lista de puntos con enlaces como alternativa cuando `error` esté activo.
3. Unificar el loader de `LocationPickerMap.tsx` con el de `InteractiveMap.tsx` (una sola función `loadGoogleMapsScript`).
Todo ello mantiene composición, tipografía y diseño Premium (sólo estados de error y montaje condicional).

---

## 5. Evidencia

### 5.1 Local (`http://localhost:8080`, Playwright headless, HEAD `50c16d8`) · 9 rutas × 4 anchos = 36 casos

Columnas: ancho · ruta · HTTP · script SDK · `.gm-style` · error consola · fallback visible · mapa estático · puntos listados · enlaces "Cómo llegar" · toggles · overflow px · imágenes rotas.

| W | Ruta | HTTP | SDK | gm | Err | FB | Est. | Ptos | Dir | Toggle | Ovf | Img |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1440 | `/` | 200 | present | 0 | sí | sí | – | 6 | 0 | — | 0 | 0 |
| 1440 | `/oriente-maya` | 200 | present | 0 | sí | sí | – | 0 | 0 | — | 0 | 0 |
| 1440 | `/oriente-maya/destinos` | 200 | present | 0 | sí | sí | – | 0 | 0 | — | 0 | 0 |
| 1440 | `/oriente-maya/valladolid` | 200 | none | 0 | no | no | ok | 21 | 7 | Ver mapa interactivo | 0 | 0 |
| 1440 | `/oriente-maya/valladolid/hoteles` | 200 | present | 0 | sí | sí | – | 0 | 0 | Ver mapa | 0 | 0 |
| 1440 | `/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha` | 200 | none | 0 | no | no | ok | 0 | 1 | Ver mapa interactivo | 0 | 0 |
| 1440 | `/hoteles` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 1440 | `/lugares` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 1440 | `/mapa` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 834 | `/` | 200 | present | 0 | sí | sí | – | 6 | 0 | — | 0 | 0 |
| 834 | `/oriente-maya` | 200 | present | 0 | sí | sí | – | 0 | 0 | — | 0 | 0 |
| 834 | `/oriente-maya/destinos` | 200 | present (oculto) | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 834 | `/oriente-maya/valladolid` | 200 | none | 0 | no | no | ok | 21 | 7 | Ver mapa interactivo | 0 | 0 |
| 834 | `/oriente-maya/valladolid/hoteles` | 200 | present (oculto) | 0 | no | no | – | 0 | 0 | Ver mapa | 0 | 0 |
| 834 | `…/hotel-casa-tia-micha` | 200 | none | 0 | no | no | ok | 0 | 1 | Ver mapa interactivo | 0 | 0 |
| 834 | `/hoteles` · `/lugares` · `/mapa` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 430 | `/` · `/oriente-maya` | 200 | present | 0 | sí | sí | – | 6 / 0 | 0 | — | 0 | 0 |
| 430 | `/oriente-maya/destinos` · `…/valladolid/hoteles` | 200 | present (oculto) | 0 | no | no | – | 0 | 0 | — / Ver mapa | 0 | 0 |
| 430 | `/oriente-maya/valladolid` · `…/hotel-casa-tia-micha` | 200 | none | 0 | no | no | ok | 21 / 0 | 7 / 1 | Ver mapa interactivo | 0 | 0 |
| 430 | `/hoteles` · `/lugares` · `/mapa` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |
| 390 | `/` · `/oriente-maya` | 200 | present | 0 | sí | sí | – | 6 / 0 | 0 | — | 0 | 0 |
| 390 | `/oriente-maya/destinos` · `…/valladolid/hoteles` | 200 | present (oculto) | 0 | no | no | – | 0 | 0 | — / Ver mapa | 0 | 0 |
| 390 | `/oriente-maya/valladolid` · `…/hotel-casa-tia-micha` | 200 | none | 0 | no | no | ok | 21 / 0 | 7 / 1 | Ver mapa interactivo | 0 | 0 |
| 390 | `/hoteles` · `/lugares` · `/mapa` | 200 | none | 0 | no | no | – | 0 | 0 | — | 0 | 0 |

Error de consola exacto (único, sin otros errores introducidos): `Google Maps JavaScript API error: RefererNotAllowedMapError https://developers.google.com/maps/documentation/javascript/error-messages#referer-not-allowed-map-error`. Overflow horizontal: **0 px en 36/36**. Imágenes rotas: **0**.

**Toggles (local):** `…/hotel-casa-tia-micha` 1440/390 "Ver mapa interactivo" → SDK carga, `gm_authFailure`, fallback visible ✔. `/oriente-maya/valladolid` 390 → ídem ✔ (1440: el botón no se resolvió de forma estable en el script; NO CONCLUYENTE). `/oriente-maya/valladolid/hoteles` 390 "Ver mapa" → contenedor 0×0 (P2 §4). `/hoteles`: sin `aside[aria-label="Mapa del listado"]` en 1440 ni tras pulsar en 390 → confirma ausencia de `mapSlot` por falta de coordenadas.

### 5.2 Producción (`https://quehacerenvalladolid.com`, 1440 y 390)

| W | Ruta | HTTP | SDK | `.gm-style` | Teselas | Controles | Err | Fallback | Estático | Ovf |
|---|---|---|---|---|---|---|---|---|---|---|
| 1440 | `/` | 200 | none | 0 | – | toggle "Ver mapa interactivo" | no | no | ok (1280 px) | 0 |
| 1440 | `/oriente-maya/destinos` | **404** "Destino no disponible" (build anterior) | none | 0 | – | – | no | no | – | 0 |
| 1440 | `/oriente-maya/valladolid/hoteles` | 200 | present | **1** | **19** | zoom 1 · pantalla completa 1 | **no** | no | – | 0 |
| 1440 | `/oriente-maya/valladolid` | 200 | none | 0 | – | toggle | no | no | ok | 0 |
| 390 | `/` | 200 | none | 0 | – | toggle | no | no | ok | 0 |
| 390 | `/oriente-maya/destinos` | **404** | none | 0 | – | – | no | no | – | 0 |
| 390 | `/oriente-maya/valladolid/hoteles` | 200 | present | **1** | **10** | zoom 1 · pantalla completa 1 | **no** | no | – | 0 |
| 390 | `/oriente-maya/valladolid` | 200 | none | 0 | – | toggle | no | no | ok | 0 |

Captura del elemento de mapa en producción: `/tmp/browser/lote3f/shots/prod_1440_hoteles_mapa_element.png` y `prod_390_hoteles_mapa_element.png` (teselas de Valladolid con vialidades y POIs de Google; marcador "A").

### 5.3 Artefactos (fuera del repositorio, no versionados)

`/tmp/browser/lote3f/maps_local.py`, `maps_prod.py`, `maps_toggle.py`, `prod_map_shot.py`, `hoteles_check.py`, `referer_probe.py` (descartado), `results_local.json` (36), `results_prod.json` (8), `toggle_local.json` (10), `health_maps.json` (sin claves), `shots/local_*`, `shots/prod_*`.

---

## 6. Inventario de archivos/componentes afectados por la remediación 3F

| Archivo | Cambio previsto (3F, pendiente de autorización) |
|---|---|
| `src/components/maps/InteractiveMap.tsx` | `gm_authFailure` multi-instancia; fallback accesible neutro + enlace externo; (Opción B) selección de clave por hostname |
| `src/components/maps/LocationPickerMap.tsx` | Reutilizar el loader de `InteractiveMap` |
| `src/components/listing-premium/PremiumDiscoveryListingSurface.tsx` | Montaje condicional del `MapPanel` (visible) + lista alternativa en error |
| `src/components/destination-premium/DestinationsAtlasSurface.tsx` | Montaje condicional en móvil (mismo criterio) |
| `src/components/experience-builder/blocks/experience-map/ExperienceMapBlock.tsx` | Sin cambio funcional; reutilizar su lista como alternativa en `MapPanel` |
| `scripts/` (nuevo test de contrato) | Impedir `https://*.lovable.app` o comodines en documentación de allowlist; asegurar un único loader y que no exista `GOOGLE_MAPS_API_KEY` en `VITE_*` |

---

## 7. Propuesta de remediación cerrada

**A · Requiere acceso externo a Google Cloud (Founder, proyecto `zaziltunich`) — no lo puede hacer Lovable:**
- A1. Confirmar propiedad de la clave de navegador (Credenciales → clave cuya terminación coincide con la registrada el 5-jul-2026).
- A2. Aplicar la allowlist exacta de §3.1 (Opción A o B). Eliminar `https://*.lovable.app/*`, `*.lovableproject.com`, `www`, `valladolidmx.lovable.app`, y cualquier dominio de `valladolid.mx`.
- A3. Restringir APIs: clave de navegador → Maps JavaScript API (+ Directions API); clave de servidor → Geocoding, Maps Static, Routes.
- A4. (Opción B) crear la segunda clave de navegador y cargarla como variable `VITE_GOOGLE_MAPS_BROWSER_KEY_PREVIEW` (nombre propuesto) en el proyecto; la clave de producción permanece en `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`.
- A5. Fijar cuotas diarias y alertas de facturación por clave (no visibles desde Lovable).

**B · Lo resuelve Lovable en código (Lote 3F, tras autorización):**
- B1. Corrección mínima de degradación (§4.1, tres puntos).
- B2. (Sólo Opción B) `resolveBrowserKey()` en el loader: si `hostname` termina en `.lovable.app` o es `localhost` → clave preview; en otro caso → clave producción; sin imprimir claves; test unitario.
- B3. Test de contrato: un único loader de SDK; ninguna variable `VITE_*` contiene la clave de servidor; ausencia de comodines globales en la documentación de allowlist.
- B4. QA responsive 1440/834/430/390 en las 9 superficies + verificación en preview autenticado y producción tras A2.

**Orden:** A1→A2→A3 (Founder) → verificación de 30 s en preview → B1/B3 (+ B2 si Opción B) → B4. Sin A2, el preview de Lovable seguirá dependiendo de la allowlist actual (NO VERIFICADO).

---

## 8. Verificación de 30 s solicitada al Founder (preview de Lovable)

Abrir en el preview `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app/oriente-maya/destinos` a ≥1280 px, abrir la consola del navegador y observar: (a) si aparece `RefererNotAllowedMapError` → el origen del preview **no** está en la allowlist; (b) si el mapa dibuja teselas sin error → sí está. Con ese dato se cierra la fila NO VERIFICADO de §2 sin exponer ninguna clave.

---

## 9. Matriz de clasificación

| Verificación | Resultado |
|---|---|
| Inventario de superficies, componentes, loaders y APIs | **PASS** |
| Mecanismo de carga de clave sin exponer secretos | **PASS** |
| Clasificación `quehacerenvalladolid.com` = producción | **PASS** (evidencia `domain_status` + redirecciones + contenido) |
| Mapa en producción (`quehacerenvalladolid.com`) | **PASS** (1440 y 390, sin error) |
| Clasificación `id-preview--fd89b51f-…lovable.app` = preview | **PASS** (patrón + 401) · resultado del mapa **NO VERIFICADO** |
| `valladolid.mx` / `www.valladolid.mx` | **PASS** como "no es este proyecto"; mapa N/A |
| Referer `http://localhost:8080` | **FAIL controlado** (denegado; fallback visible) |
| Clave de servidor: Geocoding/Static/Routes | **PASS** |
| Directions API en clave de navegador | **NO VERIFICADO** |
| Lista exacta de referrers y APIs en Google Cloud | **NO VERIFICADO** (sin acceso de lectura desde Lovable) |
| Cuotas / abuso | **NO VERIFICADO** |
| Allowlist previa (29-ago) sin comodines globales | **FAIL de diseño** (contenía `https://*.lovable.app/*`) |
| Degradación elegante: mensaje visible, sin bloque vacío | **PASS parcial** (mensaje sí; accesibilidad, multi-instancia y alternativa en mapas puros: **FAIL**) |
| Overflow 0 / imágenes rotas 0 / sin errores nuevos de consola (36 casos locales + 8 producción) | **PASS** |
| Código, datos, claves, allowlists, variables, dominios sin modificar | **PASS** |
| Lote 3F implementado | **NO** (sólo preflight) |

---

## 10. Límites respetados

No se modificaron claves, allowlists, APIs, cuotas, variables, código, datos, medios, usuarios ni dominios. No se publicó, desplegó, creó PR, fusionó ni tocó `main`, pagos, reservaciones, monitoreo o flags. No se avanzó a la remediación 3F ni al Lote 3G. La única escritura es este informe.
