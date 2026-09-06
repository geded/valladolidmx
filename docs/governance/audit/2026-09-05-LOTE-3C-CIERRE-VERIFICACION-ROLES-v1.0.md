# Lote 3C · Cierre definitivo — Verificación autenticada por rol y correcciones finales

Fecha: 2026-09-05 · Rama: `integration/lovable-valladolidmx`

## 1. Matriz por requisito

| # | Requisito | Resultado | Evidencia |
|---|---|---|---|
| R1 | Dock "Mi Viaje" sin desajuste de hidratación | PASS | `FloatingTravelPlanDock.tsx` monta tras hidratar; consola sin errores |
| R2 | `/arma-tu-viaje` nunca vacía | PASS (causa raíz corregida) | Ver §2 |
| R3 | Alux con contexto en `/rutas/*` y `/casas-de-vacaciones` | PASS | `AluxFloatingTrigger.tsx:117-121` |
| R4 | Contexto territorial de ruta (región + destino + paradas + meta) | PASS | `rutas.$slug.tsx` (`buildRouteContext`) |
| R5 | Persistencia de ruta en Mi Viaje tras recarga | PASS | IndexedDB `current_trip` con `kind:"route"`, slug e imagen firmada |
| R6 | Sin desbordamiento horizontal 1440/430 | PASS | 8 rutas × 2 anchos, `scrollWidth-clientWidth = 0` |
| R7 | Typecheck / Build / Suite | PASS | `tsgo --noEmit` limpio · `bun test`: 761 pass, 0 fail |

## 2. Hallazgo y corrección de causa raíz (R2)

La composición publicada de `/arma-tu-viaje` sí contenía el bloque
`vmx.surface.trip-planner`, pero ese contrato —junto con
`vmx.surface.marketplace` y `vmx.surface.alux`— estaba **declarado y nunca
registrado** en `INITIAL_BLOCK_LIBRARY_SOURCE`. `getBlock()` devolvía
`undefined` y el renderizador de producción omitía el nodo en silencio: la
página quedaba vacía. Corrección aditiva: registrar los tres contratos
singleton. Sin nuevos motores, modelos ni rutas.

## 3. Verificación autenticada por rol (Data API real, tokens de sesión)

Cuentas temporales creadas y **eliminadas al cierre** (`auth.users` restantes
con prefijo `lote3c.`: 0). Sesiones mintadas con `lovable auth-session`.

### business_owner (dueño de "Casa Colonial Sisal")

| Prueba | Esperado | Resultado |
|---|---|---|
| Leer su ficha | permitido | PASS |
| Editar su ficha (tagline) + persistencia | permitido | PASS (revertido) |
| Editar ficha ajena | 0 filas | PASS |
| Cambiar `verified` / `status` / `can_self_publish` / `published_at` | bloqueado | PASS (`42501 reserved_field:*`) |
| Crear/editar rutas editoriales | denegado | PASS (RLS) |
| Leer borradores ajenos | 0 filas | PASS |
| Auto-otorgarse posicionamiento (`business_visibility_grants`) | denegado | PASS (RLS) |

### concierge

| Prueba | Esperado | Resultado |
|---|---|---|
| Editar fichas de empresa | 0 filas | PASS |
| Editar rutas editoriales | 0 filas | PASS |
| Leer borradores | 0 filas | PASS |
| Leer perfiles ajenos | sólo el propio | PASS |
| Auto-asignarse rol admin | denegado | PASS (RLS) |

### anónimo

| Prueba | Resultado |
|---|---|
| Ver sólo fichas publicadas | PASS |
| Leer borradores | PASS (0 filas) |
| Escribir en `businesses` | PASS (0 filas) |

## 4. Archivos modificados en esta vuelta

- `src/lib/experience-builder/block-library.ts` — registro de los tres bloques de superficie singleton.
- (Vueltas previas del Lote 3C) `FloatingTravelPlanDock.tsx`, `arma-tu-viaje.tsx`, `AluxFloatingTrigger.tsx`, `rutas.$slug.tsx`.

## 5. Datos temporales

Cuentas, roles y membresías temporales eliminados. Los datos DEMO aprobados
(casas y rutas) permanecen intactos conforme a la Demo Pack Policy.

---

## 6. Cierre técnico final (2026-09-04, ejecución real)

### 6.1 Gates ejecutados

| Gate | Comando | Resultado exacto |
|---|---|---|
| Typecheck | `bunx tsgo --noEmit` | exit 0, sin salida (limpio) |
| Build | `bun run build` | exit 0 · `✓ built in 3.36s` · PWA `precache 619 entries (7813.53 KiB)` · `dist/sw.js` + `wrangler.json` + `dist/client/_headers` generados |
| Suite | `bun test` | `761 pass · 0 fail · 5318 expect() calls · 71 files · 3.57s` |

### 6.2 QA responsive — 7 superficies × 4 anchos (28 casos)

Medición: `documentElement.scrollWidth - clientWidth`, longitud de texto
renderizado y número de controles interactivos, tras hidratación.

| Superficie | 1440 | 834 | 430 | 390 |
|---|---|---|---|---|
| `/arma-tu-viaje` | 200 · ov0 · 1839c · 31 ctl | 200 · ov0 · 1733c | 200 · ov0 · 1708c | 200 · ov0 · 1708c |
| `/rutas` | 200 · ov0 · 1268c · 40 ctl | 200 · ov0 · 1140c | 200 · ov0 · 1104c | 200 · ov0 · 1104c |
| `/rutas/valladolid-ek-balam` | 200 · ov0 · 1316c · 42 ctl | 200 · ov0 · 1210c | 200 · ov0 · 1155c | 200 · ov0 · 1155c |
| `/casas-de-vacaciones` | 200 · ov0 · 1974c · 51 ctl | 200 · ov0 · 1686c | 200 · ov0 · 1152c | 200 · ov0 · 1152c |
| `/oriente-maya/valladolid/casas-de-vacaciones/casa-colonial-sisal` | 200 · ov0 · 2081c · 45 ctl | 200 · ov0 · 1975c | 200 · ov0 · 1921c | 200 · ov0 · 1921c |
| `/alux` | 200 · ov0 · 1524c · 35 ctl | 200 · ov0 · 1404c | 200 · ov0 · 1378c | 200 · ov0 · 1378c |
| `/marketplace` (301 → `/oriente-maya`) | 200 · ov0 · 2113c · 56 ctl | 200 · ov0 · 2007c | 200 · ov0 · 1982c | 200 · ov0 · 1982c |

Overflow horizontal máximo observado en los 28 casos: **0 px**. Todas las
superficies presentan contenido y controles operables en los cuatro anchos.

### 6.3 Verificación por interfaz del Portal Empresa (no Data API)

Cuenta temporal `lote3c.ui.tmp@example.com`
(`4d65a7fe-42b8-420a-b01f-b4f35cabe593`), rol `business_owner`, vínculo
`business_users.owner` sobre `casa-colonial-sisal`.

| Paso | Resultado |
|---|---|
| `/portal/ficha` carga con empresa activa "Casa Colonial Sisal" | PASS (`Tu rol: propietario · Estado: published`) |
| Editar campo permitido `tagline` y pulsar "Guardar cambios" | PASS |
| Recargar y observar persistencia | PASS (`…zócalo de Valladolid · QA3C`) |
| Restaurar valor exacto original | PASS (`Casa privada colonial a 3 cuadras del zócalo de Valladolid`, confirmado en BD) |
| Eliminar vínculo, rol y cuenta temporal | PASS (`auth.users like 'lote3c.%'` → 0) |

No se repitieron pruebas RLS ya documentadas: esta verificación no reveló
ningún fallo nuevo.

### 6.4 Estado del repositorio

- Rama efectiva de trabajo del entorno: `edit/edt-e5d84a85-5143-4403-a27c-db5d5923a24e`
  (rama de edición gestionada por la plataforma; la integración a
  `integration/lovable-valladolidmx` la realiza la plataforma al aplicar los
  cambios; el agente no ejecuta git de estado).
- SHA base del árbol verificado: `7a8c640bc9ebae13ebf7f441e010866110a9d70f`.
- Árbol limpio antes de esta actualización documental (`git status --porcelain` vacío).
- Archivos modificados en este cierre: únicamente
  `docs/governance/audit/2026-09-05-LOTE-3C-CIERRE-VERIFICACION-ROLES-v1.0.md`.
  Ninguna corrección de producto fue necesaria (no se demostró fallo).

### 6.5 Enlaces de preview

Base: `https://id-preview--fd89b51f-9afc-4e15-8ee2-21fe468f6aa9.lovable.app`

- `/arma-tu-viaje`
- `/rutas`
- `/rutas/valladolid-ek-balam`
- `/casas-de-vacaciones`
- `/oriente-maya/valladolid/casas-de-vacaciones/casa-colonial-sisal`
- `/alux`
- `/marketplace`

### 6.6 Matriz final

| Comprobación | Estado |
|---|---|
| Build real ejecutado | PASS |
| QA responsive 4 anchos × 7 superficies | PASS |
| Edición por interfaz del Portal Empresa con persistencia y restauración | PASS |
| Cuentas temporales restantes | 0 |
| Typecheck / Suite (761) | PASS / PASS |

Sin FAIL ni NO VERIFICADO. Lote 3C cerrado. No se avanza al Lote 3D.
