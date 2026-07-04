
# Épica E3 · Retiro Total de "Marketplace" (Programa A · Carril A · v0.63.0)

**Prioridad:** ANTES de US-E2.3 (E2.3 queda pausada hasta cerrar E3).
**Autorización:** Founder 2026-07-04 (respuesta afirmativa a alcance C + prioridad "antes").
**Referencias vinculantes:** `mem://roadmap/retire-marketplace-terminology.md`, `docs/blueprint/15.11-NAVIGATION-BLUEPRINT-v1.0.md`, `docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.0.md`.

## Objetivo

Eliminar por completo el término **"Marketplace"** del ecosistema Valladolid.mx y sustituirlo por lenguaje territorial-turístico (Oriente Maya, Catálogo, Explorar, Descubre). Esto incluye rutas públicas, breadcrumbs, CTAs, copies, SEO, sitemap, código fuente y carpetas.

Justificación de producto: "Marketplace" es lenguaje SaaS/comercio digital que no significa nada para un turista y rompe la narrativa territorial del proyecto (Oriente Maya, Pueblos Mágicos, patrimonio).

## Alcance (Opción C confirmada)

Retiro completo en 3 sub-olas encadenadas:

- **E3.1 — Lenguaje visible + SEO** (bajo riesgo, valor inmediato)
- **E3.2 — Rutas públicas + 301** (Fase 2 de Navigation Blueprint)
- **E3.3 — Código legacy** (carpeta `src/routes/marketplace/`, componentes marcados, fallbacks internos)

Cada sub-ola cierra con Completion Report, Demo Pack y validación Founder antes de arrancar la siguiente.

---

## E3.1 — Lenguaje visible + SEO

**Toca solo capa de presentación y metadata. Cero cambios de rutas ni de código de negocio.**

### Inventario a modificar

1. **Header / Mega Menú** (`src/components/layout/PrimaryMegaMenu.tsx`, `SiteHeader.tsx`)
   - "Marketplace" → "Catálogo Oriente Maya" (o "Explorar")
2. **Footer** (`src/components/layout/SiteFooter.tsx`, `src/components/discovery/PublicFooter.tsx`)
   - Links y secciones nombradas "Marketplace"
3. **Breadcrumbs territoriales** (`src/components/layout/BreadcrumbTerritorial.tsx`, `src/lib/navigation/breadcrumbs.ts`)
   - Etiquetas "Marketplace" en trail legacy
4. **Home** (`src/components/home/EmpresasSection.tsx`, `ResenasSection.tsx`, CTAs)
5. **CTAs** en Business/Product/Destination/Category surfaces
6. **Copies i18n** (`src/i18n/locales/{es,en,de,fr,it,pt}.json`)
   - Claves con "marketplace" → renombradas a `catalog.*` / `explore.*` (mantener retrocompatibilidad de claves durante ciclo)
7. **SEO** (`src/lib/discovery/seo.ts`, `head()` de rutas legacy `/marketplace/*`)
   - Titles/descriptions/OG que mencionan "Marketplace" → "Catálogo Oriente Maya"
8. **Copies de Studio / Experience Builder** visibles al empresario
   - Solo lo que aparece en UI del CMS/Portal, no nombres técnicos internos
9. **Alux prompts / mensajes** que digan "marketplace"

### Reglas de sustitución

| Antes | Después |
|---|---|
| Marketplace | Catálogo Oriente Maya · Explorar · Descubre |
| "Ver en Marketplace" | "Ver ficha completa" · "Explorar" |
| "Marketplace de Valladolid" | "Catálogo Oriente Maya" |
| "/marketplace" (label) | "Catálogo" (label; ruta se conserva en E3.1) |

### DoR / DoD E3.1

- DoR: inventario cerrado, tabla de sustitución aprobada, cero cambios de rutas.
- DoD: typecheck ✅, build ✅, smoke visual en Home / Business / Product / Destination / Category / Search, sin cadena "Marketplace" en UI pública ni en `<title>`/`og:*`, Completion Report `16.05-E3-US-E3.1-COMPLETION-REPORT-v1.0.md`, Demo Pack con screenshots antes/después.

---

## E3.2 — Rutas públicas + 301 (Fase 2 Navigation Blueprint)

**Activa la Fase 2 de redirecciones legacy → territorial que quedó pausada en N2.**

### Cambios

1. **Redirecciones 301**
   - `/marketplace` → `/oriente-maya`
   - `/marketplace/buscar` → `/oriente-maya/buscar` (nueva o alias)
   - `/marketplace/$slug` → resolución territorial `/oriente-maya/:destino/:categoria/:empresa` vía `resolvePublicRoute` + `page_redirects`
   - Implementación: server route `src/routes/marketplace/$.tsx` que emite 301 permanente hacia el path territorial resuelto por `resolveCanonicalPath` / `resolvePublicRoute`.
2. **Sitemap** (`src/routes/sitemap[.]xml.ts`)
   - Eliminar entradas `/marketplace/*`, dejar solo `/oriente-maya/*` como canónicas.
3. **Canonicals**
   - Ninguna URL pública debe emitir `<link rel="canonical" href=".../marketplace/...">`. Toda ficha usa canonical territorial (ya cubierto por N2, verificar).
4. **Enlaces internos**
   - Auditar `href` / `<Link to>` restantes hacia `/marketplace/*` en superficies públicas y migrar a `resolveCanonicalPath`.
5. **`robots.txt`** — sin cambios (no bloquear las URLs legacy, se resuelven vía 301).

### DoR / DoD E3.2

- DoR: E3.1 cerrada y validada, matriz de redirecciones aprobada, Founder autoriza activar Fase 2.
- DoD: typecheck ✅, build ✅, tests Playwright E2E confirmando 301 correctos + canonicals + sitemap limpio, cero enlaces internos vivos hacia `/marketplace/*` en superficies públicas, Completion Report `16.06-E3-US-E3.2-COMPLETION-REPORT-v1.0.md`, Demo Pack con curl HTTP mostrando 301.

---

## E3.3 — Código legacy

**Retiro físico de la carpeta `src/routes/marketplace/` y componentes marcados como legacy tras confirmar que E3.2 lleva ≥ 1 ciclo estable.**

### Cambios

1. **Rutas legacy**
   - Sustituir `src/routes/marketplace/{index,buscar,$slug}.tsx` por un único catch-all `src/routes/marketplace/$.tsx` que emita 301 (movido desde E3.2) — o bien retirar la carpeta y mover el 301 a un handler equivalente bajo `/api/public/redirect` + fallback en `not-found`.
   - Decisión técnica: **conservar** un único `src/routes/marketplace/$.tsx` catch-all como puente 301 permanente (compatibilidad con backlinks externos, buscadores y bookmarks). El resto de archivos de la carpeta se eliminan.
2. **Componentes**
   - `src/components/marketplace/*` — evaluar cada uno:
     - `AddToCartButton`, `ProductActions`, `FavoriteButton` → renombrar carpeta a `src/components/commerce/` o `src/components/product-actions/` (funcionalidad se conserva).
   - Actualizar todos los imports.
3. **Server functions**
   - `src/lib/marketplace/*.functions.ts` → mover a `src/lib/catalog/` o `src/lib/oriente-maya/` (funcionalidad idéntica, solo naming).
   - Actualizar imports en surfaces, adapters y loaders.
4. **Adapters**
   - `src/lib/experience-builder/adapters/business-related-to-block.ts` y `product-related-to-block.ts` — ajustar imports y fallback href (`/marketplace/${slug}` → resolver a `/oriente-maya/...` con warning si falta destino/categoría).
5. **Docs blueprint**
   - No modificar reportes históricos (14.40.*, 15.10.5d.3, H-03/I2.d). Se mantienen como registro histórico. Solo se agrega nota al pie en 16.00 marcando la deuda como cerrada.
6. **Memoria**
   - Actualizar `mem://roadmap/retire-marketplace-terminology.md` con estado "IMPLEMENTADA".

### DoR / DoD E3.3

- DoR: E3.2 estable ≥ 1 ciclo, sin regresiones reportadas, Founder autoriza retiro físico.
- DoD: typecheck ✅, build ✅, `rg -i "marketplace" src/` solo devuelve el catch-all 301 y comentarios de compatibilidad, Playwright confirma que `/marketplace/*` sigue emitiendo 301 correctos, Completion Report `16.07-E3-US-E3.3-COMPLETION-REPORT-v1.0.md`.

---

## Detalles técnicos (para el implementador)

- **Naming oficial adoptado:** "Catálogo Oriente Maya" para la superficie global; "Explorar" para el CTA compacto; "Descubre" en secciones contextuales.
- **Contrato de navegación:** solo `resolveCanonicalPath` de `@/lib/navigation/canonical-paths`. Prohibido hardcodear `/marketplace/...` fuera del catch-all 301.
- **Retrocompatibilidad de claves i18n:** durante E3.1 se duplican claves (`nav.marketplace` + `nav.catalog`) apuntando al mismo texto nuevo; en E3.3 se elimina la clave legacy.
- **`page_redirects`:** las 301 de `/marketplace/$slug` → territorial se registran vía la infraestructura existente de N2 (US-R3), no vía middleware ad-hoc.
- **SEO:** verificar `robots.txt`, `sitemap.xml`, canonicals con Playwright + curl.
- **Cero cambios en RLS, Cloud, Portal Empresarial o CMS Studio funcional.** Solo naming y navegación.

## Registro en el Roadmap

- Añadir épica **E3 · Retiro Marketplace** a `docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.0.md`:
  - Programa: A (Visitor)
  - Carril: A (Producto)
  - Versión objetivo: v0.63.0
  - Dependencias: N2 cerrada ✅, Navigation Blueprint v1.0 ✅
  - Valor: coherencia narrativa, cierre de deuda documentada, prepara Header Builder futuro
- **US-E2.3 (Related Category Surface)** se re-agenda a **v0.64.0**, después de E3.

## Fuera de alcance

- Retiro de "Marketplace" en documentación histórica del blueprint (se conserva como registro).
- Renombrado de tablas Supabase o RPCs con "marketplace" en el nombre (naming técnico interno; se evalúa en una épica de hardening B posterior).
- Cambios funcionales al carrito, órdenes o pagos.

## Confirmación

¿Apruebas este plan (E3.1 → E3.2 → E3.3, una sub-ola por ciclo con validación Founder entre cada una) para arrancar de inmediato con **US-E3.1 · Lenguaje visible + SEO**?
