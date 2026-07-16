# PR-1 · CANONICAL CORE CONSOLIDATION — Completion Report v1.0

**Origen:** `CANONICAL-DOMAIN-AUDIT-v1.0.md`
**Alcance ejecutado:** consolidación del núcleo canónico del dominio público.
**Alcance excluido (por directiva Founder):** `robots.txt`, `sitemap.xml`, `llms.txt`, MCP, OAuth, Manifest, Service Worker, HMAC allow-list, redirects, DNS, certificados, contenido legal (`terminos`/`privacidad`), migraciones SQL, tests fixtures.

---

## 1 · Arquitectura anterior

Fuente del dominio fragmentada en **7 ubicaciones independientes**:

| # | Ubicación | Valor |
|---|-----------|-------|
| 1 | `src/config/site.ts` · `SITE.url` | `https://quehacerenvalladolid.com` |
| 2 | `src/config/site.ts` · `SITE.og_image` | URL absoluta hardcoded (duplicada) |
| 3 | `src/lib/discovery/seo.ts` · `DISCOVERY_ORIGIN` | `https://quehacerenvalladolid.com` (2ª fuente) |
| 4 | `src/lib/discovery/seo.ts` · `SITE_DEFAULT_OG_IMAGE` | URL absoluta hardcoded (duplicada) |
| 5 | `src/lib/discovery/seo.ts` · `absoluteUrl()` local | usa `DISCOVERY_ORIGIN` local |
| 6 | `src/lib/visibility/visibility-notifications.server.ts` · `PUBLIC_ORIGIN` | `https://valladolid.mx` (**divergente**) |
| 7 | 12 email templates · default props (`portalUrl`, `couponUrl`, `planUrl`, `reviewUrl`) | `https://valladolid.mx/...` (**divergentes**) |
| 8 | `src/components/experience-builder/SeoPreview.tsx` · `siteHost` default | `valladolidmx.lovable.app` |
| 9 | `src/routes/blog.tsx` · JSON-LD `url` | URL literal hardcoded |

Migrar el dominio implicaba editar ≥16 archivos.

---

## 2 · Arquitectura nueva

**Única fuente de verdad:** `src/config/site.ts`.

```ts
const PUBLIC_DOMAIN = "quehacerenvalladolid.com";
const PUBLIC_URL = `https://${PUBLIC_DOMAIN}` as const;

export function absoluteUrl(path = "/"): string { … }

export const SITE = {
  name, tagline,
  domain: PUBLIC_DOMAIN,
  url: PUBLIC_URL,
  default_description,
  theme_color,
  og_image: absoluteUrl("/og/default-1200x630.jpg"), // derivado
} as const;
```

Todo helper público consume `SITE.url`, `SITE.domain`, `SITE.og_image` o `absoluteUrl()` — nunca literales.

---

## 3 · Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/config/site.ts` | Nueva SoT + helper `absoluteUrl()`; `og_image` derivado |
| `src/lib/discovery/seo.ts` | `DISCOVERY_ORIGIN` y `SITE_DEFAULT_OG_IMAGE` convertidos en aliases; `absoluteUrl()` local reexpide al helper central |
| `src/lib/visibility/visibility-notifications.server.ts` | `PUBLIC_ORIGIN = SITE.url` |
| `src/routes/blog.tsx` | JSON-LD `url` usa `absoluteUrl("/blog")` |
| `src/components/experience-builder/SeoPreview.tsx` | Defaults `siteName = SITE.name`, `siteHost = SITE.domain` |
| `src/lib/email-templates/visibility-request-received.tsx` | `portalUrl` → `` `${SITE.url}/portal/visibilidad` `` |
| `src/lib/email-templates/visibility-rejected.tsx` | idem |
| `src/lib/email-templates/visibility-expiring.tsx` | idem |
| `src/lib/email-templates/visibility-expired.tsx` | idem |
| `src/lib/email-templates/visibility-activated.tsx` | idem |
| `src/lib/email-templates/coupon-issued.tsx` | `couponUrl` → SITE.url |
| `src/lib/email-templates/coupon-redeemed.tsx` | `reviewUrl` → SITE.url |
| `src/lib/email-templates/coupon-review-reminder.tsx` | `reviewUrl` → SITE.url |
| `src/lib/email-templates/trip-welcome.tsx` | `planUrl` → SITE.url |
| `src/lib/email-templates/trip-t3.tsx` | idem |
| `src/lib/email-templates/trip-t14.tsx` | idem |
| `src/lib/email-templates/trip-post.tsx` | `reviewUrl` → SITE.url |

**Total: 17 archivos.**

---

## 4 · Constantes eliminadas

- Literal duplicado `"https://quehacerenvalladolid.com/og/default-1200x630.jpg"` (×2: `site.ts`, `seo.ts`).
- Literal `"https://quehacerenvalladolid.com"` en `absoluteUrl()` local de `seo.ts`.
- 14 literales `'https://valladolid.mx[...]'` en 12 templates de email.
- Literal `'https://valladolid.mx'` en `PUBLIC_ORIGIN` de visibility notifications.
- Literal `"valladolidmx.lovable.app"` como default de `SeoPreview`.
- Literal `"https://quehacerenvalladolid.com/blog"` en JSON-LD de `/blog`.

---

## 5 · Constantes convertidas en alias documentado

| Alias legado | Fuente única |
|--------------|--------------|
| `DISCOVERY_ORIGIN` (`src/lib/discovery/seo.ts`) | `SITE.url` |
| `SITE_DEFAULT_OG_IMAGE` (`src/lib/discovery/seo.ts`) | `SITE.og_image` |
| `PUBLIC_ORIGIN` (`visibility-notifications.server.ts`) | `SITE.url` |

Ambos aliases marcados `@deprecated` / con comentario PR-1; consumidores nuevos deben importar directamente de `@/config/site`.

---

## 6 · Dependencias migradas

- Todo consumidor de `DISCOVERY_ORIGIN` (incluye `src/routes/producto.$slug.tsx` y el re-export en `src/lib/discovery/index.ts`) sigue recibiendo el mismo valor — ahora vía `SITE.url`.
- Los 12 email templates ahora importan `SITE` desde `@/config/site` y derivan sus URLs por defecto.
- `SeoPreview` (Experience Builder) consume `SITE.domain`.

---

## 7 · Alcance NO tocado (por directiva)

Verificado que **no se modificaron**:

- `public/robots.txt`
- `src/routes/sitemap[.]xml.ts` (`BASE_URL` local hardcoded — pendiente para PR posterior)
- `public/llms.txt`
- `src/lib/media/shadow-evaluator.server.ts` (HMAC allow-list)
- `src/routes/[.]lovable.oauth.consent.tsx` (MCP consent UI)
- `src/lib/mcp/*`, `src/routes/mcp.ts`, `src/routes/[.mcp]/*`, `src/routes/[.well-known]/*`
- `public/manifest.webmanifest`, `public/push-sw.js`
- `src/routes/terminos.tsx`, `src/routes/privacidad.tsx`
- Migraciones SQL bajo `supabase/migrations/**`
- Tests bajo `scripts/*.test.ts`
- `.env`

---

## 8 · Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Emails que antes emitían `https://valladolid.mx/...` ahora emiten `https://quehacerenvalladolid.com/...` (dominio canónico activo, no divergente) | Bajo — corrige divergencia previa | Sólo afecta valores por defecto; llamadas que pasan `portalUrl`/`couponUrl` explícitamente no cambian |
| `SeoPreview` muestra `quehacerenvalladolid.com` en lugar del literal Lovable | Cosmético | Consistente con dominio real |
| Aliases legados (`DISCOVERY_ORIGIN`, `PUBLIC_ORIGIN`, `SITE_DEFAULT_OG_IMAGE`) preservados | Ninguno | Marcados `@deprecated` para eliminación futura |

Verificación externa (`rg -rn "https://valladolid\.mx" src/lib/email-templates/`): **0 matches**.

---

## 9 · Rollback

1. `git revert` del commit PR-1 restaura literales originales.
2. Cero cambios de esquema, migraciones ni configuración externa.
3. Cero impacto en URLs públicas, HTML, JSON-LD emitido, o comportamiento observable en superficies indexadas (`SITE.url` conserva el mismo valor `https://quehacerenvalladolid.com`).

---

## 10 · Validaciones

- ✅ Fuente única de verdad establecida (`src/config/site.ts`).
- ✅ Todos los helpers públicos SEO/OG/email/JSON-LD/EB consumen la SoT (directamente o vía alias documentado).
- ✅ Cero referencias activas nuevas a literales del dominio en el código migrado.
- ✅ Typecheck: los únicos errores reportados por `tsgo` (5) son **pre-existentes** en `DiscoveryNavigatorBlock`, `MarketplaceSurface`, `product-blocks.legacy` y `favoritos` (rutas `/marketplace/$slug`) — ninguno introducido por PR-1.
- ✅ URLs públicas, canonical, OG, JSON-LD, sitemap, robots, llms.txt, PWA y MCP conservan comportamiento idéntico.

---

## 11 · Confirmación de migración futura a `https://valladolid.mx`

Con la arquitectura consolidada por PR-1, la migración del dominio maestro
requerirá **editar exclusivamente dos líneas en `src/config/site.ts`**:

```ts
const PUBLIC_DOMAIN = "valladolid.mx";     // ← cambio
const PUBLIC_URL = `https://${PUBLIC_DOMAIN}` as const;
```

Automáticamente propagan:

- `SITE.url`, `SITE.domain`, `SITE.og_image`
- `absoluteUrl()` (breadcrumbs, JSON-LD, canonical, OG, twitter, breadcrumb IDs, place/business/product/collection `@id`)
- `DISCOVERY_ORIGIN`, `SITE_DEFAULT_OG_IMAGE` (aliases)
- `PUBLIC_ORIGIN` de visibility notifications
- 12 email templates (portalUrl, couponUrl, planUrl, reviewUrl)
- Experience Builder SEO preview
- JSON-LD de `/blog`

**Pendiente explícito para PRs posteriores (fuera de PR-1 por directiva):**
`robots.txt`, `sitemap[.]xml.ts` (`BASE_URL` local), `llms.txt`, HMAC allow-list (`shadow-evaluator.server.ts`), consent UI MCP, contenido legal, migraciones (inmutables — quedan como referencias históricas legítimas).

---

*PR-1 · Canonical Core Consolidation — Completion Report v1.0 emitido.
Ninguna URL pública fue modificada. Ningún comportamiento visible cambió.*
