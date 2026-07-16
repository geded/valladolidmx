# SEO.CERT.1 · SEO & GEO Launch Certification Audit — v1.0

**Fecha:** 2026-07-16
**Dominio canónico:** `https://quehacerenvalladolid.com`
**Alcance:** Certificación objetiva del estado SEO / GEO / AI Readiness previo a lanzamiento.
**Modalidad:** Auditoría exclusivamente sobre código y arquitectura existente. Cero cambios.
**Fuentes evaluadas:** `src/lib/discovery/seo.ts`, `src/routes/**`, `public/robots.txt`, `public/llms.txt`, `src/routes/sitemap[.]xml.ts`, `src/lib/mcp/**`, cierres previos H1, H2, C1, C2.F1, PR-1/2/3, SEO.A1.2.

---

## 1. Executive Summary

Valladolid.mx llega al momento de lanzamiento con una **base SEO técnica sólida y por encima del estándar de la industria turística regional**. La plataforma opera con **fuente única de metadata (`buildPublicHead`)**, **structured data completo** en las tres dimensiones (Foundation · Territorial · Commercial), **canonical/OG/Twitter/robots** cubiertos al 100% de superficies indexables, **sitemap dinámico** que combina rutas estáticas, entidades reales y páginas publicadas del Experience Builder, **llms.txt curado** para lectores IA, **endpoint MCP** operativo con guardrails (M1.0), **fallback social oficial** (`/og/default-1200x630.jpg`) y **blindaje de todo el árbol autenticado** a nivel layout.

No se detectan bloqueadores P0 para el lanzamiento comercial. Existen tres condiciones P1 recomendadas antes de anunciar visibilidad internacional (imagen social por tipo de entidad territorial cuando exista hero real — ya cubierto por helper —, revalidación con Google Rich Results tras primer deploy, y verificación de Search Console). El modelo evolutivo posterior (SEO.A2 Destination Demand Intelligence, hreflang internacional, `/blog/$slug`, Media Pipeline read-path) es **deuda estratégica planificada, no deuda técnica de lanzamiento**.

**Veredicto:** 🟢 **GO WITH CONDITIONS** (condiciones son operativas post-deploy, no de código).

---

## 2. Scorecard

Escala: 0-100. Ponderación equitativa salvo indicación.

| Dimensión | Score | Estado | Notas |
|---|---:|:---:|---|
| SEO Técnico | **95** | 🟢 | Helper único, canonical self, robots correcto, redirects vía `page_redirects` + trigger 301. |
| Structured Data | **93** | 🟢 | Organization/WebSite/BreadcrumbList/TouristDestination/LocalBusiness/Hotel/Restaurant/Product/Offer/Event/Review/AggregateRating/FAQPage con `@id` estables y relaciones por referencia. |
| Crawlability | **92** | 🟢 | robots.txt limpio, sitemap dinámico (estático + EB + entidades reales), sin trampas, sin duplicados. |
| Performance | **86** | 🟢 | H2 cerrado (-15% entry), C1 Lazy Toaster (-7.9 KB gzip), C2.F1 render-only contracts (Zod fuera de chunks públicos). SSR + hydration verificados. |
| Image SEO | **78** | 🟡 | OG fallback oficial + ALT automáticos vía Media Intelligence (H3.A3). Media Pipeline read-path (M2) aún en OFF por diseño; no bloquea. |
| GEO Readiness | **90** | 🟢 | Entidades semánticas con IDs canónicos, `llms.txt` curado, JSON-LD reconciliado, MCP con tools discovery-grade. |
| AI Readiness | **91** | 🟢 | MCP M1.0 con auditoría, rate limit, output schemas Zod, geolocation mandatory, consentimiento y localización. |
| Landing Readiness | **82** | 🟢 | EB con `/p/$slug` y `/l/$slug` indexables condicionados; contratos SEO por página (`snapshot.chrome.seo`); infra suficiente para SEO.A2. |
| Experience Builder SEO | **88** | 🟢 | Reglas D4 activas: `publicado + público + !noindex`. Fallback OG y canonical automáticos. |
| Internal Linking | **80** | 🟡 | Breadcrumbs territoriales, Related Collection, DestinationSwitcher. Falta densidad editorial hasta que abra SEO.A2. |

**Score General ponderado: 87 / 100 — Launch-Ready.**

---

## 3. Hallazgos por área

### 3.1 Metadata Coverage
- **Estado:** ✅ Completo. Todas las rutas públicas pasan por `buildPublicHead`.
- **Evidencia:** SEO.A1.2 Completion Report v1.0. Rutas territoriales, listados, institucionales, EB publicado, blog (noindex, follow), viajero/mapa/auth (noindex).
- **Fallback social:** `SITE_DEFAULT_OG_IMAGE = /og/default-1200x630.jpg` con `width/height` emitidos.
- **Deuda:** cosmética — `/unsubscribe`, `/resenar/negocio/$slug`, `/viaje-compartido/$token` aún no migradas a `buildPublicHead` (todas `noindex`, impacto SEO nulo).

### 3.2 Structured Data
- **Foundation (PR-1):** Organization + WebSite + BreadcrumbList con `@id` estables (`ORG_ID`, `WEBSITE_ID`).
- **Territorial (PR-2):** TouristDestination, TouristAttraction, LocalBusiness/Hotel/Restaurant con `containedInPlace` referenciado por `@id`.
- **Commercial (PR-3 v1.1):** Product + Offer, Event con organizer condicionado a evidencia real (sin fallback ORG_ID), Review/AggregateRating condicionados a `reviewCount > 0`, FAQPage vinculado a Product por `@id`, price 0 sólo con `is_free=true` explícito.
- **Sin datos inventados:** ratificado en Founder Acceptance Review de PR-3.
- **SSR:** todos los JSON-LD emitidos server-side vía `head()` de rutas.

### 3.3 Crawlability
- `robots.txt`: `User-agent: * / Allow: / / Sitemap: …/sitemap.xml`. Correcto.
- `sitemap.xml`: dinámico. Rutas estáticas + entidades (destinos, empresas, productos, eventos) + EB publicado. `/blog` excluido (política D3).
- Canonicals: self-referential en todas las indexables; ausente por diseño en `noindex`.
- Redirects: mecanismo formal vía `page_redirects` + trigger de slug (US-R3 Ola 0).
- Sin páginas huérfanas críticas — todas las entidades territoriales aparecen en breadcrumbs, sitemap y switchers.

### 3.4 Image SEO
- **ALT:** pipeline Media Intelligence (H3.A3) con generación asistida.
- **Hero images:** conectadas a `og:image` real cuando existen; fallback oficial en su ausencia.
- **ImageObject:** emitido dentro de Organization (logo) y schemas comerciales (image en Product/Event).
- **Dimensiones:** `og:image:width=1200`, `og:image:height=630` declaradas.
- **Media Pipeline (H3.A4):** M1 cerrado, M2.3.1 en Fase B con fallback conservativo (flags OFF). No bloquea lanzamiento porque el read-path actual sirve originales de Storage con URLs estables.
- **LCP:** heros con prioridad; imágenes below-the-fold lazy por defecto.
- **Recomendación:** SEO.A1.3 **puede posponerse post-launch** — la cobertura actual es suficiente para el crawl inicial y las primeras impresiones sociales.

### 3.5 Internal Linking
- Breadcrumb territorial en todas las rutas `/oriente-maya/*`.
- `Related Collection` en fichas de empresa y producto.
- `DestinationSwitcher` y `NavigationSessionBridge` conectan región ↔ destino ↔ categoría ↔ empresa ↔ producto.
- **Gap:** densidad editorial cross-linking (blog, guías, colecciones curadas). Se resuelve con SEO.A2 y `/blog/$slug`. No bloquea.

### 3.6 GEO Readiness (Generative Engine Optimization)
- Entidades semánticas con `@id` canónicos → citables por LLM.
- `llms.txt` curado con secciones Pages / Destinos / Datos clave / Sitemap.
- Relaciones explícitas (containedInPlace, organizer, brand, publisher) → Knowledge Graph friendly.
- Descripciones editoriales redactadas para respuesta directa (no keyword-stuffing).
- **Recomendación GEO:** al abrir SEO.A2, incluir campos `sameAs` (redes oficiales) y `identifier` (RFC/registro turístico) donde exista evidencia real.

### 3.7 AI Readiness / MCP
- Endpoint MCP operativo (`/.mcp/*`) con manifest.
- Guardrails M1.0: `mcp_tool_invocations` (auditoría), rate limit, `withMcpGuardrails`, Zod output schemas, consentimiento OAuth, geolocation mandatory, localización, dominio canónico.
- Tools iniciales: `search_businesses`, `get_my_traveler_profile`, `list_my_travel_plans`.

### 3.8 Performance
- H2 cerrado: entry chunk -15%, Studio/Admin aislados, hydration corregida.
- C1: Toaster perezoso -7.9 KB gzip.
- C2.F1: contratos render-only en `experience-map` (Zod fuera de chunks públicos).
- SSR emite HTML útil sin JS, hidratación sin mismatches conocidos.
- Core Web Vitals: no re-benchmark obligatorio en esta ola.

### 3.9 Indexability — clasificación completa

| Superficie | Política | Justificación |
|---|:---:|---|
| `/`, `/oriente-maya`, `/oriente-maya/*` | **INDEX** | Contenido canónico turístico. |
| `/experiencias`, `/hoteles`, `/restaurantes`, `/casas-de-vacaciones`, `/empresas`, `/promociones`, `/eventos`, `/eventos/$slug` | **INDEX** | Listados y detalles con datos reales. |
| `/arma-tu-viaje`, `/contacto`, `/convertir-en-anfitrion`, `/que-hacer`, `/alux`, `/privacidad`, `/terminos` | **INDEX** | Superficies institucionales estables. |
| `/p/$slug`, `/l/$slug` (EB publicado) | **CONDITIONAL** | Sólo si `estado=publicado + visibility=public + !seo.noindex`. |
| `/blog` | **NOINDEX, follow** | Placeholder hasta `/blog/$slug` (SEO.A2). |
| `/mapa`, `/viajero/$handle`, `/auth`, `/reset-password`, `/offline`, `/preview/$token`, `/viaje-compartido/$token`, `/unsubscribe`, `/resenar/negocio/$slug` | **NOINDEX** | No editoriales / personales / técnicas / transaccionales. |
| `/_authenticated/*` (cms, cuenta, admin, portal, mi-viaje, empresa, concierge) | **NOINDEX, nofollow** | Blindaje a nivel layout (D6). |
| `/api/*`, `/.mcp/*`, `/.well-known/*`, `/.lovable/*` | **N/A** | No HTML indexable. |

### 3.10 Experience Builder SEO
- `snapshot.chrome.seo` por página (title, description, canonical, robots, og_image).
- Reglas D4 aplicadas por `buildPublicHead`.
- Fallback OG oficial cuando el editor no define uno.
- Sitemap incluye EB publicado con `featured/priority`.

### 3.11 Landing Readiness (para SEO.A2 · Destination Demand Intelligence)
- Contratos EB soportan landing/campaign/micrositio/promotion.
- Redirects 301 vía `page_redirects` operativos → migración segura de slugs.
- Structured data reutilizable por landing (`TouristDestination`, `Product`, `Event`, `FAQPage`).
- **La arquitectura actual soporta la épica futura sin refactor.**

---

## 4. Riesgos

| # | Riesgo | Probabilidad | Impacto | Mitigación existente |
|---|---|:---:|:---:|---|
| R1 | Cache social de crawlers al cambiar OG fallback | Alta | Bajo | Absoluto y estable en `/og/default-…jpg`. |
| R2 | Duplicados JSON-LD si un editor emite `head()` custom en EB | Baja | Medio | TanStack Router dedupe por `name/property`; helper único. |
| R3 | Search Console no configurado antes del deploy | Media | Medio | Operativo — resolver en checklist de lanzamiento. |
| R4 | Sitemap crece sin partición | Baja | Bajo | Volumen actual < 5k URLs; sitemap index puede diferirse. |
| R5 | Media Pipeline M2 read-path OFF | Baja | Bajo | Fallback a originales inmutables; contrato público estable. |

---

## 5. Quick Wins (opcional, no bloqueantes)

1. **QW1** — Migrar `/unsubscribe`, `/resenar/negocio/$slug`, `/viaje-compartido/$token` a `buildPublicHead` para uniformidad (cosmético).
2. **QW2** — Añadir `sameAs` de redes oficiales al `Organization` cuando existan URLs verificadas.
3. **QW3** — Publicar `/og/*` versionados por tipo (destino, evento, promo) cuando marketing entregue arte editorial.
4. **QW4** — Añadir `hreflang="x-default"` autorreferencial (deferido con hreflang internacional cuando abra la vertical multilingüe).

---

## 6. Blockers

| Nivel | Blocker | Estado |
|:---:|---|:---:|
| **P0** | — | Ninguno |
| **P1** | Verificación Search Console + Bing Webmaster antes de anuncio público | Operativo |
| **P1** | Revalidación Google Rich Results Test tras primer deploy productivo | Operativo |
| **P2** | `hreflang` (deferido hasta épica internacional) | Backlog |
| **P2** | `/blog/$slug` editorial | SEO.A2 |
| **P3** | `sitemap index` particionado | Post 5k URLs |
| **P3** | Migración cosmética 3 rutas `noindex` a `buildPublicHead` | Backlog |

---

## 7. Recomendaciones

### 7.1 Antes del lanzamiento (operativo, no código)
- Verificar dominio en Google Search Console y Bing Webmaster.
- Enviar `sitemap.xml` a Search Console.
- Ejecutar Rich Results Test sobre: `/`, `/oriente-maya/valladolid`, una empresa real, un producto real, un evento real.
- Confirmar propagación del OG fallback vía Facebook Sharing Debugger y Twitter Card Validator.

### 7.2 Puede hacerse después del lanzamiento
- SEO.A2 · Destination Demand Intelligence (`/blog/$slug`, colecciones editoriales, densidad cross-link).
- SEO.A1.3 · Image SEO Deep (cuando marketing entregue arte por vertical).
- Media Pipeline M2 read-path (activación cuando ganancia CDN justifique).
- Internacionalización SEO con hreflang.

### 7.3 No aporta valor suficiente hoy
- Reintroducir `SearchAction` — sin `/buscar` público indexable estable.
- Sitemap index particionado — bajo volumen actual.
- Duplicar `og:image` por variante regional sin arte editorial dedicado.

---

## 8. Roadmap sugerido post-launch

1. **Semana 1-2:** Search Console + Bing + Rich Results + monitoreo de rastreo.
2. **Mes 1:** SEO.A2 Fase 0 (blueprint editorial `/blog/$slug`, densidad territorial).
3. **Mes 2:** SEO.A1.3 (image SEO deep) + QW1/QW2.
4. **Mes 3:** Media Pipeline M2 read-path (activación gradual).
5. **Trimestre 2:** vertical internacional → hreflang + subdominios/subrutas por idioma.

---

## 9. Launch Verdict

**🟢 GO WITH CONDITIONS**

**Condiciones (todas operativas, ninguna de código):**
1. Verificación en Search Console + Bing Webmaster antes del anuncio público.
2. Rich Results Test sobre 5 URLs canónicas tras primer deploy productivo.
3. Confirmar cache social del OG fallback vía debuggers oficiales.

Ninguna condición bloquea el deploy técnico. La plataforma **puede lanzarse en su estado actual** con confianza SEO/GEO/AI-readiness por encima del estándar regional.

---

*Fin del reporte SEO-LAUNCH-CERTIFICATION-v1.0.*
