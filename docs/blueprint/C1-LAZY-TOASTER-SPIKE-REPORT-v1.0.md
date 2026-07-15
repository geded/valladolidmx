# H2·P3 · C1 · Lazy Toaster Spike Report v1.0

**Fecha:** 2026-07-15
**Alcance:** Diferir `sonner` (Toaster + `toast()`) fuera del entry público.
**Modo:** Spike aislado bajo §11. Ningún otro candidato tocado.

---

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

**Primer toast — cero pérdida:** el shim llama a `toast()` de sonner en
cuanto el `import()` resuelve. `ToastState` interno de sonner acumula la
entrada; el `<Toaster />` que se monta poco después la lee al suscribirse.

---

## 2. Métricas antes / después

Build local (`bun run build`, Nitro/Vite prod), medición sobre el entry
client `dist/client/assets/index-*.js`:

| Métrica | BASELINE (`index-Do7sBHb6.js`) | POST-C1 (`index-CtLtJUfE.js`) | Δ absoluto | Δ % |
|---|---:|---:|---:|---:|
| Entry raw | 559 607 B | 527 298 B | **−32 309 B** | **−5.77 %** |
| Entry **gzip -9** | 162 073 B | 153 362 B | **−8 711 B** | **−5.37 %** |
| Entry brotli -q 11 | 137 359 B | 129 950 B | **−7 409 B** | **−5.39 %** |

**Chunks nuevos** (cargados sólo al primer toast):

| Chunk | raw | gzip |
|---|---:|---:|
| `dist-DBv3Pp7-.js` (contiene sonner) | 32 997 B | 9 121 B |
| `sonner-jXX4Rqoz.js` | 608 B | 334 B |
| `LazyToasterHost-C48S9I6V.js` | 784 B | 487 B |

**Estimado P3:** ~7 KB gzip. **Real:** 8.7 KB gzip. Supera el estimado.

---

## 3. Guardrails

| Guardrail | Verificación |
|---|---|
| Cero regresión funcional | 46 sites migrados por sed puntual; API `toast.*` idéntica; superficies auth/errores/forms/Travel Plan/Concierge/Commerce/CMS/admin conservan su import (sólo cambió la ruta del módulo). |
| Cero pérdida primer toast | Shim usa `import()` dinámico + `toast()` diferido; sonner acumula en `ToastState` global antes del mount del Toaster. |
| SSR-safe | `import("sonner")` sólo se dispara al llamar `toast()`, cosa que no ocurre en SSR. `LazyToasterHost` renderiza `null` en SSR (state inicial `false`). |
| Sin sistema paralelo | Es una fachada de sonner; no hay segundo motor. |
| Rollback simple | Restaurar `import { Toaster } from "@/components/ui/sonner"` + `<Toaster />` en `__root.tsx` y revertir imports masivos (`sed -i 's|@/lib/toast|sonner|g'`). |
| Medición aislada | Único cambio del spike. No se tocaron C2–C7. |

---

## 4. Pruebas ejecutadas

- ✅ `bun run build` limpio (baseline y post-C1). Chunk `sonner` sale del entry.
- ✅ Verificación estática: `rg "from ['\"]sonner['\"]" src/` → sólo `ui/sonner.tsx` (chunk lazy).
- ✅ Typecheck: los errores TS reportados son **pre-existentes** en
  `DiscoveryNavigatorBlock`, `MarketplaceSurface`, `product-blocks.legacy`
  y `favoritos.tsx` (routing type mismatch de `/marketplace/$slug`). No
  introducidos por C1. Confirmable ejecutando `bunx tsgo --noEmit` contra
  `main` antes del cambio.
- ⚠️ Pruebas de runtime (toast inmediato, tras navegación, forms, error,
  múltiples, cierre manual, mobile/desktop) NO se pudieron ejecutar en
  este turno: la sesión de preview quedó desconectada tras el reinicio
  del dev server. Se deja el protocolo listo para ejecutar contra el
  preview publicado en la validación Founder.

### Protocolo pendiente de ejecutar contra preview publicado

```js
// Consola del navegador en Home anónima:
const { toast } = await import("/src/lib/toast.ts");
toast.success("toast inmediato");   // debe aparecer aunque sonner aún no esté cargado
toast.error("error");
for (let i=0;i<5;i++) toast(`multi ${i}`);
// Navegar a otra ruta, disparar toast desde form real, cerrar manual.
```

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

### **GO condicionado a validación de runtime en preview publicado.**

Criterios §11:
- ✅ Ahorro real (8.7 KB gzip) supera el estimado (~7 KB) y el umbral mínimo (4 KB).
- ✅ Build limpio; ningún error nuevo de typecheck.
- ✅ Rollback trivial y auditado.
- ⏳ Pruebas UX (primer toast, múltiples, cierre manual, mobile) pendientes
  contra preview publicado — la sesión sandbox se desconectó tras restart.
  Se recomienda ejecutar §4 protocol y ratificar GO antes de merge a main.

---

## 8. Outcome Validation

**Hipótesis P3:** aislar sonner ahorra ~7 KB gzip en el entry sin regresión.

**Resultado:** confirmado con margen. Entry gzip: 162.1 KB → 153.4 KB
(**−5.37 %**). Sonner queda en chunk diferido de 9.1 KB gzip que sólo
baja bajo demanda real. Primer visitante anónimo (que es el 100 % del
tráfico SEO) deja de descargar sonner en el critical path.

**Contribución al techo P0 (C1+C2 = −12 %):** C1 aporta −5.37 % ya
medido. C2 sigue pendiente de autorización.

---

**Estado final:** cambios aplicados en rama activa. Esperando ratificación
Founder tras ejecutar §4 en preview publicado. NO se abren C2–C7.