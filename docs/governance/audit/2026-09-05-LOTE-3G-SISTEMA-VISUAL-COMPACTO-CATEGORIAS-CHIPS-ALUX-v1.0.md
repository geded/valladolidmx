# Lote 3G · Sistema visual compacto y responsive para Categorías, Chips y Alux

**Fecha:** 2026-09-05 · **Rama:** rama de edición sobre `integration/lovable-valladolidmx` (sin ramas nuevas)
**Autorización:** Founder — remediación visual transversal. Referencia vinculante: Home Premium aprobada.
**Estado:** CERRADO SIN FAIL NI NO VERIFICADO.

---

## 1. Alcance ejecutado

Se corrigieron los **primitives compartidos** (no parches por página):

| Área | Autoridad única corregida |
|---|---|
| Categorías | `src/components/omxds/CategoryNavGrid.tsx` |
| Chips / píldoras | `src/components/omxds/TourismChip.tsx` (**nuevo**: `TourismChip` + `TourismChipRow`) |
| Alux embebido (barra Home/Atlas) | `src/components/home-premium/shared/PremiumShowcase.tsx` → `PremiumAluxBar` |
| Alux embebido (panel turístico) | `src/components/alux/TourismAluxPanel.tsx` |
| Anti-superposición flotante | `src/lib/alux/embedded-presence.ts` (**nuevo**) + `src/lib/alux/floating-presence.ts` |

No se creó ningún motor, registry ni sistema de diseño nuevo: `TourismChip` es un primitive OMXDS dentro de la biblioteca existente.

---

## 2. Cambios visuales

**Categorías (`CategoryNavGrid`)**
- Tarjeta compacta: padding 10 px, gap 6 px, icono 32/36/40 px (antes 40/44/48), etiqueta 13 px a máximo 2 líneas.
- Altura medida: **86 px @1440 · 82 px @834 · 96 px @430/390** (antes 93–101 px con huecos verticales).
- Móvil (<640 px): **rail horizontal con snap** — desaparece la columna vertical pesada y el elemento huérfano "Blog".
- Tablet: 3 columnas (`sm`) → 4 columnas (`md`), simétricas. Escritorio: la plantilla sigue gobernando con `desktopColumnsClassName`.
- Se conservan `min-h-[44px] min-w-[44px]`, `data-omxds-touch-target="44"`, foco visible y `h-full` (filas parejas, sin vacíos).
- Prop nueva y aditiva `mobileLayout?: "rail" | "grid"` (por defecto `rail`).

**Chips (`TourismChip` / `TourismChipRow`)**
- Misma altura, radio `rounded-pill`, tipografía 13 px y ritmo en toda la plataforma.
- Alto real **44 px en móvil y tablet**; 40 px sólo desde `lg` (puntero fino).
- Estados coherentes: normal · hover · **seleccionado** (`aria-pressed`) · foco visible · disabled.
- Dos esquemas de color tokenizados: `surface` (sobre tarjeta) y `onDark` (verde selva). Sin colores hardcodeados.
- `behavior="wrap"` (Alux Home) y `behavior="rail"` (scroll horizontal accesible con snap). **Cero clipping**: "Con amigos" ya no se corta en ningún ancho.

**Alux embebido**
- Módulo verde reducido: padding 14/16 px, avatar 40/48 px, título 16/18 px — menos peso visual, misma presencia de marca y mismos activos oficiales.
- Jerarquía clara: identidad → pregunta → chips → acción.
- CTA de flecha aislada sustituido por **"Planear con Alux"** con brújula, conectado al mismo `openAluxFloating` (lógica intacta).
- Panel turístico: eliminada la pista duplicada "Estoy planeando" (**corrige la advertencia de clave React duplicada** en `/oriente-maya/valladolid`).
- Anti-superposición: mientras un módulo de Alux embebido está en pantalla (`IntersectionObserver`), el disparador flotante se retira (`reason: "alux-embedded"`), sin tocar su lógica ni la de "Mi Viaje".

**Hallazgos P1 resueltos en el mismo alcance**
- Un solo `<main>` por página: `HomePremiumSurface`, `RegionDestinationsPremiumSurface`, `DestinationMicrositeReviewSurface`, `EventPremiumSurface` y `TerritorialListingReviewSurface` (×3) pasan a `<div>` dentro del `<main id="main">` de `PublicShell`.
- Clave React duplicada del micrositio Valladolid: corregida (dedupe de pistas).
- Táctiles críticos: botón "Menú" 36→44 px, selector de idioma 30→44 px, disparador flotante 42→44 px.

---

## 3. Matriz de superficies (40 casos = 10 superficies × 4 anchos)

Superficies: `/` · `/oriente-maya` · `/oriente-maya/destinos` · `/oriente-maya/valladolid` · `/oriente-maya/valladolid/hoteles` · `/hoteles` · `/lugares` · `/experiencias` · `/eventos` · `/restaurantes`.
Anchos: 1440 · 834 · 430 · 390.

| Criterio | Resultado |
|---|---|
| HTTP | 40/40 · 200 |
| Overflow horizontal | 0 px en 40/40 |
| `<main>` por página | 1 en 40/40 |
| `<h1>` por página | 1 en 40/40 |
| Chips recortados | 0 |
| Imágenes rotas | 0 |
| Errores nuevos de consola | 0 |
| Botones críticos < 44 px | 0 en 834/430/390; en 1440 sólo los chips de 40 px (diseño denso de escritorio) |

Evidencias por elemento: `cat-{1440,834,430,390}.png` y `alux-{1440,834,430,390}.png` (rejilla de categorías y módulo de Alux en los cuatro anchos).

---

## 4. Verificaciones

| Verificación | Resultado |
|---|---|
| Typecheck (`bunx tsgo --noEmit`) | PASS · sin errores |
| Build (`bun run build`) | PASS · exit 0 |
| Suite completa (`bun test scripts`) | **777 pass · 0 fail** · 5297 expects · 73 archivos |
| Route Inventory | PASS · 246 rutas cubiertas |
| QA responsive | PASS · 40/40 casos |

---

## 5. Archivos modificados

Nuevos:
- `src/components/omxds/TourismChip.tsx`
- `src/lib/alux/embedded-presence.ts`

Modificados:
- `src/components/omxds/CategoryNavGrid.tsx`
- `src/components/home-premium/shared/PremiumShowcase.tsx`
- `src/components/alux/TourismAluxPanel.tsx`
- `src/lib/alux/floating-presence.ts`
- `src/components/layout/AluxFloatingTrigger.tsx`
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/LanguageSwitcher.tsx`
- `src/components/home-premium/HomePremiumSurface.tsx`
- `src/components/destination-premium/RegionDestinationsPremiumSurface.tsx`
- `src/components/destination-premium/DestinationMicrositeReviewSurface.tsx`
- `src/components/surfaces/EventPremiumSurface.tsx`
- `src/components/listing-premium/TerritorialListingReviewSurface.tsx`

No se tocaron: datos reales ni demo, CMS, migraciones, RLS, mapas, claves, variables, dominios, allowlists, pagos, reservaciones, monitoreo ni flags. Sin ramas, PR, merge, despliegue ni `main`.

---

## 6. Pendientes reales (no bloquean, fuera de alcance autorizado)

1. Enlaces de texto en prosa y pie de página por debajo de 44 px de alto (patrón de lectura, no controles táctiles críticos). Requiere decisión de diseño del Founder.
2. Migrar a `TourismChip` los chips de filtros de listados (`ExperienceFiltersBar` y equivalentes), hoy visualmente correctos pero con implementación propia.
3. `AluxGuide` de `DestinationMicrositeReviewSurface` (superficie interna de revisión) mantiene chips locales; se unificará cuando esa superficie se migre.

No se avanzó a ningún otro lote.
