# SEO.A1 · SEO Evolution & Launch Readiness — Fase 0 · Inventario (sólo lectura)

**Versión:** 1.0
**Fecha:** 2026-07-16
**Alcance autorizado:** SOLO lectura. Ningún ajuste SEO implementado en Fase 0.
**Aislamiento:** No comparte módulos con C2.F1 (rutas + `src/lib/discovery/seo.ts` vs `src/lib/experience-builder/blocks/experience-map/*`).

---

## 1. Método

Auditoría estática sobre el árbol `src/routes/`, `src/lib/discovery/`, `public/` y navegación:

- Rutas totales en `src/routes/` (públicas + protegidas): 62 archivos.
- Rutas con `head()` propio: **108** (incluye subrutas). Cobertura de metadatos base amplia, dispersa en calidad.
- Fuentes centralizadas: `src/lib/discovery/seo.ts` (canonical, OG, Twitter, JSON-LD helpers).
- `public/robots.txt` presente. `public/llms.txt` presente. Sitemap dinámico en `src/routes/sitemap[.]xml.ts` con builder en `src/lib/experience-builder/eb-sitemap.functions.ts`.

## 2. Clasificación por capacidad

Leyenda: **Completo / Parcial / Mejorable / Ausente**.

### 2.1 Metadatos base

| Capacidad | Estado | Evidencia / Notas |
|---|---|---|
| `<title>` único por ruta | **Parcial** | 108 `head()` implementados; muestreo indica títulos propios en rutas top, algunas rutas secundarias heredan defaults del root. |
| `<meta description>` | **Parcial** | Mismo patrón que title. Falta auditar longitud (<160). |
| Canonical | **Parcial** | Presente en rutas top (index, hoteles, experiencias, restaurantes, empresas, casas-de-vacaciones, `eventos.$slug`, `p.$slug`). Ausente/heredado en muchas rutas territoriales. |
| `og:title` / `og:description` | **Parcial** | Consumidos vía `src/lib/discovery/seo.ts`; heterogeneidad en rutas territoriales. |
| `og:image` en leaves | **Mejorable** | Detectado sólo en `producto.$slug.tsx` y helper `seo.ts`. Rutas Hero (destinos, empresas, listados) sin `og:image` derivado del hero real. |
| `twitter:card` | **Parcial** | Cubierto donde `seo.ts` se invoca; verificar consistencia. |
| Viewport / charset | **Completo** | Definidos en `__root.tsx`. |

### 2.2 Estructura semántica

| Capacidad | Estado | Notas |
|---|---|---|
| Un solo `<h1>` por página | **Mejorable** | Sin auditoría runtime; H-01 (bloques oficiales) impone jerarquía, pero rutas legacy pueden violar. |
| HTML semántico (`<main>`, `<article>`, `<section>`, `<nav>`) | **Parcial** | Kit + Tourism Cards usan semántico; superficies antiguas mezclan `<div>`. |
| Alt en imágenes | **Parcial** | Media Pipeline H3·A3 genera ALTs; assets pre-pipeline pendientes. |
| Breadcrumb visual | **Completo** | `BreadcrumbTerritorial` + `useContextCrumbs`. |

### 2.3 Datos estructurados (JSON-LD)

| Capacidad | Estado | Notas |
|---|---|---|
| `BreadcrumbList` | **Parcial** | Emitido en las rutas de `/tmp/seo-jsonld.txt` (8 archivos). Falta unificar por PublicShell. |
| `LocalBusiness` / `Hotel` / `Restaurant` | **Ausente** | No detectado en rutas de ficha. Prioridad alta para SEO de negocios. |
| `Product` | **Parcial** | Presente en `producto.$slug.tsx`. |
| `Event` | **Parcial** | Presente en `eventos.$slug.tsx`. |
| `TouristDestination` / `TouristAttraction` | **Ausente** | No detectado en `oriente-maya/**`. Alto valor semántico. |
| `Review` / `AggregateRating` | **Parcial** | Bloque `experience-reviews` emite datos, falta JSON-LD explícito para SERP. |
| `Organization` + logo + sameAs | **Ausente** | No detectado a nivel `__root.tsx`. |
| `WebSite` + SearchAction | **Ausente** | Sitelinks Search Box no habilitado. |
| `FAQPage` | **Ausente** | Bloque `experience-faq` no emite JSON-LD (verificable en Ola I2). |

### 2.4 Sitemap / robots / llms

| Capacidad | Estado | Notas |
|---|---|---|
| `robots.txt` | **Completo** | Presente en `public/`. |
| `sitemap.xml` dinámico | **Completo** | Ruta `sitemap[.]xml.ts` + builder `eb-sitemap.functions.ts`. Verificar cobertura de rutas territoriales y assets frescos. |
| `llms.txt` (IA discoverability) | **Completo** | Presente. Verificar frescura del catálogo. |
| `sitemap-images.xml` | **Ausente** | No hay sitemap de imágenes derivadas del Media Pipeline. |

### 2.5 Internacionalización

| Capacidad | Estado | Notas |
|---|---|---|
| Selector de idioma | **Completo** | 6 locales (es/en/fr/de/it/pt). |
| URLs por idioma (`/es/`, `/en/`…) | **Ausente** | Todos los idiomas comparten URL. Alineado con `founder-i18n-seo` (deuda estratégica hasta lanzamiento internacional). |
| `hreflang` | **Ausente** | 0 archivos con `hreflang`. Correcto mientras no exista URL localizada. |
| `lang="es"` en `<html>` | **Completo** | Fijado en `__root.tsx`. |

### 2.6 Performance SEO (Core Web Vitals)

| Capacidad | Estado | Notas |
|---|---|---|
| Lazy-load de imágenes | **Parcial** | Media Pipeline entrega `srcSet`, `loading="lazy"` no verificado en todos los cards. |
| Prefetch de rutas al hover | **Completo** | TanStack Router default (`defaultPreloadStaleTime: 0`). |
| LCP hero SSR-safe | **Parcial** | `<StaticMap>` y `experience-hero` SSR-safe; algunas superficies legacy hidratan pesado. |
| Font-loading estratégico | **Mejorable** | Sin auditar `font-display`. |

### 2.7 Discoverability / autoridad

| Capacidad | Estado | Notas |
|---|---|---|
| Dominio canónico unificado (`quehacerenvalladolid.com`) | **Completo** | Cerrado en H1. |
| Redirect `www` → apex (o inverso) | **Verificar** | No inspeccionable en Fase 0 (infra). |
| `page_redirects` para slug 301 | **Completo** | US-R3 Ola 0. |
| Backlinks internos (`related-collection`) | **Completo** | Bloque oficial. |
| Contenido territorial jerarquizado (`/oriente-maya/:destino/…`) | **Completo** | Navigation Blueprint v1.0. |

## 3. Resumen ejecutivo

- **Completo (11):** robots, llms.txt, sitemap dinámico, `lang`, viewport, dominio canónico, redirects, breadcrumb, prefetch, jerarquía territorial, selector de idioma.
- **Parcial (11):** títulos, descripciones, canonical, OG base, Twitter, semántica HTML, alt, BreadcrumbList JSON-LD, Product / Event schema, Review schema, LCP.
- **Mejorable (5):** og:image en leaves, H1 único, `font-display`, lazy-load consistente, longitudes meta.
- **Ausente (7):** LocalBusiness/Hotel/Restaurant schema, TouristDestination schema, Organization + SearchAction, FAQPage schema, sitemap de imágenes, URLs por idioma (deuda estratégica), hreflang (correlato).

## 4. Puntos calientes para SEO.A1 · Fase 1 (no autorizada)

Sujeto a autorización explícita del Founder. Sólo orden sugerido:

1. **LocalBusiness / TouristAttraction JSON-LD** en fichas de negocio y destinos — mayor upside SERP.
2. **Organization + SearchAction** en `__root.tsx` — sitelinks search box.
3. **og:image derivado del hero real** en todas las rutas leaf con imagen.
4. **Audit + reparación** de canonical/OG en rutas territoriales sin `head()` propio robusto.
5. **sitemap-images.xml** conectado al Media Pipeline.
6. **FAQPage schema** en bloque `experience-faq`.
7. **Deuda estratégica i18n:** dejar bloqueada hasta lanzamiento internacional.

## 5. Aislamiento con C2.F1

- C2.F1 sólo toca `src/lib/experience-builder/blocks/experience-map/*` y `ExperienceMapBlock.tsx`. Ninguna de esas rutas emite metadatos SEO.
- SEO.A1 Fase 0 sólo LEE. Fase 1 tocará `src/lib/discovery/seo.ts`, `__root.tsx` y rutas leaf — ortogonal a C2.
- Ningún bloqueo mutuo.

## 6. Entregable

Este documento cierra Fase 0. **No hay implementación**. Se espera aprobación del Founder antes de abrir SEO.A1 · Fase 1.