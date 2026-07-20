# H2 · P3 · Bundle Analysis del Entry Público — v1.0

**Rama:** `main` (HEAD del benchmark P3, misma en la que corre el dev server)
**Build:** `bun run build` con `build.sourcemap: true` temporal (config restaurada).
**Entry medido:** `dist/client/assets/index-Do7sBHb6.js`
**Alcance:** análisis y atribución **sin cambios de código**. Ninguna dependencia se removió, ninguna ruta se re-splitteó.
**Fecha:** 2026-07-15

---

## 1. Tamaño del entry (autoridad para P3)

| Métrica | Bytes | KB |
|---|---:|---:|
| Entry raw | **559 607** | 546.5 KB |
| Entry gzip -9 | **162 082** | 158.3 KB |
| Entry brotli -q 11 | **137 359** | 134.1 KB |
| Total JS todos los chunks (388 archivos) | 3 457 649 | 3 376.6 KB |

> El "entry de ~637 KB" de reportes previos correspondía al commit `7d8ef897`. El HEAD actual muestra **546 KB raw / 158 KB gzip / 134 KB brotli** — es la línea base **oficial** para P3.

Atribución: bytes cubiertos por sourcemap **543 384 / 559 226 (97.2%)**. El 2.8 % restante es preámbulo Vite / helpers de runtime sin origen atribuible.

---

## 2. Top 20 módulos por bytes (raw en entry, atribución por sourcemap)

| # | Bytes | % entry | Módulo |
|---|---:|---:|---|
| 1 | 174 834 | 31.3 % | `react-dom/cjs/react-dom-client.production.js` |
| 2 | 32 639 | 5.8 % | `sonner/dist/index.mjs` |
| 3 | 21 518 | 3.8 % | `@tanstack/router-core/dist/esm/router.js` |
| 4 | 20 055 | 3.6 % | `zod/v4/core/schemas.js` |
| 5 | 18 693 | 3.3 % | `src/routeTree.gen.ts` |
| 6 | 12 116 | 2.2 % | `zod/v4/classic/schemas.js` |
| 7 | 11 023 | 2.0 % | `@tanstack/router-core/dist/esm/load-matches.js` |
| 8 | 7 821 | 1.4 % | `src/components/layout/PrimaryMegaMenu.tsx` |
| 9 | 7 553 | 1.3 % | `src/routes/__root.tsx` |
| 10 | 7 462 | 1.3 % | `src/components/layout/SiteHeader.tsx` |
| 11 | 5 923 | 1.1 % | `zod/v4/core/checks.js` |
| 12 | 5 831 | 1.0 % | `zod/v4/core/util.js` |
| 13 | 5 806 | 1.0 % | `src/lib/discovery/seo.ts` |
| 14 | 5 699 | 1.0 % | `zod/v4/core/to-json-schema.js` |
| 15 | 5 116 | 0.9 % | `zod/v4/core/json-schema-processors.js` |
| 16 | 4 951 | 0.9 % | `zod/v4/core/api.js` |
| 17 | 4 176 | 0.7 % | `@tanstack/history/dist/esm/index.js` |
| 18 | 4 071 | 0.7 % | `src/lib/traveler/stage-experience.ts` |
| 19 | 4 048 | 0.7 % | `src/components/layout/UserMenu.tsx` |
| 20 | 4 023 | 0.7 % | `@tanstack/query-core/build/modern/queryClient.js` |

---

## 3. Top dependencias externas (agregadas por paquete)

| Paquete | Bytes | % entry | Notas |
|---|---:|---:|---|
| `react-dom` | 175 051 | 31.3 % | Runtime obligatorio (client + hydrate). |
| `zod` (v4 core + classic) | **68 068** | **12.2 %** | Ver §6.a — arrastrado por `block-library.ts`. |
| `@tanstack/router-core` | 43 087 | 7.7 % | Router matching + loader lifecycle; obligatorio. |
| `sonner` | 32 639 | 5.8 % | Toaster montado globalmente en `__root.tsx`. |
| `@tanstack/react-router` | 15 751 | 2.8 % | Hooks / `<Link>` / `<Match>`. Obligatorio. |
| `@tanstack/query-core` | 13 904 | 2.5 % | QueryClient + hidratación SSR. Obligatorio. |
| `lucide-react` | 5 047 | 0.9 % | Bien tree-shakeado, ~30 íconos usados. |
| `@tanstack/history` | 4 176 | 0.7 % | Peer de router. |
| `@tanstack/store` | 4 171 | 0.7 % | Peer de router. |
| `scheduler` | 3 526 | 0.6 % | Peer de react-dom. |
| `@tanstack/react-router-with-query` | 1 782 | 0.3 % | Wrapper de integración. |
| `@tanstack/react-start` | 1 679 | 0.3 % | Runtime SSR/CSR mínimo. |

**Subtotal deps externas:** ≈ **369 KB raw** (66 % del entry).
**Subtotal código propio:** ≈ **174 KB raw** (31 % del entry).
**No atribuido:** ≈ **16 KB** (2.8 %) — runtime/preámbulo Vite.

---

## 4. Código propio en el entry (por área)

| Área | Bytes | Observación |
|---|---:|---|
| `src/routes/_authenticated/*` (106 archivos) | 30 249 | Sólo metadatos de ruta (path, `beforeLoad`, `validateSearch`); componentes NO están en el entry — están code-split. ~285 B/ruta. |
| `src/components/layout/*` (Header, Menu, Footer, MegaMenu, UserMenu, ProfileModeSwitcher) | 26 792 | Ver §6.b. |
| `src/routeTree.gen.ts` | 18 693 | Registry auto-generado; no editable. Crecimiento lineal con nº de rutas. |
| `src/routes/oriente-maya/*` (5 archivos leaf) | 10 417 | Metadatos de ruta pública. |
| `src/routes/__root.tsx` | 7 553 | Layout raíz. Ver §6.c (Toaster, PWA, i18n eager). |
| `src/lib/traveler` | 6 238 | `stage-experience.ts` cargado eager por header. |
| `src/lib/discovery/seo.ts` | 5 806 | JSON-LD helpers usados en `__root.tsx`. |
| `src/routes/lovable/*` | 5 488 | Rutas de preview internas (dev/founder). Ver §6.d. |
| `src/lib/i18n/locales.functions.ts` | 3 432 | Server fn cliente shim. |
| `src/lib/navigation` | 3 326 | Contrato de navegación oficial. Necesario. |
| `src/lib/protected-actions/registry.ts` | 3 310 | Registry de acciones autenticadas. |
| `src/pwa/register-sw.ts` + `sync-queue.ts` + `sync-runner.ts` | 6 591 | Ver §6.e. |
| `src/i18n/context.tsx` | 2 664 | Provider global de idioma. |
| `src/lib/alux/*` | 1 469 | Sólo tipos/contratos. Runtime está en chunks lazy. |

---

## 5. Imports estáticos que impiden code splitting (auditoría)

Módulos que arrastran dependencias grandes al entry por ser importados estáticamente desde el árbol raíz:

| Cadena de imports | Efecto |
|---|---|
| `src/routes/__root.tsx` → `Toaster` de `sonner` | **32.6 KB** de sonner en entry. |
| `src/routes/__root.tsx` → `src/i18n/context.tsx` → provider global | 2.7 KB provider + 3.4 KB `locales.functions` shim en entry. |
| `src/routes/__root.tsx` → `src/lib/discovery/seo.ts` | 5.8 KB JSON-LD builders (usados por todas las rutas públicas, esto SÍ es correcto). |
| `src/routes/__root.tsx` → `SiteHeader` → `PrimaryMegaMenu` + `UserMenu` + `ProfileModeSwitcher` + `SiteFooter` | ≈ **26.8 KB** de layout. `UserMenu` y `ProfileModeSwitcher` son visibles sólo tras autenticar. |
| `src/routes/__root.tsx` → `stage-experience.ts` (traveler stage) | 4.1 KB de lógica de estados de viaje ejecutada por todos los visitantes. |
| `src/lib/experience-builder/composition-renderer.tsx` → `block-library.ts` → `blocks/*/contract.ts` (10 contratos) → `zod/v4` | **68 KB de zod** en entry. Ver §6.a. |
| `src/pwa/register-sw.ts` (importado por `__root.tsx`) | 2.7 KB + eager virtual PWA imports. |

---

## 6. Componentes/dependencias filtrados al entry público (candidatos)

### 6.a Zod v4 completo (68 KB raw / ~14 KB gzip)

`block-library.ts` importa los 10 contratos de bloques oficiales; cada contrato hace `import { z } from "zod"` para declarar `defaultProps`/`schema`. La validación con zod **no se ejecuta en el visitante anónimo** — la usa el editor (`VisualStudio`, `SmartBlockRuntime`) y el server function `syncBlockLibrary`. En runtime público bastaría con los defaults declarados y la función `render()`.

**Bytes actuales en entry:** 68 068 (raw) · ≈ 14 000 (gzip).
**Bytes potencialmente evitables:** hasta 60 KB raw / ~12 KB gzip.
**Mecanismo:** separar contratos en `render-only` (usados en composición pública) vs `contract` (usados en Studio/servidor). Lazy-import de zod en el bundle del editor.
**Superficie afectada:** todas las páginas públicas renderizadas por `p.$slug.tsx`, `l.$slug.tsx`, `oriente-maya/*`, `producto.$slug.tsx`.
**Riesgo:** medio — cambiar cómo se resuelven `defaultProps` en runtime.
**Validación:** re-medir entry gzip; snapshot visual de 5 páginas públicas piloto; contract-tests del EB en Studio.
**Rollback:** revertir a `block-library.ts` monolítico.

### 6.b Layout completo eager (26.8 KB raw / ~7 KB gzip)

`PrimaryMegaMenu.tsx` (7.8 KB), `SiteHeader.tsx` (7.5 KB), `UserMenu.tsx` (4.0 KB), `ProfileModeSwitcher.tsx` (2.6 KB), `SiteFooter.tsx` (2.5 KB), `SiteTopBar.tsx` (~2 KB) viajan siempre. `UserMenu` y `ProfileModeSwitcher` sólo se muestran con sesión activa; `PrimaryMegaMenu` sólo se abre al hacer hover/click.

**Bytes actuales:** 26 792 raw · ~7 000 gzip.
**Bytes potencialmente evitables:** ~14 KB raw / ~4 KB gzip (mega-menú + user-menu tras interacción / hidratación diferida).
**Mecanismo:** `React.lazy` + `<Suspense fallback={null}>` para MegaMenu, UserMenu, ProfileModeSwitcher. Header base queda liviano.
**Superficie afectada:** header sitewide.
**Riesgo:** alto en UX (delay percibido al abrir mega menú si no hay prefetch); requiere `linkPreload="intent"` o preload en `mouseenter`.
**Validación:** LCP + INP con Web Vitals; screenshot antes/después; test de hover del menú.
**Rollback:** revertir los `React.lazy`.

### 6.c Sonner Toaster eager (32.6 KB raw / ~7.5 KB gzip)

Montado en `__root.tsx`. Los toasts sólo aparecen tras acciones autenticadas (favoritos, carrito, sign-in). Visitante anónimo del home no ve ningún toast al aterrizar.

**Bytes actuales:** 32 639 raw · ~7 500 gzip.
**Bytes potencialmente evitables:** ~30 KB raw / ~7 KB gzip.
**Mecanismo:** `React.lazy(() => import("sonner").then(m => ({ default: m.Toaster })))` con `<Suspense fallback={null}>`. La primera llamada a `toast(...)` fuerza el import.
**Superficie afectada:** toda la app; sistema global de notificaciones.
**Riesgo:** medio — hay que asegurar que `toast()` sea también lazy (wrapper), o precargar `sonner` en `mouseenter` de acciones que emiten toast. Si un toast se emite antes del load, se pierde el primer render (aceptable con retry).
**Validación:** ejercer flujos que emitan toasts en preview publicado; medir entry gzip.
**Rollback:** re-montar `<Toaster />` estático.

### 6.d Rutas de preview internas en entry (`/lovable/*`)

`src/routes/lovable/*` contribuye 5.5 KB en el entry (sólo metadatos de ruta; los componentes están code-split). No son alcanzables por visitantes anónimos en producción.

**Bytes actuales:** 5 488 raw · ~1.4 KB gzip.
**Bytes potencialmente evitables:** ~5 KB raw / ~1.3 KB gzip.
**Mecanismo:** excluir el directorio del `routeTree` en builds de producción vía `import.meta.env.PROD`, o mover a un layout condicional que no se registre en prod.
**Superficie afectada:** herramientas de preview interno del Founder.
**Riesgo:** bajo si se mantienen en preview builds.
**Validación:** confirmar que las rutas `/lovable/*` responden 404 en prod y siguen operando en preview.
**Rollback:** re-incluir sin flag.

### 6.e PWA register-sw eager (2.7 KB) + virtual imports

El SW se registra en el primer render. No es evitable si se quiere PWA operativa desde la primera visita, pero puede diferirse a `requestIdleCallback`.

**Bytes actuales:** 2 701 raw.
**Bytes potencialmente evitables:** 0 (funcionalmente requerido temprano).
**Recomendación:** mantener; no priorizar.

---

## 7. Duplicación entre chunks (revisión)

Rastreo de módulos que aparecen en varios chunks (sourcemap del entry vs chunks lazy):

- **`react-dom-client`**: sólo en el entry ✅.
- **`zod/v4`**: entry + `esm-DfOy01Kx.js` (chunk de server-fns) + `experience-builder` chunk. Es la misma copia deduplicada por Vite; NO hay duplicación real (mismo hash).
- **`@tanstack/router-core`**: sólo en entry ✅.
- **`sonner`**: sólo en entry ✅.
- **`lucide-react`**: dividido entre entry (~5 KB de íconos usados en header) y chunks específicos (íconos usados sólo en cuenta/portal/cms). ✅ tree-shaking efectivo.
- **`@radix-ui/*`**: no aparece en el entry (splitting funciona); vive en chunks de dialog/dropdown/select lazy ✅.

**Veredicto:** no se detecta duplicación de módulos entre chunks. Vite/Rollup está deduplicando correctamente.

---

## 8. Side effects que bloquean tree-shaking (auditoría)

`package.json` del proyecto no declara `"sideEffects": false`. Impacto medido: bajo — la mayoría de módulos propios no exponen efectos y Vite ya elide correctamente. **NO recomendado modificar** sin auditar `src/styles.css` y `src/router.tsx` (side effects deliberados: import de CSS, registro global de PWA). Cambio riesgo alto vs beneficio bajo (<2 KB estimado).

---

## 9. Oportunidades de lazy loading por ruta y capability

| Superficie | Componente en entry hoy | Puede diferirse hasta |
|---|---|---|
| Home (`/`) | Toaster, MegaMenu, UserMenu | 1ª interacción / autenticación |
| Rutas públicas de destino | Zod v4 completo | Nunca — reemplazar por render-only contracts |
| Rutas públicas de destino | Todos los metadatos de `_authenticated/*` (30 KB) | Split por layout: `routeTree.gen.ts` no permite excluir; requiere segmentación por prefix build-time (avanzado, no P0) |
| Header | ProfileModeSwitcher | Autenticación |

---

## 10. Matriz de candidatos (P0/P1/P2)

| # | Candidato | Ahorro esperado (raw / gzip) | Riesgo | Complejidad | Prioridad | Recomendación |
|---|---|---|---|---|---|---|
| C1 | Lazy Toaster (`sonner`) | −30 KB / −7 KB | Medio (primer toast) | Baja | **P0** | Autorizar spike aislado y medir. |
| C2 | Render-only block contracts (drop zod público) | −60 KB / −12 KB | Medio (contratos + Studio) | Media-alta | **P0** | Diseñar propuesta técnica antes de tocar código. |
| C3 | Lazy MegaMenu + UserMenu + ProfileModeSwitcher | −14 KB / −4 KB | Alto (UX del header) | Media | **P1** | Requiere prefetch on-intent; medir INP. |
| C4 | Excluir `/lovable/*` en builds prod | −5 KB / −1.3 KB | Bajo | Baja | **P2** | Ganancia marginal; ok como higiene. |
| C5 | `stage-experience.ts` lazy | −4 KB / −1 KB | Bajo | Media | **P2** | Sólo si se ejecuta post-hidratación. |
| C6 | Diferir `register-sw.ts` a `requestIdleCallback` | 0 KB entry (mueve trabajo, no bytes) | Bajo | Baja | **P2** | Mejora TTI, no bundle size. |
| C7 | Declarar `"sideEffects": false` en app propia | ~1-2 KB | Alto (CSS/PWA) | Alta | **P2** | Descartado salvo auditoría formal. |

**Techo teórico agregable si C1+C2+C3 se ejecutaran:** ≈ **−104 KB raw / −23 KB gzip** — llevaría el entry de 158 → **~135 KB gzip** (−14.5 %).

**Techo realista P0 (C1+C2):** ≈ **−90 KB raw / −19 KB gzip** → entry **~139 KB gzip** (−12 %).

---

## 11. Protocolo de evidencia para cada candidato aprobado

Cada spike futuro debe entregar antes de merge:

1. Medición byte-a-byte del entry raw / gzip -9 / brotli -11 **antes** y **después**, en el mismo commit sandbox.
2. Waterfall Playwright en preview publicado (LCP, INP, TTI).
3. Verificación funcional del flujo afectado (toasts / header / render de bloques).
4. Diff mínimo (`git diff --stat`) — el spike no debe tocar código no relacionado.
5. Plan de rollback declarado (revertir commit).
6. Comparativa visual antes/después de la superficie afectada.

---

## 12. Estado y siguiente decisión Founder

P3 · Bundle Analysis **completado**. Sin cambios de código.

**Sandbox limpio:** `vite.config.ts` restaurado a su estado original (sin `sourcemap: true`); dependencia `source-map` removida; ningún artefacto de análisis dejado en el repo salvo este documento.

**No se autoriza avanzar** a la implementación de C1..C7 hasta que el Founder revise la matriz §10, apruebe explícitamente cuáles candidatos abrir como spikes, y defina el orden.

Pregunta abierta al Founder:

> ¿Autorizas abrir el spike **C1 (Lazy Toaster)** como primer piloto de P3 — bajo el protocolo de evidencia §11, con rollback trivial — para calibrar el techo real de reducción antes de invertir en C2 (render-only contracts)?