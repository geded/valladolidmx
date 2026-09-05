# Lote 3H · Auditoría editorial y remediación visual transversal — v1.0

- Fecha: 2026-09-05
- Rama de trabajo: rama de edición vigente, consolidando en `integration/lovable-valladolidmx`
- HEAD inicial verificado: `7873c0ab5d2f9cc9ff6887312e3c5af49789f1b6`
- Autoridad visual vinculante: Home Premium aprobada (Valladolid.mx / Oriente Maya)
- Referencias sólo de patrón (no de identidad): Airbnb (densidad/táctil), TripAdvisor (confianza/comparación), Google Travel (orientación territorial)

---

## 1. Fase 1 · Inventario y medición

### 1.1 Rutas auditadas (10 representativas, una por familia)

| Familia | Ruta | Autoridad de render |
| --- | --- | --- |
| Home | `/` | `HomePremiumSurface` |
| Región / Atlas | `/oriente-maya/destinos` | `RegionDestinationsPremiumSurface` |
| Micrositio de destino | `/oriente-maya/valladolid` | `DestinationPremiumSurface` |
| Hoteles | `/hoteles` | `ListingPremiumSurfaceFromDTO` → `TerritorialListingReviewSurface` |
| Restaurantes | `/restaurantes` | idem |
| Casas de vacaciones | `/casas-de-vacaciones` | idem |
| Eventos | `/eventos` | idem |
| Lugares y sitios de interés | `/lugares` | idem |
| Experiencias | `/experiencias` | `ExperiencesListingSurface` |
| Rutas / itinerarios | `/rutas` | `TourismListingSurface` |

Componentes compartidos inventariados: `PublicShell`, `Container`, `BreadcrumbTerritorial` / `CompactCrumbs`, `PremiumHero`, `TourismListingSurface`, `TourismCard`, `TourismChip`, `TourismAluxPanel` (3G.1), `TravelPlanBand` (3G.2), `PublicHeader`, `PublicFooter`.

### 1.2 Medición automatizada (1440 / 834 / 430 / 390 px)

Instrumentación con navegador headless sobre las 10 rutas × 4 anchos (40 casos), midiendo desbordamiento de documento, contenedores fuera de viewport, imágenes rotas, número de `main` y `h1`, controles con altura menor a 44 px, errores de consola, escala tipográfica, familia tipográfica efectiva, ancho de contenido y ritmo vertical.

### 1.3 Matriz inicial PASS / REMEDIATE

| Hallazgo | Naturaleza | Alcance | Estado inicial |
| --- | --- | --- | --- |
| Desbordamiento horizontal, imágenes rotas, errores de consola | — | 40/40 casos | PASS |
| Un solo `main` y un solo `h1` | — | 40/40 casos | PASS |
| Ancho de contenido: 1216 px (Home/atlas/destino/experiencias/rutas) vs **1152 px** (5 familias de listado) | Deuda compartida | `TerritorialListingReviewSurface` | REMEDIATE |
| Gutter móvil: 16 px vs **32 px** (doble padding anidado) en las 5 familias de listado | Deuda compartida | idem | REMEDIATE |
| **Rastro territorial duplicado**: `PublicShell` + rastro paralelo interno con hex codificados | Deuda compartida | idem | REMEDIATE |
| Escala de titular incoherente: 53.6 / 60 px @1440 y 30 / 36 / 38.4 px @390 | Deuda compartida | tokens + 5 componentes | REMEDIATE |
| `font-serif` no resolvía a la tipografía de marca (caía a `ui-serif` del sistema) | Deuda de token | `src/styles.css` | REMEDIATE |
| Banda de Alux de los listados territoriales: bloque verde sólido de alta masa, ajeno al aligeramiento 3G.1 | Deuda compartida | `TerritorialListingReviewSurface` | REMEDIATE |
| Acción secundaria "Ver mi viaje" a ancho completo en móvil | Defecto local | idem | REMEDIATE |
| Píldoras de Alux de los listados con área táctil menor a 44 px | Deuda compartida | idem | REMEDIATE |
| Colores hex literales remanentes en la superficie territorial (`#f7f2e8`, `#0d4b38`, …) | Deuda compartida | idem | PENDIENTE (ver §5) |

---

## 2. Fase 2 · Remediación aplicada

Toda la corrección se aplicó en tokens y componentes compartidos; no se creó ningún componente paralelo, ni CSS/JSX duplicado por plantilla, ni texto administrable nuevo.

### 2.1 Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `src/styles.css` | Nuevo token `--font-serif` alineado a la voz editorial de marca; nueva utilidad única `text-display-hero` (clamp 30 → 53.6 px, `line-height` 1.03, `text-wrap: balance`). |
| `src/components/premium/PremiumHero.tsx` | Titular del layout `listing` migrado a la escala única. |
| `src/components/destination-premium/DestinationPremiumSurface.tsx` | Titular migrado a la escala única. |
| `src/components/destination-premium/RegionDestinationsPremiumSurface.tsx` | Titular migrado a la escala única. |
| `src/components/discovery/PublicShell.tsx` | Titular de cabecera migrado a la escala única. |
| `src/components/listing-premium/TerritorialListingReviewSurface.tsx` | Eliminado el doble gutter y el ancho divergente (3 envoltorios); eliminado el rastro territorial paralelo (autoridad única: `PublicShell`); titular migrado a la escala única; banda de Alux aligerada según 3G.1; acción secundaria compactada; píldoras con área táctil real de 44 px. |

### 2.2 Mediciones antes / después

| Métrica | Antes | Después |
| --- | --- | --- |
| Ancho de contenido @1440 (5 familias de listado) | 1152 px | **1216 px** (idéntico a Home) |
| Gutter @390 (5 familias de listado) | 32 px (326 px útiles) | **16 px (358 px útiles)** |
| Titular @1440 | 53.6 / 60 px según familia | **53.6 px en las 10 rutas** |
| Titular @390 | 30 / 36 / 38.4 px | **30 px en las 10 rutas** |
| Familia tipográfica del titular | Fraunces y `ui-serif` mezcladas | **Fraunces en las 10 rutas** |
| Rastros territoriales por página de listado | 2 | **1** |
| Altura de la banda de Alux en listados | bloque verde sólido, avatar 48 px, píldoras 36 px | superficie tenue con borde, avatar 32 px, píldoras 32 px visuales / 44 px táctiles |
| Controles < 44 px @1440 (`/hoteles`) | 35 | **29** |
| Controles < 44 px @390 (`/eventos`) | 31 | **28** |

### 2.3 Criterios visuales verificados

- Todas las páginas comparten ancho, escala tipográfica, ritmo y voz tipográfica.
- Territorio, fotografía y productos conservan la primera jerarquía; Alux (3G.1) y Mi Viaje (3G.2) permanecen como ayudas secundarias.
- Escritorio: composición amplia y simétrica, sin estiramientos. iPad: rejillas equilibradas. 430/390: rail y disclosure, sin sábanas de píldoras.
- Estados vacíos honestos ya existentes; sin mocks ni datos inventados.

---

## 3. Validación

| Verificación | Resultado |
| --- | --- |
| Typecheck (`tsgo --noEmit`) | PASS · 0 errores |
| Build (`bun run build`) | PASS · exit 0 |
| Suite oficial (`bun test`) | PASS · **777/777**, 5297 expect(), 0 fail |
| Route Inventory | PASS · **246 rutas cubiertas** |
| QA responsive 10 rutas × 4 anchos | PASS · **40/40**, 0 px de desbordamiento |
| Imágenes rotas | 0 |
| Errores nuevos de consola | 0 |
| Un solo `main` / un solo `h1` | 40/40 |
| Capturas 1440/834/430/390 (Home, listado, listado territorial, micrositio) | 16 capturas comparables |

---

## 4. Matriz final por familia

| Familia | Ancho | Titular | Rastro | Alux/Mi Viaje | Responsive | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Home | PASS | PASS | PASS | PASS | PASS | PASS |
| Región / Atlas | PASS | PASS | PASS | PASS | PASS | PASS |
| Micrositio de destino | PASS | PASS | PASS | PASS | PASS | PASS |
| Hoteles | PASS | PASS | PASS | PASS | PASS | PASS |
| Restaurantes | PASS | PASS | PASS | PASS | PASS | PASS |
| Casas de vacaciones | PASS | PASS | PASS | PASS | PASS | PASS |
| Eventos | PASS | PASS | PASS | PASS | PASS | PASS |
| Lugares y sitios de interés | PASS | PASS | PASS | PASS | PASS | PASS |
| Experiencias | PASS | PASS | PASS | PASS | PASS | PASS |
| Rutas / itinerarios | PASS | PASS | PASS | PASS | PASS | PASS |

Sin FAIL y sin NO VERIFICADO.

---

## 5. Pendientes reales (documentados, no bloquean el cierre)

1. **P1 · Migración de hex literales a tokens** en `TerritorialListingReviewSurface` (`#f7f2e8`, `#0d4b38`, `#ded7c9`, `#ba641e`, …). Requiere la Regla de Migración Visual Segura (paso a paso, comparativa y validación del Founder entre pasos); excede el alcance autorizado de 3H.
2. **P1 · Enlaces de texto en línea con altura menor a 44 px** (rastro, pie, enlaces dentro de párrafos). Cumplen WCAG 2.2 AA como enlaces en línea; se listan para una revisión táctil dedicada.
3. **P1 · Perfiles individuales** (`/hoteles/$slug`, `/lugares/$slug`, etc.) auditados por muestreo dentro de sus familias; una pasada dedicada por perfil queda propuesta para un lote posterior.

---

## 6. Límites respetados

No se modificaron datos reales ni demo, CMS, migraciones, RLS, contratos funcionales, lógica de filtros, Alux o Mi Viaje, rutas, mapas, claves, dominios, pagos, reservaciones, monitoreo ni flags. No se crearon ramas persistentes, PR, fusiones ni despliegues; no se tocó `main`. No se avanzó a ningún otro lote.
