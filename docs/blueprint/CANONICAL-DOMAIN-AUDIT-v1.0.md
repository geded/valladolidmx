# CANONICAL DOMAIN AUDIT · v1.0

**Alcance:** determinar si la arquitectura actual está preparada para adoptar `https://valladolid.mx` como dominio maestro definitivo sin refactor posterior.
**Modo:** solo auditoría. Cero código modificado. Cero PR. Cero recomendaciones de implementación.
**Método:** búsqueda exhaustiva de referencias literales a `quehacerenvalladolid.com`, `www.quehacerenvalladolid.com`, `valladolidmx.lovable.app`, `orientemaya.com`, `valladolid.mx`, `localhost`, `127.0.0.1` y de variables globales equivalentes (`SITE`, `DISCOVERY_ORIGIN`, `PUBLIC_ORIGIN`, `BASE_URL`, `APP_URL`, `SITE_URL`, `ORIGIN`) en `src/`, `public/`, `scripts/`, `supabase/`, `vite.config.ts`.
**Resultado global (código, excluye `docs/`):** 216 líneas con matches del set de dominios; 0 referencias a `localhost` / `127.0.0.1` en código de aplicación.

---

## 1 · Inventario de hallazgos

Cada fila = hallazgo directamente accionable. Cadenas de marca puramente textuales ("Valladolid.mx" como nombre comercial en títulos, subjects, headings o descripciones) se agrupan al final (D-XX) porque son literales de marca, no de dominio.

| ID | Archivo | Línea | Referencia | Tipo | Clasificación | Impacto |
|----|---------|-------|------------|------|---------------|---------|
| A-01 | `src/config/site.ts` | 8 | `domain: "quehacerenvalladolid.com"` | Variable / SoT candidata | Debe parametrizarse | **P0** |
| A-02 | `src/config/site.ts` | 9 | `url: "https://quehacerenvalladolid.com"` | Variable / SoT candidata | Debe parametrizarse | **P0** |
| A-03 | `src/config/site.ts` | 15 | `og_image: "https://quehacerenvalladolid.com/og/default-1200x630.jpg"` | SEO / OG | Debe derivarse de `SITE.url` | **P0** |
| A-04 | `src/lib/discovery/seo.ts` | 38 | `export const DISCOVERY_ORIGIN = "https://quehacerenvalladolid.com"` | Helper SEO (2ª fuente) | Debe eliminarse / reemplazarse por `SITE.url` | **P0** |
| A-05 | `src/lib/discovery/seo.ts` | 46 | `"https://quehacerenvalladolid.com/og/default-1200x630.jpg"` (DEFAULT_OG_IMAGE) | SEO / OG | Debe derivarse de `SITE.url` | **P0** |
| A-06 | `src/routes/sitemap[.]xml.ts` | 16 | `const BASE_URL = "https://quehacerenvalladolid.com"` | Sitemap (3ª fuente) | Debe consumir `SITE.url` | **P0** |
| A-07 | `public/robots.txt` | 4 | `Sitemap: https://quehacerenvalladolid.com/sitemap.xml` | Robots | Debe migrarse (estático) | **P0** |
| A-08 | `public/llms.txt` | 1–37 (22 líneas) | 22 URLs absolutas `https://quehacerenvalladolid.com/...` | AI/GEO discovery | Debe migrarse (estático, regenerable) | **P1** |
| A-09 | `src/routes/blog.tsx` | 31 | JSON-LD `url: "https://quehacerenvalladolid.com/blog"` | JSON-LD | Debe parametrizarse vía helper SEO | **P1** |
| A-10 | `src/routes/terminos.tsx` | 14, 31, 104–105 | `quehacerenvalladolid.com`, `mailto:legal@quehacerenvalladolid.com` | Contenido legal | Debe migrarse (contenido) | **P1** |
| A-11 | `src/routes/privacidad.tsx` | 14, 33, 77–78, 98–99 | `quehacerenvalladolid.com`, `mailto:privacidad@…` | Contenido legal | Debe migrarse (contenido) | **P1** |
| A-12 | `src/routes/[.]lovable.oauth.consent.tsx` | 135 | `<code>https://quehacerenvalladolid.com/mcp</code>` (texto UI) | MCP / OAuth (cosmético) | Debe parametrizarse | **P2** |
| A-13 | `src/components/experience-builder/PagesPanel.tsx` | 92 | Comentario `"https://quehacerenvalladolid.com/l/{slug}"` | Experience Builder (comentario) | Debe actualizarse | **P3** |
| A-14 | `src/components/experience-builder/SeoPreview.tsx` | 32 | `siteHost = "valladolidmx.lovable.app"` (default prop) | Experience Builder (preview) | Debe consumir `SITE.domain` | **P1** |
| A-15 | `src/lib/media/shadow-evaluator.server.ts` | 37–39 | Allow-list de hosts: `valladolidmx.lovable.app`, `www.quehacerenvalladolid.com`, `quehacerenvalladolid.com` | Media / Firma HMAC | Debe parametrizarse (añadir `valladolid.mx` / `www.valladolid.mx` antes del cutover) | **P0** |
| A-16 | `src/lib/visibility/visibility-notifications.server.ts` | 8 | `const PUBLIC_ORIGIN = 'https://valladolid.mx'` (4ª fuente) | Variable de origen | Debe consumir `SITE.url` (hoy diverge del dominio activo) | **P1** |
| A-17 | `src/lib/email-templates/visibility-request-received.tsx` | 19 | `portalUrl = 'https://valladolid.mx/portal/visibilidad'` | Email transaccional | Debe consumir `SITE.url` | **P1** |
| A-18 | `src/lib/email-templates/visibility-rejected.tsx` | 19 | idem | Email | Debe consumir `SITE.url` | **P1** |
| A-19 | `src/lib/email-templates/visibility-expiring.tsx` | 28 | idem | Email | Debe consumir `SITE.url` | **P1** |
| A-20 | `src/lib/email-templates/visibility-expired.tsx` | 17 | idem | Email | Debe consumir `SITE.url` | **P1** |
| A-21 | `src/lib/email-templates/visibility-approved.tsx` (si aplica) | — | Portal URL literal `valladolid.mx` | Email | Debe consumir `SITE.url` | **P1** |
| A-22 | `src/lib/email-templates/coupon-issued.tsx` | 33, 101 | `couponUrl = 'https://valladolid.mx/cuenta/mis-cupones'` | Email | Debe consumir `SITE.url` | **P1** |
| A-23 | `src/lib/email-templates/coupon-redeemed.tsx` | 32, 96 | `reviewUrl = 'https://valladolid.mx/...'` | Email | Debe consumir `SITE.url` | **P1** |
| A-24 | `src/lib/email-templates/coupon-review-reminder.tsx` | 26, 87 | `reviewUrl = 'https://valladolid.mx/...'` | Email | Debe consumir `SITE.url` | **P1** |
| A-25 | `src/routes/contacto.tsx` | 50, 55 | `mailto:hola@valladolid.mx` | Contenido / contacto | Debe validarse (dependencia de DNS/MX) | **P1** |
| A-26 | `src/routes/_authenticated/cuenta/documentos.$orderId.tsx` | 158 | `concierge@valladolid.mx` | Contenido / contacto | Debe validarse (DNS/MX) | **P1** |
| A-27 | `src/routes/lovable/email/auth/preview.ts` | 29 | `SAMPLE_PROJECT_URL = "https://valladolidmx.lovable.app"` | Preview email auth | Debe parametrizarse | **P2** |
| A-28 | `scripts/shadow-evaluator.test.ts` | 63, 68 | Hosts `valladolidmx.lovable.app`, `www.quehacerenvalladolid.com` en fixtures | Test | No tocar (histórico, verifica allow-list) | **P3** |
| A-29 | `scripts/shadow-preloader.test.ts` | 227 | Host `valladolidmx.lovable.app` en fixture | Test | No tocar | **P3** |
| A-30 | `supabase/migrations/20260703172956_*.sql` | 19–44 | `attribution_url = 'https://valladolid.mx'` (seed) | Migración / seed | **No tocar** (migración inmutable) | **P3** |
| A-31 | `supabase/migrations/20260704203449_*.sql` | 32, 45, 51 | `viajero-demo@valladolid.mx` | Migración / seed | **No tocar** (migración inmutable) | **P3** |
| A-32 | `supabase/migrations/20260701041232_*.sql` | 41 | Marca textual `Valladolid.mx` en comentario | Migración | No tocar | **P3** |
| D-01 | ~80 archivos (rutas, componentes, emails, EB) | — | Cadena de marca `"Valladolid.mx"` en títulos, subjects, headings, descripciones, comentarios y demo data | Marca / Branding | No tocar (identidad, no dominio) | — |

**Archivos MCP / OAuth confirmados como parametrizados (correctos):**

| ID | Archivo | Referencia | Clasificación |
|----|---------|------------|---------------|
| B-01 | `src/lib/mcp/index.ts` | OAuth `issuer` = `https://${projectRef}.supabase.co/auth/v1` (Supabase host directo, no dominio público) | ✅ Correcto — sin acoplamiento al dominio público |
| B-02 | `src/lib/mcp/lib/contracts.ts`, `src/lib/mcp/tools/*` | Sin referencias a dominio público | ✅ Correcto |
| B-03 | `public/manifest.webmanifest` | `start_url: "/"`, `scope: "/"`, `id: "/"` (relativos) | ✅ Correcto — dominio-agnóstico |
| B-04 | `public/push-sw.js` | Solo cadena de marca `"Valladolid.mx"` como título fallback | ✅ Correcto |
| B-05 | `.env` (`SUPABASE_URL`, `VITE_SUPABASE_URL`, etc.) | Apuntan a `*.supabase.co` (backend), no al dominio público | ✅ Correcto — no aplica |
| B-06 | `src/routes/mcp.ts`, `src/routes/[.mcp]/*`, `src/routes/[.well-known]/oauth-protected-resource.ts` | Sin literales de dominio (usan `request.url` / origin dinámico) | ✅ Correcto |

---

## 2 · Conteo de referencias absolutas (agrupado por tipo)

Conteo sobre líneas de código de aplicación (excluye `docs/`, incluye `src/`, `public/`, `scripts/`, `supabase/`).

| Tipo | Referencias literales `quehacerenvalladolid.com` | Referencias literales `valladolid.mx` | Referencias literales `valladolidmx.lovable.app` |
|------|--------------------------------------------------|---------------------------------------|--------------------------------------------------|
| Variable / SoT (`SITE`, `DISCOVERY_ORIGIN`, `BASE_URL`, `PUBLIC_ORIGIN`) | 4 | 1 | 0 |
| SEO / JSON-LD / OG | 2 (og_image + blog url) | 0 | 0 |
| Sitemap / Robots (estáticos) | 2 | 0 | 0 |
| AI-discovery (`llms.txt`) | 22 | 0 | 0 |
| Contenido legal / rutas públicas | ~13 (terminos, privacidad, consent UI, PagesPanel comment) | 0 | 0 |
| Emails transaccionales (portal, cupones) | 0 | ~14 (portalUrl/couponUrl/reviewUrl) | 0 |
| Media / Shadow allow-list | 2 | 0 | 1 |
| Experience Builder (preview / SEO preview) | 1 (comentario) | 0 | 1 (default prop `siteHost`) |
| Preview de email auth | 0 | 0 | 1 |
| Tests (fixtures inmutables) | 1 | 0 | 2 |
| Migraciones SQL (inmutables) | 0 | 8 (attribution_url + emails demo) | 0 |
| Contactos (mailto: hola@ / concierge@ / legal@ / privacidad@) | 4 | 2 | 0 |
| **Total código accionable (≠ migraciones, ≠ tests, ≠ marca)** | **≈ 46** | **≈ 15** | **≈ 3** |

Marca comercial `"Valladolid.mx"` (identidad, no dominio) aparece en ~80 archivos — no cuenta como referencia de dominio.

---

## 3 · Respuestas obligatorias

### 3.1 ¿Existe una única fuente de verdad para el dominio público?

**No.** La fuente está fragmentada en **cuatro constantes independientes** dentro del código de aplicación:

1. `SITE.url` en `src/config/site.ts` → `https://quehacerenvalladolid.com`
2. `SITE.og_image` en `src/config/site.ts` (URL absoluta duplicada, no derivada de `SITE.url`)
3. `DISCOVERY_ORIGIN` en `src/lib/discovery/seo.ts` → `https://quehacerenvalladolid.com` (repite el valor)
4. `DEFAULT_OG_IMAGE_URL` en `src/lib/discovery/seo.ts` (URL absoluta duplicada)
5. `BASE_URL` en `src/routes/sitemap[.]xml.ts` → `https://quehacerenvalladolid.com` (repite el valor)
6. `PUBLIC_ORIGIN` en `src/lib/visibility/visibility-notifications.server.ts` → `https://valladolid.mx` (**diverge** del dominio activo)
7. Literales `https://valladolid.mx` incrustados en 7 email templates (portalUrl / couponUrl / reviewUrl como default props) → también divergen
8. Ficheros estáticos: `public/robots.txt` (1 URL) y `public/llms.txt` (22 URLs) contienen el dominio hardcodeado sin dependencia del helper
9. Allow-list de hosts firmados en `src/lib/media/shadow-evaluator.server.ts` (3 hosts hardcodeados)
10. `SeoPreview.tsx` (`siteHost` default `valladolidmx.lovable.app`)

### 3.2 ¿Cuántas referencias absolutas existen?
Ver §2. Total accionable ≈ **64** referencias distribuidas en 10 tipos.

### 3.3 ¿Es posible migrar cambiando una sola variable?

**No.** Aún si se refactoriza `SITE.url` como única fuente:

- 4 constantes duplicadas (A-04, A-05, A-06, A-16) mantendrían el valor viejo.
- 2 ficheros estáticos (`robots.txt`, `llms.txt`) no consumen `SITE.url` porque no pasan por build.
- ≥14 emails llevan `https://valladolid.mx` **incrustado como default prop** (no leen `SITE.url`).
- Allow-list de firma HMAC (`shadow-evaluator.server.ts`) no incluye `valladolid.mx` — cualquier renovación de URL firmada sobre el nuevo dominio quedaría fuera de la lista y **fallaría**.
- Contenido legal (`terminos.tsx`, `privacidad.tsx`) tiene el dominio literal en JSX prose.
- `SeoPreview.tsx` usa `valladolidmx.lovable.app` como default; el preview mostraría host equivocado.
- Migraciones SQL contienen `https://valladolid.mx` en seeds — **inmutables por política**, quedarían como referencias históricas legítimas.

### 3.4 ¿Hay referencias que romperían MCP, OAuth o PWA en la migración?

**MCP / OAuth:**
- **B-01 (issuer)** usa Supabase host directo → **no rompe.**
- **A-12** (`consent.tsx` línea 135) muestra `https://quehacerenvalladolid.com/mcp` como texto informativo en la UI de consentimiento; **no rompe funcionalidad**, sí muestra el dominio incorrecto post-migración (cosmético P2).
- Rutas `[.mcp]/*` y `[.well-known]/oauth-protected-resource.ts` construyen URLs desde `request.url` → **no rompen**.

**PWA / Manifest / Service Worker:**
- `public/manifest.webmanifest` usa paths relativos (`/`, `/favicon.ico`, `/logo.png`) → **no rompe.**
- `public/push-sw.js` no referencia dominio → **no rompe.**
- ⚠️ **Caveat instalado:** apps ya instaladas (Android/iOS) cachearon `start_url: "/"` bajo el hostname de instalación (`quehacerenvalladolid.com`). El origin cambia con el dominio → cada instalación previa es una PWA distinta bajo la nueva URL. Esto **no es un bug** de arquitectura, es limitación del contrato PWA; usuarios instalados deberán reinstalar.

**Media / Firma HMAC (bloqueo operativo):**
- **A-15** — `shadow-evaluator.server.ts` autoriza sólo 3 hosts. Cualquier request de renovación de URL firmada originada desde `valladolid.mx` sería rechazada. **Riesgo P0 durante cutover.**

**Sitemap / Robots / llms.txt:**
- Google/Bing y crawlers de IA usarían el sitemap y llms.txt que aún declaran el dominio viejo → **impacto SEO/GEO P0 si no se sincronizan en el mismo release.**

### 3.5 Referencias históricas que NO deben tocarse

- Todo `docs/blueprint/**` (≥120 líneas con `quehacerenvalladolid.com`) — historia editorial.
- Todas las migraciones bajo `supabase/migrations/**` (A-30, A-31, A-32) — inmutables por Data Layer Policy.
- Tests bajo `scripts/*.test.ts` que validan la allow-list actual (A-28, A-29) — cambiar los fixtures rompería la validación histórica de la firma; deben evolucionar sólo si `shadow-evaluator` cambia.
- Ficheros generados: `src/routeTree.gen.ts`, `src/integrations/supabase/*` (autogen).
- `.env` con `SUPABASE_URL` (backend, no dominio público).

### 3.6 ¿La arquitectura soporta `valladolid.mx` como maestro + 301 desde `quehacerenvalladolid.com` y `orientemaya.com` sin rediseño?

**No sin refactor.** Justificación:

- El dominio maestro está **hardcodeado en ≥6 constantes** y en 2 ficheros estáticos. No basta con configurar 301 a nivel hosting: el HTML servido seguiría emitiendo `<link rel="canonical">`, `og:url`, JSON-LD `@id/url`, sitemap URLs y llms.txt URLs apuntando a `quehacerenvalladolid.com` — el 301 crearía un loop semántico (canonical del destino apunta al origen que redirige al destino).
- No existe la noción de "aliases legados" en el código: `orientemaya.com` **no aparece** en ninguna parte del código, por lo que ya podría hacerse 301 a nivel DNS/hosting sin conflicto — pero eso mismo demuestra que el modelo actual no distingue *canónico* de *alias* en la capa de aplicación.
- La allow-list de la firma de imágenes (`shadow-evaluator.server.ts`) no contempla ni `valladolid.mx` ni `orientemaya.com`. El servicio de imágenes derivadas fallaría en cualquier request originado desde esos hosts.
- `SeoPreview.tsx` seguiría mostrando `valladolidmx.lovable.app` como host preview.
- Emails transaccionales ya divergen del dominio activo (usan `valladolid.mx` como default prop), lo que confirma la fragmentación previa: hoy un cupón emite un link a un dominio que no es canónico.

**Conclusión operativa:** la migración a `valladolid.mx` como dominio maestro definitivo **requiere consolidación previa** de la fuente de verdad, no sólo un cambio de valor. Cualquier release que sólo cambie `SITE.url` dejaría el sistema en estado inconsistente en al menos 10 puntos.

---

## 4 · Sumario ejecutivo

| Dimensión | Estado |
|-----------|--------|
| Fuente única de verdad | ❌ Fragmentada en 4+ constantes y 2 ficheros estáticos |
| MCP / OAuth issuer | ✅ Desacoplado del dominio público |
| PWA manifest / SW | ✅ Relativos |
| Sitemap / Robots / llms.txt | ❌ Hardcodeado, requiere sincronización |
| Emails transaccionales | ❌ Default props divergentes |
| Media Shadow allow-list | ❌ Requiere ampliación P0 antes de cutover |
| Migraciones SQL | 🔒 Inmutables (histórico legítimo) |
| Alias legados (`orientemaya.com`) | ⚪ No referenciado en código; puede resolverse a nivel DNS/hosting |
| Migración por cambio de una sola variable | ❌ No posible con arquitectura actual |

**Veredicto de auditoría (sin recomendación de implementación):** la arquitectura **no está preparada** para adoptar `valladolid.mx` como dominio maestro definitivo sin refactor previo. Se identifican **10 puntos de acoplamiento independientes** que deben resolverse en una futura épica de consolidación antes de ejecutar el cambio de dominio.

---
*Auditoría técnica emitida en modo lectura. Ningún archivo del proyecto fue modificado. Ningún PR abierto. Ninguna recomendación de implementación incluida.*
*Autor: Auditoría Independiente · Capítulo 1 · Canonical Domain Architecture Audit v1.0.*