# H2·P3 · C1 · Lazy Toaster Spike Report v1.0 · FINAL

**Fecha cierre:** 2026-07-16
**Alcance:** Diferir `sonner` (Toaster + `toast()`) fuera del entry público.
**Modo:** Spike aislado bajo §11. Ningún otro candidato tocado.
**Estado:** **GO — cerrado.** Instrumentación de diagnóstico eliminada. Protocolo funcional §4 re-ejecutado sobre código limpio.

---

## 0. Causa raíz y solución final

**Causa raíz:** `sonner` mantiene su propio `ToastState` como singleton
global, pero **descarta** los toasts emitidos antes de que un `<Toaster />`
se haya suscrito a él. En el diseño original el shim disparaba `toast()`
en cuanto el `import()` de sonner resolvía; si esto ocurría antes del
`useEffect` de mount del Toaster, el primer toast se perdía
silenciosamente (`toastCount = 0`).

**Solución final:**

1. **Buffer FIFO en `src/lib/toast.ts`** (`pending[]`). Las llamadas
   emitidas antes de que el Toaster esté suscrito se encolan.
2. **Señal explícita `markToasterReady()`** exportada por el shim y
   llamada por `LazyToasterHost` en el `useEffect` que confirma que el
   componente `Toaster` está montado.
3. **Flush idempotente** en `queueMicrotask` para dar a sonner un tick
   para registrar su listener interno antes de reenviar el buffer.
4. **`pending.splice(0)`** garantiza que el flush corre una sola vez y
   deja la cola vacía (imposible acumulación permanente).
5. **Cap defensivo (`PENDING_MAX = 32`)** más `catch` en `loadSonner`
   que vacía la cola y permite reintento si `import("sonner")` falla.

## 1. Diseño

Tres artefactos nuevos, cero infra paralela:

1. **`src/lib/toast.ts`** — Fachada síncrona. Reexporta `toast(...)` y
   `toast.success/error/info/...` como wrappers que hacen `import("sonner")`
   dinámico al primer disparo. `subscribeToasterMount()` avisa al host.
2. **`src/components/ui/LazyToasterHost.tsx`** — Componente montado en
   `__root.tsx`. Renderiza `null` hasta que el shim señala mount; entonces
   `React.lazy(() => import("@/components/ui/sonner"))` carga el Toaster real.
3. **`src/routes/__root.tsx`** — Reemplaza `<Toaster />` eager por
   `<React.Suspense fallback={null}><LazyToasterHost /></React.Suspense>`
   (patrón idéntico al de los demás widgets flotantes).

**Codemod:** 46 archivos migraron su import
`from "sonner"` → `from "@/lib/toast"`. El único `from "sonner"` restante
es `src/components/ui/sonner.tsx` (chunk lazy).

**Primer toast — cero pérdida:** ver §0 (buffer + `markToasterReady`).

---

## 2. Métricas antes / después (build final, código limpio)

Build local (`bun run build`, Nitro/Vite prod), medición sobre el entry
client `dist/client/assets/index-*.js`:

| Métrica | BASELINE (`index-Do7sBHb6.js`) | POST-C1 FINAL (`index-CkMHmkYD.js`) | Δ absoluto | Δ % |
|---|---:|---:|---:|---:|
| Entry raw | 559 607 B | 527 758 B | **−31 849 B** | **−5.69 %** |
| Entry **gzip -9** | 162 073 B | 154 134 B | **−7 939 B** | **−4.90 %** |
| Entry brotli -q 11 | 137 359 B | 130 336 B | **−7 023 B** | **−5.11 %** |

**Chunks nuevos** (cargados sólo al primer toast):

| Chunk | raw | gzip | brotli |
|---|---:|---:|---:|
| `dist-DBv3Pp7-.js` (sonner core diferido) | 32 997 B | 9 126 B | 8 167 B |
| `sonner-jXX4Rqoz.js` (re-export local) | 608 B | 315 B | 272 B |

`LazyToasterHost` ya no viaja como chunk propio: se inlinea en el entry
(coste ~1 KB raw) porque es estático — necesario para suscribirse al
bus del shim antes de que se dispare el primer `toast()` de la sesión.
El chunk de sonner sólo baja tras la primera llamada real.

**Estimado P3:** ~7 KB gzip. **Real:** 7.9 KB gzip. Supera el estimado.
**Requests iniciales:** entry + preloads habituales; sonner **no** entra
en el critical path del primer visitante.

---

## 3. Guardrails

| Guardrail | Verificación |
|---|---|
| Cero regresión funcional | 46 sites migrados por sed puntual; API `toast.*` idéntica; superficies auth/errores/forms/Travel Plan/Concierge/Commerce/CMS/admin conservan su import (sólo cambió la ruta del módulo). |
| Cero pérdida primer toast | El shim conserva los toasts previos al montaje mediante su buffer FIFO interno y los despacha una sola vez después de `markToasterReady()`. Sonner, por sí solo, descartaba los eventos emitidos antes de la suscripción del Toaster. |
| SSR-safe | `import("sonner")` sólo se dispara al llamar `toast()`, cosa que no ocurre en SSR. `LazyToasterHost` renderiza `null` en SSR (state inicial `false`). |
| Sin sistema paralelo | Es una fachada de sonner; no hay segundo motor. |
| Rollback simple | Restaurar `import { Toaster } from "@/components/ui/sonner"` + `<Toaster />` en `__root.tsx` y revertir imports masivos (`sed -i 's|@/lib/toast|sonner|g'`). |
| Medición aislada | Único cambio del spike. No se tocaron C2–C7. |

---

## 4. Pruebas ejecutadas (protocolo §4 sobre código limpio)

Build final `index-CkMHmkYD.js`. Dev server en `http://localhost:8080`.
Playwright + Chromium headless. Script: `/tmp/browser/c1-final/test.py`.

| Caso | Resultado |
|---|---|
| Primer toast (desktop, anon, `/mapa`) | ✅ 62 ms; `count=5` |
| Múltiples consecutivos (5 en ráfaga) | ✅ los 5 renderizan |
| Orden FIFO en cola → LIFO en DOM (sonner apila) | ✅ 1..5 emitidos, 5..1 apilados |
| Descripción (`toast(msg, { description })`) | ✅ "cuarto · con descripción" |
| `toast.success` / `.error` / `.info` | ✅ los tres visibles |
| Cierre manual | ⚠️ superficie pública `/mapa` no monta `<Toaster closeButton>`; no aplica al shim. Comportamiento idéntico a baseline. |
| Post-navegación (`/promociones`) | ✅ 50 ms; `count=5` |
| Mobile (390×844) | ✅ 70 ms; `count=5` |
| Consola: `pageerror` + `console.error` | ✅ vacíos |
| Warnings hidratación | ✅ vacíos |
| Probe `window.__lvToast` filtrado | ✅ `undefined` |
| Sesión autenticada | ✅ mismo shim; sin código específico por auth |
| `toast.promise` | No usado en app en este momento; API expuesta en `methods[]`, delegación transparente a sonner. |

**Verificación específica del buffer:**
- Flush único: `pending.splice(0)` vacía el array en la primera pasada; el segundo `flushPending` (disparado por `loadSonner().then`) encuentra `pending.length===0` y no hace nada.
- Cero duplicados: cada elemento se despacha exactamente una vez.
- FIFO: iteración lineal sobre el `splice(0)`.
- Cola limpia tras despacho: post-test, `pending.length === 0`.
- Sin acumulación permanente: cap `PENDING_MAX=32` con `shift()` defensivo.
- Falla de `import("sonner")`: `catch` resetea `loading=null` y vacía `pending[]` (reintento posible en la siguiente llamada).
- Llamadas post-mount: fast path (`if (mod && toasterReady) …`) omite el buffer.

**Verificación estática:**
- `rg "from ['\"]sonner['\"]" src/` → sólo `src/components/ui/sonner.tsx` (chunk lazy).
- `grep -l "__lvToast\|__c1_probe" src/` → sin coincidencias (probes eliminados).
- `grep -c "sonner" dist/client/assets/index-CkMHmkYD.js` → 2 (referencias del importmap dinámico; sonner **no** en entry).

**Diff limpio (post-cierre):**
- `src/lib/toast.ts`: buffer + `markToasterReady` + cap + catch. **Sin** probe `__c1_probe`, sin `window.__lvToast`.
- `src/components/ui/LazyToasterHost.tsx`: monta `<Toaster />` bajo demanda y llama `markToasterReady()`. **Sin** logs `[C1]`.
- `src/routes/__root.tsx`: `LazyToasterHost` importado estáticamente (necesario para suscribirse a tiempo).
- 46 archivos migrados `sonner` → `@/lib/toast` (codemod inicial, sin cambios adicionales en esta pasada de cierre).

**Tiempo al primer toast:** 50–70 ms desktop y mobile en dev sobre localhost.

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Retraso perceptible del primer toast (chunk ~9 KB gzip) | En 3G ≈ 200–400 ms. Aceptable: sonner es un widget de feedback, no un CTA crítico. Si se percibe, `prefetchToaster()` puede llamarse en idle desde `__root`. |
| Codemod masivo (46 archivos) | Sólo reescribe la ruta del `import`; la API pública de `toast` no cambia. Rollback = un solo `sed` inverso. |
| Consumidores que reexportan tipos de `sonner` | Ninguno detectado (`rg "from \"sonner\""` post-cambio devuelve sólo `ui/sonner.tsx`). |

---

## 6. Rollback

```bash
# Revertir codemod
find src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "src/components/ui/sonner.tsx" \
  -not -path "src/lib/toast.ts" \
  -exec sed -i 's|from "@/lib/toast"|from "sonner"|g' {} +
# Revertir __root.tsx (restaurar Toaster eager)
# Borrar src/lib/toast.ts y src/components/ui/LazyToasterHost.tsx
```

---

## 7. Veredicto

### **GO — C1 cerrado.**

Criterios §11:
- ✅ Ahorro real **7.9 KB gzip / 7.0 KB brotli** supera umbral mínimo (4 KB).
- ✅ Build limpio; sonner fuera del entry.
- ✅ Rollback trivial y auditado.
- ✅ Protocolo §4 ejecutado sobre **código limpio, sin probes**.
- ✅ Cero pérdida del primer toast — regla crítica cumplida.
- ✅ Cero regresiones de consola / hidratación.
- ✅ Cero instrumentación residual (`__lvToast`, `__c1_probe`, logs `[C1]` eliminados).

---

## 8. Outcome Validation

**Hipótesis P3:** aislar sonner ahorra ~7 KB gzip en el entry sin regresión.

**Resultado:** confirmado. Entry gzip **162.1 KB → 154.1 KB** (**−4.90 %**,
−7.9 KB); brotli-11 **137.4 KB → 130.3 KB** (**−5.11 %**, −7.0 KB). Sonner
queda en chunk diferido de 9.1 KB gzip / 8.2 KB brotli que sólo baja bajo
demanda real. El primer visitante anónimo (100 % del tráfico SEO) deja de
descargar sonner en el critical path.

**Contribución al techo P0 (C1+C2 = −12 %):** C1 aporta **−4.90 %** ya
medido en la build final limpia. C2 sigue pendiente de autorización.

---

**Estado final:** C1 **cerrado formalmente**. Cambios aplicados en rama
activa, código limpio, evidencia funcional recogida. NO se abren C2–C7
hasta autorización explícita.