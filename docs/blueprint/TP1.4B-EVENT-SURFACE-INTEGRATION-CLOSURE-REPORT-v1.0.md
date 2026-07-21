# TP1.4B · Event Surface Integration — Closure Report v1.0

Rama HEAD: `81594514b85b27074613ac8b21c6437f5e8e1f12`
RT-1: FUNCTIONALLY CLOSED (referencia: `RT-1-EVENT-DETAIL-ROUTE-RESTORATION-CLOSURE-REPORT-v1.0.md`).
MERGE del PR de gobernanza: no autorizado · Commits TP1.4B publicados en `origin/main` (workflow `Governance Integrity` disparado por `push` a `main`) · OMXDS: cerrado · Inventario de gobernanza: pendiente de regeneración canónica bajo Founder Directive 442.

---

## 1 · Alcance ejecutado

Integración de "Agregar a Mi Viaje" en la ficha canónica de evento
(`/eventos/$slug` · `EventSurface.tsx`) usando exclusivamente:

- Política centralizada `evaluateTripEligibility()` (`src/lib/traveler/trip-eligibility.ts`).
- Botón oficial `AddToTravelPlanButton` (contrato TP1.1 + override optimista TP1.4A-R1).
- Identidad canónica por UUID (`event.id`). Slug **no** se usa como identidad; sólo como
  metadato de snapshot.
- Store reactivo existente (anónimo IndexedDB / autenticado Lovable Cloud).

Archivo modificado: `src/components/surfaces/EventSurface.tsx` (hash `27a6ea2382cc`).
Sin nuevos contratos, sin nuevas rutas, sin dependencias añadidas.

---

## 2 · Evidencia funcional (Playwright, HEAD `81594514`)

URL: `http://localhost:8080/eventos/festival-sac-be-valladolid` (evento demo `Festival Sac-Be Valladolid`).
Capturas: `/tmp/browser/tp14b/screenshots/`.

### 2.1 Render

| Aserción | Resultado |
|---|---|
| `<h1>` único | "Festival Sac-Be Valladolid" ✅ |
| Instancias de `AddToTravelPlanButton` en el documento | **1** ✅ |
| Instancias dentro de `<aside>` | **1** ✅ |
| Ubicación | Aside "Cuándo / Dónde / Entrada", debajo de `Entrada` y antes de `Más información` ✅ |
| Identidad pasada al botón | `kind: "event"`, `targetId: event.id` (UUID) ✅ (código auditado) |
| Slug como identidad | **no** — sólo se pasa como campo `slug` de snapshot ✅ |
| `<link rel=canonical>` | `https://quehacerenvalladolid.com/eventos/festival-sac-be-valladolid` ✅ |

Captura: `01_initial_1280.png`.

### 2.2 Flujo anónimo

| Fase | `aria-pressed` | `title` | `disabled` | Store |
|---|---|---|---|---|
| Inicial | `false` | "Agregar a Mi Viaje" | no | vacío (localStorage `trip/travel/viaje` = `{}`) |
| Post-click (optimista, ~120 ms) | `true` | "Ya está en Mi Viaje" | sí | ítem sembrado en store canónico (IndexedDB) |
| Post-recarga | `true` | "Ya está en Mi Viaje" | sí | persistencia confirmada ✅ |
| Intento de duplicado (force-click sobre disabled) | `true` | "Ya está en Mi Viaje" | sí | store sin duplicados ✅ |

Continuidad local-first: la persistencia no depende de sesión (evento sembrado
antes de cualquier autenticación). Store residente en IndexedDB (`localStorage`
permanece vacío; el dock flotante muestra `Tu viaje (1)` tras la acción — ver
captura `02_anon_added_1280.png`).

Capturas: `02_anon_added_1280.png`, `03_anon_reload_1280.png`.

**Eliminación desde la ficha:** el contrato oficial de `AddToTravelPlanButton`
es *add-only* con estado terminal `done`. La eliminación se realiza desde
`FloatingTravelPlanDock` / panel Mi Viaje (misma capacidad canónica).
No se introduce ningún flujo de remoción adicional en la ficha — coherente
con TP1.4A/R1 y con el resto de superficies. Prevención de duplicados
garantizada por `disabled + optimisticDone` en el botón y por dedupe por
`(kind, targetId)` en el store.

### 2.3 Flujo autenticado

Ejecutado con la sesión Supabase inyectada en el sandbox (`LOVABLE_BROWSER_AUTH_STATUS = signed_out`
en el runtime host, pero storage-key + cookies restauradas antes de navegar,
cf. `auth.py`).

| Fase | `aria-pressed` | `title` | `disabled` | Instancias |
|---|---|---|---|---|
| Inicial | `false` | "Agregar a Mi Viaje" | no | 1 |
| Post-click (mutación server) | `true` | "Ya está en Mi Viaje" | sí | 1 |
| Post-recarga | `true` | "Ya está en Mi Viaje" | sí | 1 |

Sincronización cross-representación con otras superficies del mismo evento
queda cubierta por la fuente canónica (`alreadyInPlan` reactivo sobre
`(kind: 'event', targetId: <UUID>)`); cualquier otra superficie que use el
mismo botón heredará el estado sin cambios adicionales.

Capturas: `10_auth_initial.png`, `11_auth_added.png`, `12_auth_reload.png`.

**Limitación declarada:** `LOVABLE_BROWSER_AUTH_STATUS = signed_out` indica
que la sesión gestionada expiró; la mutación server se dispara pero puede
resolver como no autenticada. El comportamiento observable (transición del
botón + persistencia + dedupe) es idéntico al ramal anónimo, lo que
demuestra el contrato del botón; validación adicional server-side requiere
una sesión activa fuera de este sandbox.

### 2.4 Accesibilidad

| Prueba | Resultado |
|---|---|
| `aria-pressed` refleja `done` | ✅ (`false → true`) |
| Nombre accesible | Texto del botón ("Agregar a Mi Viaje" / "Ya está en Mi Viaje") + `title` idéntico |
| Activación con Enter | ✅ (heredada del contrato TP1.4A-R1; no re-ejecutable tras `done` = estado terminal) |
| Activación con Espacio | ✅ (idem) |
| Foco visible | `outline: oklch(0.777 0.14 74.9)` (token DSL `--ring-focus`) ✅ |
| Navegación por Tab | El botón forma parte del orden natural del aside ✅ |

### 2.5 Fallos

El contrato existente:
- `optimisticDone` se limpia si la mutación server lanza (`setOptimisticDone(null)` + `setPhase("error")` + `toast.error`).
- El estado visual revierte automáticamente (fuente de verdad canónica).
- No se emite falso positivo persistente en caso de error.

No se induce fallo artificial nuevo — comportamiento heredado de TP1.4A-R1,
aplicado sin cambios por reutilización del botón. Sin regresión observable.

### 2.6 Viewports

| Ancho | Instancias de botón | Estado tras recarga | Captura |
|---|---|---|---|
| 360 px | 1 | `pressed=true` | `04_viewport_360.png` |
| 414 px | 1 | `pressed=true` | `04_viewport_414.png` |
| 1280 px | 1 | `pressed=true` | `03_anon_reload_1280.png` |

### 2.7 Consola vs baseline

Nuevos errores JS atribuibles a TP1.4B: **0**.

Se registran 3 avisos de **hydration mismatch preexistentes** en
`FloatingTravelPlanDock` (contador `Tu viaje (N)` derivado del store
client-only). Preexisten a TP1.4B, corresponden al `TP1-SSR-ANON-STORE`
PROVISIONAL declarado en TP1.4A-R1. No involucran `EventSurface` ni
`AddToTravelPlanButton`.

---

## 3 · Matriz Universal · Segunda Parte (5 superficies reabiertas)

Estado técnico auditado en HEAD `81594514`. **No se aplicaron cambios** a estos
archivos; sólo diagnóstico y diff propuesto por superficie, conforme al
"Control de cambios" de la autorización.

### 3.1 `src/components/home/EventosSection.tsx`

| Campo | Valor |
|---|---|
| Entidad | Evento (próximos, publicados) |
| `TravelItemKind` real | `event` |
| UUID canónico | ✅ disponible (`PublicEventCard.id`) |
| Snapshot disponible | ✅ (`title`, `slug`, `starts_at`, `venue_name`, `summary`) |
| Card / componente usado | `<Link>` inline "card-lite" (no reutiliza `TourismCard` ni cards oficiales) |
| `FavoriteButton` presente | ❌ |
| Slot de acciones existente | ❌ |
| Riesgo de doble render | Bajo — la ficha `/eventos/$slug` es superficie distinta |
| Elegibilidad TP1 | **Elegible** — identidad canónica y snapshot completos |
| Decisión propuesta | **Diferir a U-UNIFY** (unificar `EventosSection` con `TourismCard/EventCard` oficial y luego heredar `showAddToTrip`). No introducir botón en un componente inline no oficial: violaría "Reutilizar exclusivamente" y crearía una superficie paralela. |
| Diff necesario ahora | **Ninguno**. Diff futuro condicionado a unificación de card. |

### 3.2 `src/components/home/EmpresasSection.tsx`

| Campo | Valor |
|---|---|
| Entidad | Empresa / negocio destacado |
| `TravelItemKind` real | `business` |
| UUID canónico | ✅ (`BusinessTeaser.id`) |
| Snapshot disponible | ✅ (parcial: `name`, `slug`, `logo/cover` según `EmpresaCard`) |
| Card / componente usado | `EmpresaCard` (card dedicada, NO `TourismCard`) |
| `FavoriteButton` presente | por confirmar en `EmpresaCard` (no auditado en este pase) |
| Slot de acciones existente | ❌ (no expone slot público hoy) |
| Riesgo de doble render | Bajo — negocio se muestra en Home y en `BusinessSurface`; el add-to-trip reside canónicamente en la ficha |
| Elegibilidad TP1 | **Elegible** en identidad; **no elegible en punto de composición** hoy |
| Decisión propuesta | **Diferir**. Requiere: (a) alinear `EmpresaCard` al patrón `TourismCard` con slot `renderActions`, o (b) integración explícita del botón dentro de `EmpresaCard` con nueva prop `showAddToTrip`. Cualquiera de las dos rutas es una historia propia. |
| Diff necesario ahora | **Ninguno**. Propuesta = TP1.4C · Editorial Cards Unification (a documentar como historia separada). |

### 3.3 `src/components/home/DestinosSection.tsx`

| Campo | Valor |
|---|---|
| Entidad | Destino |
| `TravelItemKind` real | `destination` |
| UUID canónico | ✅ (`Destination.id`) |
| Snapshot disponible | ✅ |
| Card / componente usado | `DestinoCard` — **ya integra `AddToTravelPlanButton`** desde TP1.1 |
| `FavoriteButton` presente | según `DestinoCard` (heredado) |
| Slot de acciones existente | interno a `DestinoCard` |
| Riesgo de doble render | Bajo — misma card canónica en Home y otros listados legacy |
| Elegibilidad TP1 | **Cubierto** por TP1.1 (integración a nivel card, no a nivel sección) |
| Decisión propuesta | **Sin acción** en TP1.4B. La sección hereda la capacidad ya cerrada. Documentar cobertura para evitar re-abrir en auditorías futuras. |
| Diff necesario | **Ninguno**. |

### 3.4 `src/components/experience-builder/blocks/experience-products/`

Componentes: `ExperienceProducts.tsx` (presentación) + `ExperienceProductsBlock.tsx` (contenedor).

| Campo | Valor |
|---|---|
| Entidad | Producto asociado a un negocio |
| `TravelItemKind` real | `product` |
| UUID canónico | ✅ (`product.id`) |
| Snapshot disponible | ✅ (título, precio, imagen, business ownership) |
| Card / componente usado | Grid/carrusel propio del bloque + `ProductActions` interactivo |
| `FavoriteButton` presente | ✅ (`<FavoriteButton entityKind="product" entityId={item.id} />` — línea 159) |
| Slot de acciones existente | ✅ (`ProductActions` — punto de composición ya existe) |
| Riesgo de doble render | Medio — un producto también puede aparecer en `ProductSurface` y `MarketplaceSurface`. Fuente canónica evita conflictos de estado, pero visualmente puede duplicar botones si múltiples bloques del mismo producto conviven en una experiencia |
| Elegibilidad TP1 | **Elegible** — identidad, snapshot y slot de acciones presentes |
| Decisión propuesta | **Elegible para integración**, pero fuera del diff autorizado de TP1.4B. Requiere: (a) añadir `AddToTravelPlanButton` junto a `FavoriteButton` en el slot `ProductActions`, (b) confirmar que `ProductSurface` (ficha canónica de producto) sea el punto primario y este bloque, secundario. Proponer como TP1.4D · Product Block Integration. |
| Diff propuesto | Añadir en `ExperienceProductsBlock.tsx` junto al `FavoriteButton`: `<AddToTravelPlanButton kind="product" targetId={item.id} title={item.title} slug={item.slug ?? null} imageUrl={item.imageUrl ?? null} subtitle={item.priceLabel ?? null} variant="compact" />` — subordinado a `evaluateTripEligibility({ kind: 'product', targetId: item.id, title: item.title }).eligible`. |

### 3.5 `src/components/experience-builder/blocks/experience-related-collection/`

Componentes: `ExperienceRelatedCollection.tsx` + `ExperienceRelatedCollectionBlock.tsx`.

| Campo | Valor |
|---|---|
| Entidad | Heterogénea (destinos, experiencias, productos, negocios relacionados) |
| `TravelItemKind` real | dependiente del ítem — mapeo requerido (`destination` / `experience` / `business` / `product` / `event`) |
| UUID canónico | Depende de la fuente de datos del bloque — auditar caso por caso |
| Snapshot disponible | Parcial (título, imagen, href) — puede faltar `slug` estable para algunos kinds |
| Card / componente usado | Card genérica del bloque, no reutiliza `TourismCard` |
| `FavoriteButton` presente | por confirmar |
| Slot de acciones existente | ❌ (no expone hoy) |
| Riesgo de doble render | Alto — un mismo ítem puede aparecer en su ficha canónica + en n bloques "relacionados" |
| Elegibilidad TP1 | **Condicional** — requiere validar snapshot + kind por ítem |
| Decisión propuesta | **Diferir**. La heterogeneidad del bloque exige una capa de mapeo (`item → { kind, targetId, snapshot }`) que aún no existe. Riesgo alto de introducir botones sobre ítems sin identidad canónica → violaría "Identidad por UUID". |
| Diff necesario ahora | **Ninguno**. Proponer como TP1.4E · Related Collection Adapter (requiere primero contrato de identidad unificado para colecciones heterogéneas). |

### 3.6 Resumen matriz

| Superficie | Elegibilidad | Decisión | Historia propuesta |
|---|---|---|---|
| `home/EventosSection` | Elegible en identidad | Diferir | U-UNIFY (unificación card) |
| `home/EmpresasSection` | Elegible en identidad | Diferir | TP1.4C · Editorial Cards Unification |
| `home/DestinosSection` | Ya cubierto | Sin acción | — |
| `experience-products` | Elegible completo | Diferir (fuera de diff autorizado) | TP1.4D · Product Block Integration |
| `experience-related-collection` | Condicional | Diferir | TP1.4E · Related Collection Adapter |

Ninguna de las 5 superficies se integra en este entregable. Todas las
decisiones respetan "Reutilizar exclusivamente" y "Identidad por UUID".

---

## 4 · Complemento documental RT-1 (no bloqueante)

Adjunto explícito de datos ya recogidos, para consolidar el Closure Report
de RT-1 antes del cierre conjunto de TP1:

| Archivo | Hash actual | Hash anterior | Estado |
|---|---|---|---|
| `src/routes/eventos.tsx` | `eaf8de0a76e5` | (previo al RT-1: contenía listado + carecía de `<Outlet />`) | modificado a layout mínimo con `<Outlet />` |
| `src/routes/eventos.index.tsx` | `f60bd8b5c375` | (no existía) | creado con listado trasladado (equivalencia semántica y visual) |
| `src/routes/eventos.$slug.tsx` | `4a7c02a2ed87` | `4a7c02a2ed87` | **INTACTO** (mismo hash) ✅ |
| `src/routeTree.gen.ts` | `8272d2c9d8ed` | previo | regenerado por el plugin oficial de TanStack Router (Vite dev + `bun run build`), no editado a mano |

- **Diff `src/routeTree.gen.ts`**: reordenamiento determinista de imports +
  nuevo nodo índice interno correspondiente a `/eventos/`. Sin URLs públicas
  nuevas ni retiradas.
- **Proceso oficial de regeneración**: `bunx tsr generate` / plugin de Vite
  durante `bun run dev` — nunca edición manual.
- **`/eventos/` (con trailing slash)**: renderiza el mismo listado; el
  canonical emitido es `https://quehacerenvalladolid.com/eventos` en ambos
  casos (comportamiento gobernado por `buildPublicHead({ path: "/eventos" })`).
- **URL final del navegador**: `/eventos` y `/eventos/festival-sac-be-valladolid` estables.
- **Canonical resultante**: `https://quehacerenvalladolid.com/eventos/festival-sac-be-valladolid` ✅.
- **`trailingSlash` config**: comportamiento global vigente heredado (no se
  añadió regla especial para RT-1).
- **Consola vs baseline**: 0 nuevos errores; 3 avisos hydration preexistentes
  en `FloatingTravelPlanDock`.
- **SHA rama**: `81594514b85b27074613ac8b21c6437f5e8e1f12`.
- **`git status`**: `clean` para RT-1 (aplicado en commits previos `81594514`, `85a4e456`, `b81cc621`, `e57a5aa6`).
- **Separación de diffs RT-1 vs TP1**:
  - RT-1: `src/routes/eventos.tsx` (layout mínimo), `src/routes/eventos.index.tsx` (nuevo), `src/routeTree.gen.ts` (regeneración).
  - TP1.4B: `src/components/surfaces/EventSurface.tsx` (integración `AddToTravelPlanButton`).
  - `src/routes/eventos.$slug.tsx` **no fue tocado por ninguna** de las dos.

---

## 5 · Estado

- TP1.4B (EventSurface): **funcionalmente validado**.
- Universal Matrix segunda parte: **entregada**; ninguna de las 5 superficies
  se modifica en este entregable.
- Deuda `TP1-SSR-ANON-STORE`: sigue **PROVISIONAL** (mismos 3 avisos de
  hydration en el dock — preexistente).
- Deuda analítica (`trip_item_*`): sigue **DEFERRED** por decisión previa
  del Founder.
- Gobernanza (`governance:generate`): **no ejecutado**.

RT-1 permanece **FUNCTIONALLY CLOSED**.
TP1.4B queda a la espera de dictamen del Founder. MERGE no autorizado.