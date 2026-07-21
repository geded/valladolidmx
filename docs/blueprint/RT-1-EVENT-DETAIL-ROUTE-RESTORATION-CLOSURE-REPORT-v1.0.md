# RT-1 · Event Detail Route Restoration — Closure Report v1.0

**Fecha:** 2026-07-21
**SHA rama (HEAD):** `b81cc621df043a386ff6a1c59ea3666cd304bf2f`
**Alcance:** Restaurar el render funcional de `/eventos/$slug` mediante `<Outlet />` en el layout de `/eventos`, sin alterar URLs públicas.
**Estado:** ✅ RT-1 completada (TP1.4B aún no cerrado; merge no autorizado)

---

## 1. Cambios fuente aplicados (alcance autorizado)

### 1.1 `src/routes/eventos.tsx` — Convertido en layout mínimo
- **Hash antes:** `463bb01384b94033c53c274fdd2f88e3a9714f44d511bb18f2a7b37619e98e81`
- **Hash después:** `eaf8de0a76e5a3abc693fec5e37ca2ac8246954ab222605956ec2fb98b706275`
- **Diff:** Se retiró el contenido de `EventosPage` (imports de PublicShell, SITE, listPublishedEvents, TourismListingSurface, eventToTourismCard, `head`, `loader`, `component`) y se sustituyó por un layout mínimo:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/eventos")({
  component: () => <Outlet />,
});
```

### 1.2 `src/routes/eventos.index.tsx` — Nuevo (traslado íntegro del listado)
- **Hash:** `f60bd8b5c3753da5150dfed595fdd9bc43a148aa079069719868321852cbe4de`
- **Contenido:** copia byte-equivalente de la implementación previa (imports, `buildPublicHead` con `path: "/eventos"`, `loader` con `upcomingOnly: true, limit: 60` y `.catch(() => [])`, `eventToTourismCard`, `buildDestinationFacet`, hero/eyebrow/subtitle, empty message, crumbs). Única diferencia: `createFileRoute("/eventos/")` en lugar de `"/eventos"`.

### 1.3 `src/routes/eventos.$slug.tsx` — Sin modificación (verificado)

### 1.4 `src/routeTree.gen.ts` — Regenerado por el plugin oficial de TanStack Router
- **Hash antes:** `7576406337aca94fa55e60aa1d36629e9ef6c25b65c7cf57dc52afc6d22684d0`
- **Hash después:** `8272d2c9d8ed026c2126cfc5b59c9da59215cd9bf786c186cfdc1add959189fb`
- **Proceso de regeneración:** Automático mediante `@tanstack/react-router` Vite plugin al detectar cambios en `src/routes/` (dev server en ejecución). Sin edición manual.
- **Diff generado (síntesis, referencias verificadas con `rg`):**
  - Nuevo import: `import { Route as EventosIndexRouteImport } from './routes/eventos.index'`
  - Nuevo nodo: `EventosIndexRoute` con `getParentRoute: () => EventosRoute`
  - Relación padre-hija: `EventosRoute` ahora agrupa `EventosIndexRoute` y `EventosSlugRoute` vía `_addFileChildren`
  - Nuevas entradas en interfaces `FileRoutesById`, `FileRoutesByFullPath`, `FileRoutesByTo`: id `/eventos/`, fullPath `/eventos/`
  - `EventosRoute` pasa de leaf a `EventosRouteWithChildren`
- **Confirmación:** El diff refleja únicamente (a) el layout `/eventos`, (b) el índice `/eventos/`, (c) la relación correcta con `/eventos/$slug`. Cero rutas accidentales.

---

## 2. Conteos reconciliados (métricas separadas)

### 2.1 Archivos físicos dentro de `src/routes/` (excluye `routeTree.gen.ts` y `README.md`)
| Momento | Conteo |
|---|---|
| Antes | 191 |
| Después | 192 |
| Delta | **+1** por `eventos.index.tsx` |

Comando: `find src/routes -type f | grep -v routeTree.gen.ts | grep -v README.md | wc -l`

### 2.2 Archivos que declaran `createFileRoute` (o `createRootRoute` en la raíz)
| Momento | Conteo |
|---|---|
| Antes | 191 |
| Después | 192 |
| Delta | **+1** por `eventos.index.tsx` |

Comando: `find src/routes -type f \( -name "*.tsx" -o -name "*.ts" \) | xargs rg -l "createFileRoute|createRootRoute" | wc -l`

Nota: `__root.tsx` usa `createRootRoute`; se cuenta en la misma expresión.

### 2.3 Rutas y URLs
| Métrica | Antes | Después | Delta |
|---|---|---|---|
| Nodos generados del route tree (`/eventos` + `/eventos/`) | 1 | 2 | **+1 nodo interno (índice)** |
| URLs públicas únicas | — | — | **0** |
| `/eventos` | conservado | conservado | — |
| `/eventos/$slug` | roto (sin `<Outlet />`) | **render funcional recuperado** | — |
| Rutas accidentales | — | — | **0** |
| URLs retiradas | — | — | **0** |

---

## 3. Pruebas RT-1 obligatorias — Resultados

Ejecutadas con Playwright headless (Chromium) contra `http://localhost:8080`.

| # | Verificación | Resultado |
|---|---|---|
| 1 | `/eventos` hard refresh · H1 = "Eventos" | ✅ PASS |
| 2 | `/eventos` navegación SPA (regreso desde detalle) | ✅ PASS |
| 3 | `/eventos/festival-sac-be-valladolid` hard refresh · H1 = "Festival Sac-Be Valladolid" | ✅ PASS |
| 4 | Navegación SPA `/eventos` → `/eventos/festival-sac-be-valladolid` | ✅ PASS |
| 5 | `/eventos/no-existe-xxx` monta `notFoundComponent` propio de la hija ("Evento no encontrado · No publicamos ese evento todavía.") | ✅ PASS |
| 6 | Montaje real de `EventSurface` en la ficha | ✅ PASS (H1 único del evento + JSON-LD `@type: Event` + BreadcrumbList emitidos por EventSurface) |
| 7 | Ausencia del listado (`TourismListingSurface`) en la ficha del evento | ✅ PASS (una sola H1; sin cards de listado) |
| 8 | Canonical correcto en detalle: `https://quehacerenvalladolid.com/eventos/festival-sac-be-valladolid` | ✅ PASS |
| 9 | JSON-LD emitido: WebSite, Organization, BreadcrumbList, Event (4 bloques) | ✅ PASS |
| 10 | Breadcrumbs correctos (Inicio → Eventos → [nombre]) | ✅ PASS |
| 11 | Ausencia de doble render / doble H1 | ✅ PASS |
| 12 | Ausencia de hydration mismatch nuevo | ✅ PASS (0 warnings de hidratación en consola) |
| 13 | Viewports 360 / 414 / 1280 px | ✅ PASS |
| 14 | Consola comparada contra baseline: sólo 1 error de recurso 404 (asset preexistente, no atribuible a RT-1) | ✅ PASS |
| 15 | `bunx tsgo --noEmit` | ✅ PASS (0 errores) |

**Slug de prueba usado:** `festival-sac-be-valladolid` (evento publicado en el entorno actual, tomado del primer `<a href="/eventos/...">` del listado). No hubo bloqueo de datos.

### Evidencia visual
- `/tmp/browser/rt1/screenshots/1_eventos_list.png`
- `/tmp/browser/rt1/screenshots/2_evento_detail_hard.png`
- `/tmp/browser/rt1/screenshots/3_notfound.png`
- `/tmp/browser/rt1/screenshots/4_spa_nav_slug.png`
- `/tmp/browser/rt1/screenshots/5_detail_360.png`
- `/tmp/browser/rt1/screenshots/5_detail_414.png`

---

## 4. Aislamiento e integridad

### 4.1 SHA de la rama
`b81cc621df043a386ff6a1c59ea3666cd304bf2f`

### 4.2 `git status` (working tree)
```
M  src/routes/eventos.tsx
A  src/routes/eventos.index.tsx
M  src/routeTree.gen.ts   (regenerado por el plugin oficial)
A  docs/blueprint/RT-1-EVENT-DETAIL-ROUTE-RESTORATION-CLOSURE-REPORT-v1.0.md
```

### 4.3 Confirmaciones
- ✅ Cero cambios fuera del alcance autorizado.
- ✅ `governance:generate` **NO** ejecutado.
- ✅ Inventario de gobernanza **NO** modificado.
- ✅ `src/routeTree.gen.ts` **NO** editado a mano.
- ✅ MAIN no modificado.
- ✅ OMXDS permanece cerrado.
- ✅ Regeneración canónica del inventario diferida al cierre conjunto RT-1 + TP1.4B, con atribución separada.

---

## 5. Estado final

- **RT-1:** ✅ Correcciones fuente aplicadas, route tree regenerado oficialmente, `/eventos/$slug` monta funcionalmente `EventSurface`, pruebas obligatorias PASS.
- **TP1.4B:** ⏸️ Todavía no cerrado. Pendiente Fase 2 (evidencia completa de `AddToTravelPlanButton` en `EventSurface`, matriz universal, resolución de Home y bloques editoriales).
- **Merge:** ⛔ NO autorizado.

A la espera de decisión Founder para iniciar Fase 2 · TP1.4B.
