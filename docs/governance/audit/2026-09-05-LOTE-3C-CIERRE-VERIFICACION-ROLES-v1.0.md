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
