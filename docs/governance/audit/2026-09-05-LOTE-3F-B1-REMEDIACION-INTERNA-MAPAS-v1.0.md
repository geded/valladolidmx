# LOTE 3F-B1 · Remediación interna de mapas (v1.0)

Fecha: 2026-09-05 · Rama de trabajo: rama de edición sobre `integration/lovable-valladolidmx`
Alcance autorizado: sólo remediación interna en código. **No** se modificaron claves, allowlists,
APIs, cuotas, variables de entorno, dominios, datos, medios ni el diseño Premium aprobado.
No se crearon ramas, PR, fusiones ni despliegues. No se avanzó al Lote 3G.

---

## 1. Objetivos y resultado

| # | Objetivo autorizado | Resultado |
|---|---|---|
| 1 | Corregir la gestión multiinstancia de `gm_authFailure` | **PASS** |
| 2 | Fallback accesible `role="status"`, texto neutral, lista alternativa y enlaces seguros | **PASS** |
| 3 | Unificar el cargador del SDK usado por `InteractiveMap` y `LocationPickerMap` | **PASS** |
| 4 | Montar el mapa sólo cuando su panel es visible y con tamaño > 0 | **PASS** |
| 5 | Pruebas unitarias y de contrato | **PASS** (16/16) |
| 6 | Typecheck, build, suite oficial, Route Inventory, QA responsive | **PASS** |

Sin FAIL. Sin NO VERIFICADO.

---

## 2. Cambios exactos

### 2.1 `src/lib/maps/google-maps-loader.ts` (nuevo)

- Cargador único memoizado: una sola promesa y un solo `<script id="vmx-google-maps-js">`
  por documento, con `loading=async` + `callback=vmxInitGoogleMaps`, sin `mapId`.
- `gm_authFailure` se instala **una sola vez** y difunde el fallo a **todas** las instancias
  suscritas mediante `subscribeGoogleMapsAuthFailure(listener) => unsubscribe`. Antes, cada
  mapa reasignaba el hook global y la última instancia montada pisaba a las anteriores.
- Estado persistente `hasGoogleMapsAuthFailed()`: una instancia montada después del fallo
  recibe la notificación de inmediato (no queda con contenedor vacío).
- `getGoogleMapsBrowserKey()` centraliza la lectura de la clave de navegador; su valor nunca
  se registra ni se expone.
- `googleMapsPlaceUrl()` / `googleMapsDirectionsUrl()`: construcción de enlaces con
  coordenadas codificadas.
- `MAP_UNAVAILABLE_MESSAGE`: mensaje neutral único.

### 2.2 `src/components/maps/MapUnavailableFallback.tsx` (nuevo)

- `role="status"` + `aria-live="polite"` + `data-map-fallback="true"`.
- Texto neutral: no menciona dominio, clave, referer ni proveedor.
- Lista alternativa de puntos con etiqueta legible (`Ubicación N` cuando no hay título) y dos
  enlaces por punto: "Ver en Google Maps" y "Cómo llegar", ambos con `target="_blank"` y
  `rel="noopener noreferrer"`.
- Descarta coordenadas inválidas o `0,0`; nunca deja bloque vacío (siempre queda el aviso).

### 2.3 `src/components/maps/InteractiveMap.tsx`

- Elimina su cargador local duplicado y sus tipos globales; consume el cargador único.
- Suscripción/limpieza de `gm_authFailure` por instancia en un `useEffect` dedicado.
- Nuevo `useVisibleWithSize()`: `IntersectionObserver` (`rootMargin: 128px`) + `ResizeObserver`;
  el SDK sólo se descarga cuando el contenedor está visible y con `width > 0 && height > 0`.
  Expone `data-map-mounted` para auditoría.
- Cualquier fallo (clave ausente, error de red, autorización) renderiza el fallback accesible
  con los marcadores del propio mapa como lista alternativa.
- Diseño Premium intacto: mismos estilos de cartografía, marcadores, controles y clases.

### 2.4 `src/components/maps/LocationPickerMap.tsx`

- Migrado al cargador único (elimina el segundo cargador paralelo con el mismo `SCRIPT_ID`).
- Mismo montaje condicional por visibilidad y tamaño, y mismo fallback accesible.
- Comportamiento del editor sin cambios: pin arrastrable, click-to-set, sincronización externa.

### 2.5 Pruebas (nuevas)

- `scripts/maps/google-maps-loader.contract.test.ts` (10 pruebas).
- `scripts/maps/map-fallback.contract.test.tsx` (6 pruebas).

---

## 3. Archivos modificados

| Archivo | Tipo |
|---|---|
| `src/lib/maps/google-maps-loader.ts` | nuevo |
| `src/components/maps/MapUnavailableFallback.tsx` | nuevo |
| `src/components/maps/InteractiveMap.tsx` | modificado |
| `src/components/maps/LocationPickerMap.tsx` | modificado |
| `scripts/maps/google-maps-loader.contract.test.ts` | nuevo |
| `scripts/maps/map-fallback.contract.test.tsx` | nuevo |
| `docs/governance/audit/2026-09-05-LOTE-3F-B1-REMEDIACION-INTERNA-MAPAS-v1.0.md` | nuevo (este informe) |

---

## 4. Resultados exactos de verificación

| Verificación | Comando | Resultado |
|---|---|---|
| Typecheck | `bunx tsgo --noEmit` | exit 0, sin diagnósticos — **PASS** |
| Pruebas nuevas | `bun test scripts/maps` | 16 pass / 0 fail, 36 expect() — **PASS** |
| Suite oficial | `bun test` | **777 pass / 0 fail**, 5297 expect(), 73 archivos, 3.64 s — **PASS** |
| Route Inventory | `bun scripts/route-inventory-coverage.ts` | `✔ 246 rutas cubiertas` — **PASS** |
| Build completo | `bun run build` | exit 0; PWA precache 621 entradas (7804.79 KiB); `dist/server/wrangler.json` generado — **PASS** |

### 4.1 Cobertura de pruebas de contrato

| Caso exigido | Prueba | Resultado |
|---|---|---|
| Cargador único | crea un solo `<script>` con `loading=async`/callback y sin `mapId` | PASS |
| Múltiples instancias | tres suscripciones reciben el fallo (antes sólo la última) | PASS |
| Limpieza de suscripciones | `unsubscribe` reduce el contador y evita nuevas llamadas | PASS |
| Fallo simulado | `gm_authFailure()` marca el estado y notifica a instancias tardías | PASS |
| Fallback | `role="status"`, `aria-live`, texto neutral, lista de puntos, nunca vacío | PASS |
| Enlaces | ficha y "cómo llegar" con coordenadas codificadas, `rel="noopener noreferrer"` | PASS |
| Montaje condicional | SSR/pre-visibilidad rinde `data-map-mounted="false"` | PASS |
| Promesa compartida | llamadas concurrentes devuelven la misma promesa | PASS |

---

## 5. QA responsive (1440 / 834 / 430 / 390)

Superficies con mapa evaluadas: `/`, `/oriente-maya`, `/oriente-maya/destinos`,
`/oriente-maya/valladolid`, `/oriente-maya/valladolid/hoteles`,
`/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha`, `/hoteles`, `/lugares`, `/mapa`.

**36 casos (9 superficies × 4 anchos): 0 problemas.**

| Criterio | Resultado |
|---|---|
| HTTP 200 en todos los casos | PASS (36/36) |
| Desbordamiento horizontal | 0 px en 36/36 — PASS |
| Imágenes rotas | 0 en 36/36 — PASS |
| Páginas vacías | 0 (contenido de texto presente en 36/36) — PASS |
| Errores de consola nuevos | 0 — PASS |

Evidencia: `/tmp/browser/lote3fb1/qa.py`, `/tmp/browser/lote3fb1/qa.json`.

### 5.1 Comportamiento del mapa por escenario

| Escenario | Antes | Ahora | Resultado |
|---|---|---|---|
| Sandbox local (referer no autorizado) | contenedor con mensaje que citaba el "dominio de revisión"; a veces contenedor vacío | fallback `role="status"` con texto neutral y lista de puntos enlazada | PASS |
| Panel de mapa oculto en 390/834 (`hidden`/`xl:block`) | SDK descargado dentro de contenedor de tamaño 0, sin `gm_authFailure` y sin accesibilidad | `data-map-mounted="false"`, **sin descarga del SDK** | PASS |
| Panel visible con SDK autorizado (simulado interceptando `maps.googleapis.com/maps/api/js`) | — | `data-map-mounted="true"`, `data-ready="true"`, **un solo** `#vmx-google-maps-js`, mapa construido, 0 fallbacks, 0 px de desborde | PASS |

Evidencia: `/tmp/browser/lote3fb1/scroll.py` (fallback real en localhost) y
`/tmp/browser/lote3fb1/stub_sdk.py` (montaje real con SDK autorizado simulado, en 1440/834/390).
La verificación con SDK autorizado se realizó por interceptación local porque la allowlist de la
clave —cuya modificación no está autorizada en este lote— no incluye el sandbox.

---

## 6. Matriz PASS / FAIL / NO VERIFICADO

| Ítem | Estado |
|---|---|
| Gestión multiinstancia de `gm_authFailure` | PASS |
| Fallback accesible (`role="status"`, texto neutral, lista, enlaces seguros) | PASS |
| Cargador único compartido | PASS |
| Montaje condicional por visibilidad y tamaño | PASS |
| Pruebas unitarias y de contrato | PASS |
| Typecheck | PASS |
| Build completo | PASS |
| Suite oficial `bun test` | PASS |
| Route Inventory | PASS |
| QA responsive 1440/834/430/390 | PASS |
| Sin errores de consola nuevos / páginas vacías / imágenes rotas / desbordes | PASS |
| **FAIL** | ninguno |
| **NO VERIFICADO** | ninguno |

---

## 7. Nota documental sobre dominios (sin acción en este lote)

Registro sólo informativo, sin cambios aplicados: `valladolid.mx` será el dominio principal
definitivo; `www.valladolid.mx` redirigirá al principal; `quehacerenvalladolid.com` es el dominio
publicado actual; el preview de Lovable será independiente. Ningún dominio, DNS, allowlist ni
clave fue modificado en el Lote 3F-B1.

---

## 8. Cierre

Lote 3F-B1 **CERRADO** sin FAIL ni NO VERIFICADO. No se avanzó al Lote 3G ni a ninguna otra
remediación no autorizada.
