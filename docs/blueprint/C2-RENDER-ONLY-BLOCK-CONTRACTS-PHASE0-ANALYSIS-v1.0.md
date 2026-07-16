# C2 · Render-Only Block Contracts — Fase 0 · Análisis

**Estado:** Fase 0 (análisis, sin implementación)
**Alcance:** exclusivamente los entregables solicitados por la autorización Founder. No modifica `block-library.ts` ni separa contratos.

---

## 1. Mapa exacto de imports de Zod

### 1.1 Contratos de bloques (`src/lib/experience-builder/blocks/*/contract.ts`)

13 contratos, todos importan `zod` a nivel de módulo (`import { z } from "zod"`).

| Contrato | Refs Zod | Madurez schema |
|---|---:|---|
| experience-related-collection | 146 | Alta (unions, refinements, defaults) |
| experience-reviews | 120 | Alta |
| experience-promotions | 94 | Alta |
| experience-products | 87 | Alta |
| experience-hero | 69 | Alta |
| experience-gallery | 48 | Media |
| experience-section | 45 | Media |
| experience-cta-bar | 40 | Media |
| experience-institutional-badges | 39 | Media |
| experience-features | 35 | Baja |
| experience-subnav | 33 | Baja |
| experience-info-grid | 33 | Baja |
| experience-map | 30 | Baja |

### 1.2 Otros imports de Zod (58 archivos)

- **Server functions** (`src/lib/**/*.functions.ts`, `src/routes/api/public/**`): ~40 archivos. No llegan al entry cliente (grafo server-only o handler stripped en `createServerFn`).
- **MCP tools** (`src/lib/mcp/**`): 4 archivos server-only.
- **Otros contratos** (`src/lib/traveler/anonymous-draft/contract.ts`, `src/lib/visitor-intel/*`): fuera del scope C2.

### 1.3 Ruta real de la fuga al entry

```
src/routes/index.tsx
  └─ CompositionRenderer (composition-renderer.tsx)
        └─ import { ExperienceHeroBlock } from ".../ExperienceHeroBlock"
              └─ import { experienceHeroConfigSchema } from ".../contract"   ← runtime Zod
```

Los 13 `*Block.tsx` wrappers importan a runtime el schema Zod del contrato correspondiente para ejecutar `safeParse(config)` en render. Como `CompositionRenderer` los agrupa por import estático, TODO el árbol Zod de los 13 contratos entra al chunk que resuelve `/` (entry).

Atribución P3: **≈ 68 KB raw / ≈ 22 KB gzip** asignados a `npm:zod` en el entry.

Confirmado en cliente:
- `Experience*.tsx` (presentacional puro): `import type` únicamente. No es la fuente de la fuga.
- `Experience*Block.tsx`: `import { *ConfigSchema }` runtime. **Fuente confirmada.**
- `adapters/*.ts`: `import type` únicamente.

---

## 2. Qué contratos requieren validación runtime

| Superficie | ¿Runtime validation? | Motivo |
|---|---|---|
| Studio (Visual + Profesional) | Sí | Editar/guardar `config`; feedback en línea. |
| CMS server fns (`savePageComposition`, `syncBlockLibrary`, `validateComposition`) | Sí | Único punto de escritura; integridad de datos. |
| Experience Builder canvas | Sí | Aplicación de mutaciones cliente. |
| Preview (`/preview/composition.$token`) | Parcial | `config` ya persistido y validado; render puede confiar en tipos. |
| Superficies públicas (`/`, `/l/*`, `/p/*`, `/producto/*`, `/oriente-maya/*`, `/arma-tu-viaje`, `/alux`) | **No** | Lectura de `config` ya validado en escritura. |
| Adapters (`adapters/*.ts`) | No | Sólo tipos. |
| Renderers presentacionales (`Experience*.tsx`) | No | Sólo tipos. |

**Conclusión:** validación runtime imprescindible sólo en la ruta de **escritura/edición**. La ruta de **lectura/render público** requiere únicamente tipos + defaults.

---

## 3. Superficies públicas que necesitan sólo tipos/render

Consumen `CompositionRenderer` sin editar `config`:

- `/` (`src/routes/index.tsx`)
- `/l/$slug`, `/p/$slug`, `/producto/$slug`
- `/oriente-maya/*` (index, destino, categoria, empresa, producto)
- `/arma-tu-viaje`, `/alux`
- `/preview/composition/$token`
- `/_authenticated/portal/productos.$productId.preview` (usa el mismo renderer)

Todas se benefician del contrato render-only.

---

## 4. Dependencias por consumidor

| Consumidor | Necesita | Estado actual | Objetivo C2 |
|---|---|---|---|
| Studio Visual (`VisualStudio.tsx`) | Schemas Zod + tipos + defaults + validación campo a campo | Runtime Zod completo | Sin cambios (chunk Studio ya aislado en H2·P2) |
| Studio Profesional | Idem | Runtime Zod | Sin cambios |
| Server fns `savePageComposition` / `syncBlockLibrary` / `validateComposition` | Schemas Zod | Runtime Zod (server bundle) | Sin cambios |
| Preview | Tipos + renderer | Runtime Zod vía Blocks | **Renderer render-only** |
| CMS admin panels de edición | Schemas Zod | Runtime Zod | Sin cambios |
| `CompositionRenderer` (público) | Tipos + defaults ligeros | Runtime Zod (leak entry) | **Renderer render-only** |
| Adapters | Tipos | `import type` ya | Sin cambios |
| `block-library.ts` / `block-registry.ts` | Metadatos + schema descriptor | Sin Zod runtime propio | Sin cambios |

---

## 5. Propuesta: separar contratos render-only sin crear un segundo modelo

**Regla vinculante (Single Source of Truth Policy · Iniciativa 3):** una única fuente contractual por bloque. `contract.ts` sigue siendo la fuente ejecutable de verdad. No se duplica, no se degrada, no se versiona en paralelo.

### 5.1 Patrón "split-file, single-source"

Cada bloque se descompone en 3 archivos co-ubicados, sin duplicar información:

```
src/lib/experience-builder/blocks/experience-hero/
  ├── types.ts       ← TIPOS TS puros (types derivados/manuales)
  ├── defaults.ts    ← Objeto de defaults tipado con types.ts (sin Zod)
  └── contract.ts    ← Zod schemas + re-export de types + import de defaults
```

- `types.ts` no importa `zod`.
- `defaults.ts` no importa `zod`; consume `types.ts`.
- `contract.ts` importa `zod`, `types.ts` y `defaults.ts`. Declara los schemas usando `.default(DEFAULTS.X)` y `satisfies z.ZodType<T>` para forzar sync tipo↔schema.
- **Prueba estática obligatoria** (`type _Assert = Expect<Equal<z.infer<typeof schema>, T>>`) que rompe `tsgo` si divergen. Sin este check no se abre C2.F2.

### 5.2 Bloques (wrappers) — refactor

`Experience*Block.tsx` deja de importar `contract.ts` a runtime. Divide en:

- `ExperienceHeroBlock.render.tsx` (render-only): usa `types.ts` + `defaults.ts`. Asume `config` ya validado. Aplica defaults por spread. Render.
- `ExperienceHeroBlock.editor.tsx` (edición): usa `contract.ts` para `safeParse` y feedback en Studio.

`CompositionRenderer` importa `.render.tsx`. Studio importa `.editor.tsx`. Ambos comparten el componente presentacional `Experience*.tsx` (que ya hoy no usa Zod).

### 5.3 Cómo se preserva la fuente única

- **Schema Zod** = fuente ejecutable, unica.
- **Tipos TS** = declarados en `types.ts`, **importados** por `contract.ts` y usados con `satisfies z.ZodType<T>` — cualquier drift falla en typecheck.
- **Defaults** = declarados en `defaults.ts`, **importados** por `contract.ts` (`.default(DEFAULTS.foo)`) y por el renderer render-only. Un solo valor.
- **Escritura** = sigue pasando por Zod obligatoriamente (Studio + server fn). No existe ruta de escritura render-only.

No hay duplicación. Sólo se separan responsabilidades dentro del mismo dominio.

---

## 6. Ahorro medido esperado

Baseline actual (entry client post-C1):

- raw: **527 758 B** · gzip: **154 134 B** · brotli-11: **130 336 B**

Atribución P3 a `npm:zod` en el entry: **68 068 B raw / ≈ 22 KB gzip**.

Escenarios sobre el entry:

| Escenario | Zod removido del entry | Δ raw | Δ gzip | Δ brotli |
|---|---|---:|---:|---:|
| A · 13 bloques render-only | 100 % | ≈ −68 KB | **−20 a −22 KB** | −16 a −18 KB |
| B · 5 bloques altos únicamente | ~70 % | ≈ −48 KB | −14 a −15 KB | −12 KB |
| C · Solo lazy-load Studio (no refactor) | 0 % del entry | 0 | 0 | 0 |

**Objetivo declarado C2:** Escenario A → **≈ −13 % gzip** del entry (154 KB → ~132 KB) sin degradar Studio ni Preview.

Ahorro atribuible medido con el mismo protocolo H2·FASE 1 (comparación baseline vs post-cambio, misma toolchain).

---

## 7. Riesgos

### 7.1 SSR / hydration

`CompositionRenderer` corre en SSR y cliente. El path render-only debe producir el mismo árbol.

- Riesgo: coerciones/defaults hoy aplicados por Zod (`.default(...)`, `.catch(...)`, `.transform(...)`) no ocurren si se omite `safeParse`.
- Mitigación: `defaults.ts` centraliza los defaults; render-only aplica spread `{ ...DEFAULTS, ...config }`. Test golden por bloque comparando `schema.parse(input)` vs `applyDefaults(input)` bit-exact sobre un corpus de fixtures. Los bloques con `.transform()` no complementable por spread no migran hasta rediseñar el default.

### 7.2 Compatibilidad de contratos públicos

- `contractVersion` no cambia. Nombres exportados no cambian. Adapters y DTOs siguen igual.

### 7.3 Data drift

- Si un `config` en DB no cumple el schema, hoy `safeParse` cae a fallback. En render-only, drift podría renderizar mal en silencio.
- Mitigación: validación estricta en escritura ya garantiza integridad; agregar job `validateAllCompositions` que audite drift en DB con reporte. Sin ese job no se cierra C2.F5.

### 7.4 Studio & Preview

- Studio: sin cambios. Sigue con `contract.ts`.
- Preview: usa `CompositionRenderer` render-only → riesgo bajo si §7.1 se cumple.

### 7.5 Divergencia tipo ↔ schema

- Riesgo alto si `types.ts` y `contract.ts` evolucionan por separado.
- Mitigación: `satisfies z.ZodType<T>` + test estático de igualdad que rompe typecheck. Bloqueante para escalar.

### 7.6 Bloques con lógica de parseo no trivial

- `experience-related-collection`, `experience-reviews`, `experience-promotions`: schemas con unions/refinements. Auditar por bloque antes de migrar; el piloto define si algún bloque queda excluido de C2.

---

## 8. Estrategia de rollback

- Migración por bloque, un commit por bloque.
- `Block.tsx` legacy se conserva intacto durante toda la migración; el switch vive en el import de `composition-renderer.tsx`.
- Rollback por bloque = revertir el import del renderer al `Block.tsx` legacy.
- Rollback global = revertir el commit de wire-up.
- Sin cambios de schema/contract público → rollback no toca datos.
- No se propone flag runtime; aislamiento en bundler.

---

## 9. Matriz Archivo → Contrato actual → Contrato propuesto → Consumidores → Riesgo

Patrón repetido para los 13 bloques. Se muestra `experience-hero` como plantilla:

| Archivo | Contrato actual | Contrato propuesto | Consumidores | Riesgo |
|---|---|---|---|---|
| `blocks/experience-hero/contract.ts` | Zod + types + defaults inline | Zod + re-export types + import defaults | Studio, server fns, adapters (tipos), editor wrapper | Medio |
| `blocks/experience-hero/types.ts` | — | Types TS puros (**nuevo**) | Renderer render-only, adapters, presentacional | Bajo |
| `blocks/experience-hero/defaults.ts` | — | Defaults tipados (**nuevo**) | Renderer render-only, `contract.ts` `.default()` | Bajo |
| `components/.../ExperienceHeroBlock.tsx` | Importa schema Zod, ejecuta `safeParse` | Se divide en `.render.tsx` (types+defaults) y `.editor.tsx` (schema) | `CompositionRenderer` (render), `VisualStudio` (editor) | Medio |
| `composition-renderer.tsx` | Importa `Block.tsx` (con Zod) | Importa `Block.render.tsx` (sin Zod) | Todas las rutas públicas | Alto (SSR) |
| `VisualStudio.tsx` | Importa `Block.tsx` | Importa `Block.editor.tsx` | Studio only | Bajo |
| `adapters/*.ts` | `import type` | Sin cambios | Todas las superficies | Nulo |
| `block-library.ts` | Descriptores metadata | Sin cambios | Registry, sync DB | Bajo |

13 bloques × 3 archivos + 1 wire-up global = 40 unidades de trabajo, agrupadas en fases (§10).

---

## 10. Plan de olas propuesto (a autorizar por separado)

1. **C2.F1 · Piloto** — `experience-map` (schema más ligero, 30 refs Zod). Valida patrón end-to-end, hydration bit-exact, test estático tipo↔schema, medición aislada.
2. **C2.F2 · Bloques bajos (4)** — map (ya), subnav, info-grid, features.
3. **C2.F3 · Bloques medios (4)** — section, cta-bar, institutional-badges, gallery.
4. **C2.F4 · Bloques altos (5)** — hero, products, promotions, reviews, related-collection.
5. **C2.F5 · Wire-up final + retiro de `Block.tsx` legacy + job `validateAllCompositions`.**

Cada fase con Completion Report y medición aislada bajo protocolo H2·FASE 1.

---

## 11. Restricciones vinculantes reiteradas

- Prohibido duplicar schemas — `types.ts` es re-exportado por `contract.ts`.
- Prohibido degradar validación en escrituras — Studio y server fns mantienen `safeParse` completo.
- Prohibido cambiar `contractVersion` o nombres exportados.
- Prohibido afectar Studio o Preview en su comportamiento actual.
- Prohibido implementar antes de la autorización Founder para C2.F1.

---

## 12. Veredicto de Fase 0

**Recomendación:** GO CONDICIONADO para abrir **C2.F1 · Piloto** con `experience-map`, bajo el patrón "split-file, single-source" descrito en §5. La condición es que el piloto entregue:

1. Evidencia bit-exact de hydration (SSR ↔ cliente) sobre corpus de fixtures.
2. Test estático `satisfies z.ZodType<T>` + `Equal<z.infer<schema>, T>` operativo.
3. Medición aislada del entry (baseline vs post-C2.F1) bajo protocolo H2·FASE 1.

Sin esa evidencia, C2 no debe escalar a F2.

**No se implementa nada en este entregable.** Se espera autorización explícita para abrir C2.F1.
