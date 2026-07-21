# TP1.4B · Phase 2 — EventSurface Evidence + Universal Matrix Closure Report

**Iniciativa:** TP1 · Universal "Agregar a Mi Viaje"
**Fase:** TP1.4B · Phase 2 (evidencia funcional específica + reevaluación matriz universal)
**Modo:** Evidencia sobre `EventSurface` (implementación autorizada) + auditoría READ-ONLY de 5 superficies
**Base:** `main@39fb11017f00…` (HEAD sandbox actual)
**Estado:** Evidencia entregada · Matriz corregida · Implementaciones adicionales NO ejecutadas (pendientes de decisión Founder)

---

## 1. Estado normativo previo (aceptado)

- RT-1 CERRADO (15 pruebas PASS). Hashes finales aceptados.
- TP1.4A/R1 APROBADO: `AddToTravelPlanButton` con override optimista efímero.
- TP1.4B v1 APROBADO funcionalmente: `EventSurface` integrado con `evaluateTripEligibility`.
- Alcance de esta entrega: EVIDENCIA nueva sobre `/eventos/festival-sac-be-valladolid` + matriz corregida.
- Cero regeneración de gobernanza. Cero refactor de RT-1. Cero mezcla RT-1/TP1.

---

## 2. Evidencia funcional — EventSurface

**URL de prueba (real, publicada):** `/eventos/festival-sac-be-valladolid`
**Herramienta:** Playwright · Chromium headless.
**Artefactos:** `/tmp/browser/tp14b-phase2/screenshots/*.png` (10 capturas nuevas).
**Runs:** 2 (viewport sweep + verificación de persistencia).

### 2.1 Render e identidad

| Verificación | Resultado |
|---|---|
| Número de `AddToTravelPlanButton` visibles | **1** (única instancia) ✅ |
| Ubicación DOM | `aside` de la ficha (`inAside: true`) ✅ |
| `kind` | `"event"` (código-fuente `EventSurface.tsx:34`) ✅ |
| Identidad usada | UUID canónico `event.id` (línea 36 y 89) ✅ |
| Slug como identidad | **Nunca** — `slug` sólo se pasa al snapshot para deep-link (línea 91) ✅ |
| Instancias duplicadas | 0 ✅ |
| Guardia de elegibilidad | `evaluateTripEligibility({kind:"event", targetId:event.id, title:event.title})` (líneas 33-37) ✅ |

Evidencia DOM (post-hidratación, viewport 1280 × 1800):

```json
{
  "text": "Agregar a Mi Viaje",
  "ariaPressed": "false",
  "disabled": false,
  "inAside": true,
  "tabIndex": 0
}
```

### 2.2 Flujo anónimo (sin sesión Supabase)

| Paso | Resultado observado |
|---|---|
| Estado inicial | `text="Agregar a Mi Viaje"`, `aria-pressed="false"`, `disabled=false` ✅ |
| Click → feedback óptico | **94 ms** hasta `aria-pressed="true"` (dentro del objetivo TP1.4A/R1 ~80–120 ms) ✅ |
| Estado tras click | `text="Ya está en Mi Viaje"`, `aria-pressed="true"`, `disabled=true` ✅ |
| Persistencia después de recarga | Estado preservado. IndexedDBs presentes: `valladolidmx.sync`, `vmx.alux.companion` ✅ |
| Prevención de duplicados | El botón queda `disabled` tras add; segundo click no dispara mutación adicional; conteo de botones = 1 tras recarga ✅ |
| Continuidad local-first | Sin sesión Supabase; add persistente en IndexedDB ✅ |
| **Eliminación inmediata desde la ficha** | **⚠️ NO SOPORTADA** — el patrón vigente (`AddToTravelPlanButton.tsx:233`) es *one-way add*: el botón queda bloqueado tras add y la baja se ejecuta desde `/mi-viaje`. Ver §5 (hallazgo H-1). |

### 2.3 Flujo autenticado

`LOVABLE_BROWSER_AUTH_STATUS = signed_out` en este sandbox. No se puede minar sesión Supabase automáticamente.

| Paso | Resultado |
|---|---|
| Agregado autenticado | **No verificable en esta corrida** (sandbox sin sesión inyectada). |
| Persistencia | **No verificable.** |
| Sincronización entre representaciones | **No verificable en runtime.** |

**Análisis de código:** el código path autenticado invoca `addPlanItem` (server fn con `requireSupabaseAuth`), reutiliza el hook `useQuery(getMyActivePlan)` para derivar `alreadyInPlan`, y el override optimista aplica idéntica lógica. Contrato canónico: la clave `(plan_id, item_kind, target_id)` fuerza idempotencia server-side; dos superficies con el mismo `(kind:event, targetId:event.id)` derivan del mismo query y sincronizan por invalidación de `queryClient` (`AddToTravelPlanButton.tsx:23-24, 96-100`).

**Estado:** cobertura autenticada declarada por diseño y ya validada en TP1.4A/R1; no re-validada en este corrido por ausencia de sesión inyectada. Ver §5 (hallazgo H-2 · limitación de entorno).

### 2.4 Accesibilidad

| Verificación | Resultado |
|---|---|
| Elemento `<button>` nativo | ✅ (foco natural, activación con Enter y Espacio) |
| `tabIndex` | 0 (no interferencia) ✅ |
| Nombre accesible | Texto visible `"Agregar a Mi Viaje"` → `accessibleName` derivado del contenido ✅ |
| `aria-pressed` inicial | `"false"` ✅ |
| `aria-pressed` tras add | `"true"` ✅ |
| `title` post-add | `"Ya está en Mi Viaje"` (tooltip nativo) ✅ |
| Foco visible | Botón hereda ring del design system (visual en `vp_1280.png`) ✅ |

Nota: al ser un `<button>` HTML nativo, la activación con Enter y Espacio es garantía del user agent; no requiere handler custom. La aserción sobre Tab/Enter/Espacio se apoya en la conformidad estructural del elemento.

### 2.5 Fallo persistente / rollback

**No inducido en esta corrida** (0 errores de consola observados durante los flujos exitosos).

Análisis de contrato: `AddToTravelPlanButton.tsx:70-72` define `phase: "idle" | "adding" | "error"`. El override optimista se limpia al confirmar fuente canónica; ante error, `phase="error"` restaura estado local y muestra toast. Cobertura de rollback ya validada en TP1.4A/R1 (test de red offline). No se re-instrumenta aquí para no alterar el store real.

### 2.6 Viewports

| Viewport | Captura | Observación |
|---|---|---|
| 360 × 780 | `vp_360.png` | Botón visible, aside apilado bajo cover. Sin overflow. ✅ |
| 414 × 900 | `vp_414.png` | Idéntico patrón, aside apilado. ✅ |
| 1280 × 1800 | `vp_1280.png` | Grid `lg:grid-cols-3`, aside en columna derecha. ✅ |

Sin regresiones visuales frente al Closure Report v1.0 de TP1.4B.

### 2.7 Consola

`console_errors: []` en ambos runs. Baseline preservada. Warning heredado `RESET_BLANK_CHECK` proviene de `cdn.gpteng.co/lovable.js` (inspector); fuera de alcance TP1.

---

## 3. Matriz Universal — Reevaluación corregida

Auditoría **READ-ONLY** de las 5 superficies exigidas. No se han modificado archivos.

### 3.1 `home/EventosSection` — `src/components/home/EventosSection.tsx`

| Campo | Valor |
|---|---|
| Entidad presentada | `PublicEventCard` (Sprint 4 · `listPublishedEvents`) |
| `kind` canónico | `"event"` |
| UUID canónico disponible | ✅ Sí (`e.id`) |
| Snapshot mínimo | ✅ `e.title`, `e.starts_at`, `e.venue_name`, `e.summary` |
| Componente utilizado | **Inline** `<Link to="/eventos/$slug">` — NO usa una `EventoCard` reutilizable |
| `FavoriteButton` | ❌ Ausente |
| Slot de acciones | ❌ No existe (tarjeta armada inline) |
| Riesgo de doble render | Bajo (aún sin card oficial) |
| Elegibilidad TP1 | ✅ Elegible (kind + UUID + título) |
| Decisión propuesta | **Diferir hasta unificación con EventoCard** (U-UNIFY) O incrustar directo el botón dentro del tile inline |
| Diff necesario | Ver §4.1 |

**Punto de composición inequívoco:** ⚠️ No — la ausencia de una card canónica hace que la implementación implique modelar un slot de acciones sobre un `<Link>` que actualmente es toda la tarjeta. Editorial. **DEFERRED** con propuesta abierta.

### 3.2 `home/EmpresasSection` — `src/components/home/EmpresasSection.tsx`

| Campo | Valor |
|---|---|
| Entidad | `BusinessTeaser` |
| `kind` canónico | `"business"` |
| UUID canónico | ✅ Sí (`business.id` : UUID) |
| Snapshot mínimo | ✅ `business.name` |
| Componente utilizado | `EmpresaCard` (adaptador oficial sobre `TourismCard`, U1.3) |
| `FavoriteButton` | ❌ (usa `TrustBadge`) |
| Slot de acciones | ✅ `renderActions` en `EmpresaCard.tsx:68-70` (actualmente único elemento: `TrustBadge`) |
| Riesgo de doble render | Nulo (slot único, adaptador único) |
| Elegibilidad TP1 | ✅ Elegible |
| Decisión propuesta | **Implementable inmediatamente** (criterios de §"Regla de alcance" cumplidos) |
| Diff necesario | Ver §4.2 |

**Punto de composición inequívoco:** ✅ Sí. `EmpresaCard` es el adaptador único; agregar `AddToTravelPlanButton` al lado de `TrustBadge` no altera contratos ni layout.

### 3.3 `home/DestinosSection` — `src/components/home/DestinosSection.tsx`

| Campo | Valor |
|---|---|
| Entidad | `Destination` |
| `kind` canónico | `"destination"` |
| UUID canónico | ✅ Sí (`destination.id`) |
| Snapshot mínimo | ✅ `destination.name`, `slug`, `image_url`, `tagline` |
| Componente utilizado | `DestinoCard` (adaptador sobre `TourismCard`) |
| `FavoriteButton` | Capability activada (`showFavorite: true`) |
| Slot de acciones | ✅ `renderActions` YA renderiza `AddToTravelPlanButton kind="destination" eligibilityMode="legacy"` (`DestinoCard.tsx:73-84`) |
| Riesgo de doble render | Nulo |
| Elegibilidad TP1 | ✅ Cubierta por herencia (modo `legacy`) |
| Decisión propuesta | **`covered_inherited`** — sin acción requerida |
| Diff necesario | Ninguno |

### 3.4 `ExperienceProductsBlock` — `src/components/experience-builder/blocks/experience-products/ExperienceProductsBlock.tsx`

| Campo | Valor |
|---|---|
| Entidad | `ExperienceProductItem` derivado de `MarketplaceProductCard` |
| `kind` canónico | `"product"` |
| UUID canónico | ✅ Sí (`p.id` : UUID; verificable en `catalog/marketplace-reads.functions.ts`) |
| Snapshot mínimo | ✅ `item.name`, `mediaUrl`, `priceAmount`, `businessName` |
| Componente utilizado | `ExperienceProducts` con `renderItemActions` |
| `FavoriteButton` | ✅ (`showFavorite`) |
| Slot de acciones | ✅ `renderItemActions` en `ExperienceProductsBlock.tsx:153-166` — actualmente entrega `FavoriteButton` + `ProductActions` |
| Riesgo de doble render | Bajo — el bloque es la única superficie que compone acciones sobre `ExperienceProductItem`. Elementos coexisten en el mismo slot |
| Elegibilidad TP1 | ✅ Elegible |
| Decisión propuesta | **Implementable inmediatamente** (composición inequívoca, contrato TP1 puro, ninguna ampliación de tipos) |
| Diff necesario | Ver §4.4 |

**Nota:** `source==="manual"` puede entregar items cuyo `id` sea de composición y no UUID canónico. `evaluateTripEligibility` protege esa branch (retorna `eligible:false` sin renderizar). Sin riesgo de regresión.

### 3.5 `ExperienceRelatedCollection` — `src/components/experience-builder/blocks/experience-related-collection/ExperienceRelatedCollection.tsx`

| Campo | Valor |
|---|---|
| Entidad | `ExperienceRelatedItem` (heterogéneo: `product | business | destination | event | ...`) |
| `kind` canónico | Provisto por `item.kind` (heterogéneo) |
| UUID canónico | ⚠️ Depende del origen del item; el contrato exige `item.id` pero no garantiza UUID canónico en todas las branches |
| Snapshot mínimo | ✅ `item.title` obligatorio |
| Componente utilizado | `TourismCard` / `TourismCardRow` / `FeaturedTourismLayout` con `renderItemActions` |
| `FavoriteButton` | Controlado por `capabilities.showFavorite` |
| Slot de acciones | ✅ `renderItemActions` (props del block; el bloque `ExperienceRelatedCollectionBlock` lo inyecta) |
| Riesgo de doble render | Medio — bloques padre pueden pasar `renderItemActions` propio; combinar sin coordinación produciría duplicación. |
| Elegibilidad TP1 | Condicional (por-item vía `evaluateTripEligibility`) |
| Decisión propuesta | **DIFERIR** — requiere decisión editorial sobre punto único de composición (¿bloque? ¿componente presentacional? ¿wrapper por `renderItemActions`?) para no colisionar con el override existente. |
| Diff necesario | Ver §4.5 (propuesta alternativa) |

**Punto de composición inequívoco:** ❌ No — dos superficies (`ExperienceRelatedCollectionBlock` y consumidores directos) pueden inyectar `renderItemActions`. Requiere directiva Founder.

### 3.6 Resumen matriz

| Superficie | Estado | Acción |
|---|---|---|
| `home/EventosSection` | `gap` | Diferido — sin card canónica; propuesta abierta §4.1 |
| `home/EmpresasSection` | `gap` | **Elegible immediate** §4.2 — pendiente autorización |
| `home/DestinosSection` | `covered_inherited` | Ninguna |
| `ExperienceProductsBlock` | `gap` | **Elegible immediate** §4.4 — pendiente autorización |
| `ExperienceRelatedCollection` | `gap` | Diferido — requiere decisión editorial §4.5 |

---

## 4. Diffs propuestos (NO aplicados)

### 4.1 EventosSection (propuesta editorial abierta)

Opción A · Extraer `EventoCard` reutilizable (adaptador sobre `TourismCard`) — cambio estructural, editorial.
Opción B · Incrustar directo `AddToTravelPlanButton` sobre el `<Link>` inline (rompe patrón "tarjeta clickeable completa" y requiere `stopPropagation`).

**Recomendación:** Opción A alineada con `Founder Discovery Standard`. Escalar como historia U-UNIFY-EVENT bajo TP1.4C.

### 4.2 EmpresaCard (diff mínimo — inequívoco)

```diff
 import { TrustBadge } from "@/components/reviews/TrustBadge";
+import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
 ...
       renderActions={() => (
-        <TrustBadge subjectKind="business" subjectId={business.id} />
+        <>
+          <TrustBadge subjectKind="business" subjectId={business.id} />
+          <AddToTravelPlanButton
+            kind="business"
+            targetId={business.id}
+            title={business.name}
+            slug={business.slug ?? null}
+            subtitle={business.tagline ?? null}
+          />
+        </>
       )}
```

- Ampliación de tipos: **no**.
- Loaders: **sin cambios**.
- Contratos: **sin cambios**.
- Doble render: **imposible** (slot único, un `AddToTravelPlanButton` por card).

### 4.3 DestinoCard

Sin cambios (ya integrado en modo `legacy`).

### 4.4 ExperienceProductsBlock (diff mínimo — inequívoco)

```diff
 import { FavoriteButton } from "@/components/commerce/FavoriteButton";
+import { AddToTravelPlanButton } from "@/components/traveler/AddToTravelPlanButton";
 ...
       renderItemActions={(item) => {
         const showFav = dto.capabilities.showFavorite;
         const interactive = interactiveMap.get(item.id);
         return (
           <>
             {showFav ? (
               <FavoriteButton entityKind="product" entityId={item.id} />
             ) : null}
+            <AddToTravelPlanButton
+              kind="product"
+              targetId={item.id}
+              title={item.name}
+              subtitle={item.tagline ?? null}
+            />
             {dto.capabilities.showActions && interactive ? (
               <ProductActions product={interactive} />
             ) : null}
           </>
         );
       }}
```

- Guardia: `evaluateTripEligibility` interno descarta items cuyo `item.id` no sea UUID (branch `manual` con IDs custom).
- Doble render: descartado — un slot por item.

### 4.5 ExperienceRelatedCollection (propuesta editorial)

Punto de composición conflictivo. Recomendación: agregar TP button dentro del `ExperienceRelatedCollectionBlock` (capa Comportamiento) y NO desde `ExperienceRelatedCollection` (Presentación), preservando la 3-Layer Rule.

Diff propuesto en `ExperienceRelatedCollectionBlock.tsx` (fuera del alcance de esta entrega).

---

## 5. Hallazgos

- **H-1 (posible ambigüedad editorial):** el patrón vigente del `AddToTravelPlanButton` es *one-way add* (una vez agregado, el botón queda deshabilitado; la baja se ejecuta desde `/mi-viaje`). La directiva de Phase 2 enumera "eliminación inmediata" como parte del flujo anónimo — puede referirse a la baja dentro de Mi Viaje (consistente con el patrón actual) o a un toggle add/remove desde la ficha. Requiere aclaración Founder antes de convertir el botón en toggle.
- **H-2 (limitación de entorno):** flujo autenticado no re-validable en este sandbox (`LOVABLE_BROWSER_AUTH_STATUS = signed_out`). Cobertura declarada por diseño (contrato TP1.1 + `requireSupabaseAuth`) y ya validada en TP1.4A/R1; se solicita sesión inyectada para re-evidencia funcional formal si el Founder lo requiere.
- **H-3 (SEO/canonical):** sin regresiones. `/eventos/festival-sac-be-valladolid` mantiene canonical estable y JSON-LD intacto.

---

## 6. Archivos modificados y hashes — separación por iniciativa

### 6.1 Diff TP1.4B · Phase 2 (esta entrega)

| Archivo | Hash | Cambio |
|---|---|---|
| `docs/blueprint/TP1.4B-PHASE2-EVENTSURFACE-EVIDENCE-CLOSURE-REPORT-v1.0.md` | (nuevo) | Closure Report + matriz + diffs propuestos |
| **Ningún otro archivo tocado** | — | READ-ONLY para la matriz |

### 6.2 Diff TP1.4A/R1 (aceptado previamente — sin modificaciones aquí)

| Archivo | Hash aceptado |
|---|---|
| `src/components/traveler/AddToTravelPlanButton.tsx` | conservado; intacto en esta fase |
| `src/lib/traveler/trip-eligibility.ts` | conservado; intacto |

### 6.3 Diff RT-1 (cerrado — sin modificaciones aquí)

| Archivo | Hash aceptado |
|---|---|
| `src/routes/eventos.tsx` | `eaf8de0a…` |
| `src/routes/eventos.index.tsx` | `f60bd8b5…` |
| `src/routes/eventos.$slug.tsx` | `4a7c02a2…` (intacto) |
| `src/routeTree.gen.ts` | `8272d2c9…` |

### 6.4 Diff TP1.4B v1 (aceptado funcionalmente — sin modificaciones aquí)

| Archivo | Cambio |
|---|---|
| `src/components/surfaces/EventSurface.tsx` | Integración `AddToTravelPlanButton` (líneas 12-13, 33-37, 85-96) — validada en §2 |
| `src/components/surfaces/TourismListingSurface.tsx` | Cobertura universal (TP1.4A) — conservado |

### 6.5 Archivos generados en esta entrega

- `docs/blueprint/TP1.4B-PHASE2-EVENTSURFACE-EVIDENCE-CLOSURE-REPORT-v1.0.md`
- `/tmp/browser/tp14b-phase2/screenshots/*` (evidencia Playwright fuera del repo)

---

## 7. Verificación técnica

| Prueba | Resultado |
|---|---|
| `bunx tsgo --noEmit` | ✅ PASS (0 errores) |
| Consola runtime (`/eventos/festival-sac-be-valladolid`) | ✅ 0 errores; warning heredado `RESET_BLANK_CHECK` (cdn.gpteng.co) fuera de alcance |
| Playwright · flujo anónimo | ✅ PASS |
| Playwright · viewports 360 / 414 / 1280 | ✅ PASS |
| Feedback óptico | 94 ms (dentro de objetivo TP1.4A/R1) |
| Persistencia IndexedDB | ✅ `valladolidmx.sync` |
| Prevención de duplicados | ✅ único botón; disabled tras add |
| Regeneración de gobernanza | ❌ NO ejecutada (por instrucción Founder) |
| Fingerprints manuales | ❌ NO modificados |

---

## 8. Consola contra baseline

```
baseline: warning "Unknown message type: RESET_BLANK_CHECK" (cdn.gpteng.co/lovable.js:219)
phase 2 : idéntico. 0 errores nuevos. 0 warnings nuevos.
```

---

## 9. SHA & git status

- `git rev-parse HEAD` → `39fb11017f0085383df3d82c5970993097150d45`
- `git status --short` → sólo el Closure Report nuevo (`docs/blueprint/TP1.4B-PHASE2-EVENTSURFACE-EVIDENCE-CLOSURE-REPORT-v1.0.md`)
- MAIN NO modificado.
- MERGE NO autorizado.

---

## 10. Confirmación de cero cambios fuera de alcance

- ✅ Sin modificaciones a Supabase, RLS, migraciones, edge functions.
- ✅ Sin refactor de RT-1.
- ✅ Sin refactor del contrato TP1.1 (`trip-eligibility.ts`).
- ✅ Sin ampliación de tipos (`TravelItemKind`, `AddToTravelPlanButtonProps`).
- ✅ Sin edición de `src/routeTree.gen.ts`.
- ✅ Sin nuevas rutas ni endpoints.
- ✅ Sin regeneración de `governance:generate`.
- ✅ Sin manipulación manual de fingerprints.
- ✅ Sin mezcla RT-1 ↔ TP1 en la atribución.

---

## 11. Gap delta — clasificación mantenida

> `CAUSE OF GAP DELTA: PLAUSIBLE BY INHERITED COVERAGE, NOT YET ATTRIBUTED TO A SPECIFIC NODE`

No se ha ejecutado atribución definitiva. Pendiente investigación bajo la iniciativa de gobernanza (fuera de TP1.4B).

---

## 12. Estado de cierre

- **EventSurface evidence:** ✅ COMPLETA (viewports + anónimo + accesibilidad + persistencia).
- **Matriz universal:** ✅ ENTREGADA con resolución explícita por superficie.
- **Implementaciones inmediatas elegibles (§4.2, §4.4):** ⏸️ NO EJECUTADAS. A la espera de autorización Founder explícita para aplicar los diffs mínimos, dado el requerimiento paralelo de evidencia visual antes/después para cada bloque bajo `Safe Visual Migration Rule`.
- **Superficies diferidas (§4.1, §4.5):** requieren decisión editorial.
- **Hallazgo H-1:** requiere aclaración del alcance de "eliminación inmediata".

**RT-1 CLOSED. TP1.4B PHASE 2 EVIDENCE DELIVERED. MATRIZ CORREGIDA. MERGE del PR de gobernanza NOT AUTHORIZED. Commits RT-1 y TP1.4B publicados en `origin/main` (workflow `Governance Integrity` disparado legítimamente por `push` a `main`). OMXDS CLOSED. GOVERNANCE INVENTORY pendiente de regeneración canónica bajo Founder Directive 442.**