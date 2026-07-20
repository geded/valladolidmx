# Benchmark H2 · P1 + P2 · Isolation Report v1.0

**Rama destino:** `benchmark/h2-p1-p2-isolation`
**Baseline (pre-H2):** commit `7280de05` — *"Reporte H0 Performance/SEO"*
**Post-P1+P2:** commit `7d8ef897` — *"Corrigió TTFB y aisló Studio"*
**Metodología:** worktrees efímeros aislados (`/tmp/benchmark-h2/pre-h2`, `/tmp/benchmark-h2/post-p1p2`), `bun run build` completo en cada uno, `node_modules` compartidos vía symlink. `main` intacto en todo momento.
**Fecha:** 2026-07-15

---

## 0. Alcance real del hito auditado

El merge `7d8ef897` toca **exactamente 2 archivos** — este es el universo total de P1+P2:

| Archivo | Fase | +líneas | −líneas |
|---|---|---|---|
| `src/lib/destinations/public-reads.functions.ts` | P1 | 92 | 67 |
| `src/routes/__root.tsx` | P2 | 19 | 0 |

---

## 1. Validaciones P1 — TTFB / joins por slug

### 1.1 `getDestinationMapPoints`
- **Pre:** 2 roundtrips secuenciales — `SELECT id FROM destinations WHERE slug=?` → `SELECT ... FROM businesses WHERE destination_id=?`.
- **Post:** 1 roundtrip vía `businesses ... destinations!inner(slug)` con filtro `destinations.slug`.
- ✅ Join por slug verificado. Sin lookup previo.

### 1.2 `getDestinationGalleryUrls`
- **Pre:** 2 roundtrips + **N signed-URL secuenciales** (`for` con `await`). N+1 confirmado.
- **Post:** 1 roundtrip inner-join + **`Promise.all` paralelo** para las firmas.
- ✅ N+1 eliminado. Firmas paralelas correctas.

### 1.3 `getDestinationRelated`
- **Pre:** `overrides`, `businesses` y `events` se leían **en serie** (3 awaits consecutivos), todos dependientes sólo de `dest.id`.
- **Post:** los 3 se lanzan en `Promise.all`, colapsando 3 roundtrips en 1 ventana.
- ✅ Overrides + businesses + events verificados. Sin cambios en el shape del retorno.

### 1.4 Contadores estáticos
| Métrica | Pre | Post | Δ |
|---|---|---|---|
| `await` en `public-reads.functions.ts` | 26 | 22 | −4 (dos `dest.id` prefetch eliminados + dos secuencias colapsadas) |

---

## 2. Validaciones P2 — Aislamiento Studio

### 2.1 Patrón implementado en `__root.tsx`
```tsx
const EditThisPageButton = React.lazy(() =>
  import("@/components/experience-builder/EditThisPageButton").then((m) => ({
    default: m.EditThisPageButton,
  })),
);
...
<React.Suspense fallback={null}>
  <EditThisPageButton pathname={pathname} />
</React.Suspense>
```

### 2.2 Verificación de code-splitting

| Chequeo | Pre-H2 (`index-BmNy1EUv.js`) | Post-P1+P2 (`index-DSiFco-k.js`) |
|---|---|---|
| String `"Editar esta página"` presente en el entry | ✅ (1 ocurrencia) | ❌ (0 ocurrencias) |
| Chunk lazy dedicado generado | ❌ | ✅ `EditThisPageButton-CKGbsDM-.js` (raw 1 110 B / gzip 721 B / brotli-11 606 B) |
| Fallback `<Suspense fallback={null}>` (evita flash a anónimos) | n/a | ✅ |

✅ **Aislamiento funcional confirmado:** visitantes anónimos no descargan el chunk del Studio. Editores lo obtienen tras un microtick al hidratar.

### 2.3 `useSectionEditWrap` — HALLAZGO
El plan aprobado mencionaba **completar `useSectionEditWrap` sin violar Rules of Hooks, detrás de un componente admin-only con boundary**. Búsqueda en todo el codebase:

```
rg -l "useSectionEditWrap|SectionEditWrap" src/  →  (sin coincidencias)
```

⚠️ **Este hook no existe en la rama `main` ni en el merge P1+P2.** No forma parte del universo real de código de `7d8ef897`. Es trabajo pendiente que debe planearse aparte — no debe bloquear el GO/NO-GO de este benchmark porque el hook nunca se implementó.

---

## 3. Tamaños de bundle (entry chunk)

Medición reproducible con `stat -c%s`, `gzip -9`, `brotli -q 11`.

| Métrica | PRE-H2 | POST-P1+P2 | Δ absoluto | Δ % |
|---|---:|---:|---:|---:|
| Entry raw | **652 858 B** (637 KB) | **652 128 B** (637 KB) | −730 B | **−0.11 %** |
| Entry gzip -9 | **190 278 B** (186 KB) | **190 102 B** (186 KB) | −176 B | **−0.09 %** |
| Entry brotli -q 11 | **160 010 B** (156 KB) | **159 872 B** (156 KB) | −138 B | **−0.09 %** |
| Total JS todos los chunks | 3 325 KB (351 files) | 3 326 KB (353 files) | +1 KB / +2 files | +0.03 % |

**Chunk lazy nuevo `EditThisPageButton`:** 1 110 B raw / 721 B gzip / 606 B brotli-11.

### 3.1 Interpretación honesta

- La afirmación previa "**reducción del 15 % en el entry**" **no se sostiene** cuando P1+P2 se aíslan. La reducción real es marginal (**−0.1 % gzip**).
- El aislamiento del `EditThisPageButton` es **funcionalmente correcto** (la string migró al chunk lazy y el entry ya no contiene el componente), pero su peso original era pequeño porque la mayoría de sus dependencias eran ya compartidas con el resto del EB.
- El 15 % reclamado debe haber sido: (a) atribución agregada de P1+P2+P3+P4, (b) estimación optimista, o (c) medición contra un baseline distinto.

---

## 4. Mediciones fuera del alcance del sandbox

Las siguientes mediciones **no son fiables desde el sandbox** (Vite dev server ≠ Cloudflare Worker prod). Protocolo para ejecutarlas manualmente contra la rama publicada:

### 4.1 TTFB p50/p75/p95 sobre `/oriente-maya/valladolid`
```bash
URL="https://<preview-publicado-de-benchmark>/oriente-maya/valladolid"
for i in $(seq 1 30); do
  curl -w "%{time_starttransfer}\n" -o /dev/null -s "$URL"
done | sort -n | awk '
  { a[NR]=$1 }
  END { p=NR;
        printf "p50=%.3fs p75=%.3fs p95=%.3fs\n",
          a[int(p*0.50)+1], a[int(p*0.75)+1], a[int(p*0.95)+1] }'
```
Repetir contra la rama `main` pre-H2 para tener línea base.

### 4.2 Waterfall + Hydration mismatch (Playwright)
```bash
# Verificar que EditThisPageButton NO aparece a visitantes anónimos
# y que NO hay flash ni warning "Hydration mismatch" en consola
```
Snippet propuesto en `docs/benchmark-h2-p1-p2/playwright-hydration.py` (no incluido, solicítalo si lo quieres).

### 4.3 Ruta inexistente
```
curl -I https://<preview>/oriente-maya/destino-que-no-existe
# Esperado: 404 sin timeout, sin 500
```

---

## 5. GO / NO-GO para P3

| Aspecto | Veredicto |
|---|---|
| P1 correcto (joins por slug, N+1 eliminado, Promise.all) | ✅ GO |
| P2 correcto (aislamiento Studio verificable en bundle) | ✅ GO |
| Reducción del 15 % en el entry | ❌ **NO se cumple** (real: −0.1 % gzip) |
| `useSectionEditWrap` implementado con Rules of Hooks + admin boundary | ❌ **No existe en la rama** |
| TTFB medido en producción | ⏳ Pendiente medición manual (§4.1) |

### Recomendación

**GO CONDICIONADO para abrir P3** con estas correcciones al Completion Report de H2:

1. Actualizar la métrica declarada: reducción del entry por P1+P2 = **−0.1 % gzip**, no 15 %. Reasignar el 15 % (si aplica) a P3+P4 tras medirlos por separado.
2. Reclasificar `useSectionEditWrap` como **trabajo pendiente independiente**, no como parte de P2 cerrado.
3. Adjuntar mediciones reales de TTFB (§4.1) antes de declarar P1 como *"corrección de TTFB"* — hoy sólo hay evidencia de reducción de roundtrips SQL, que es prerequisito pero no equivale a TTFB medido.

P3 (análisis del bundle de 637 KB) queda **desbloqueado** en cuanto reconozcas explícitamente los tres puntos anteriores.

---

## 6. Parches aplicables

Ambos en `docs/benchmark-h2-p1-p2/patches/`:

- `0001-H2-P1-P2-isolation.patch` — formato `git apply`, incluye header humano.
- `H2-P1-P2.diff` — diff plano equivalente (mismo contenido).

### Aplicación limpia sobre `benchmark/h2-p1-p2-isolation`

Como la rama fue creada desde HEAD de `main`, ya contiene P1+P2+P3+P4+más. Para dejarla en el estado **exacto** que refleja este benchmark (pre-H2 + P1+P2 y nada más):

```bash
git fetch origin
git checkout benchmark/h2-p1-p2-isolation
git reset --hard 7280de05                                  # ← pre-H2 baseline
git apply --check docs/benchmark-h2-p1-p2/patches/H2-P1-P2.diff
git apply         docs/benchmark-h2-p1-p2/patches/H2-P1-P2.diff
git add src/lib/destinations/public-reads.functions.ts src/routes/__root.tsx
git commit -m "H2 · P1+P2 isolated benchmark (from 7d8ef897)"
git push --force-with-lease origin benchmark/h2-p1-p2-isolation
```

> `--force-with-lease` reescribe sólo la rama benchmark. **`main` no se toca.**

### Aplicación alternativa (sin `reset --hard`)

Si prefieres no reescribir la rama y sólo dejar los archivos como quedaron post-P1+P2 en la punta actual:

```bash
git checkout benchmark/h2-p1-p2-isolation -- src/lib/destinations/public-reads.functions.ts src/routes/__root.tsx
# ya-están-al-día, no hace falta parche; sólo verifica commits.
```

---

## 7. Estado final

- ✅ Fase 1 completada en sandbox aislado.
- ✅ `main` intacto.
- ✅ Parches disponibles y verificados (`git apply --check` limpio).
- ⏳ Esperando: (a) tu aplicación de parches en la rama benchmark, (b) mediciones de TTFB en producción, (c) autorización para abrir P3 con las correcciones del §5.
