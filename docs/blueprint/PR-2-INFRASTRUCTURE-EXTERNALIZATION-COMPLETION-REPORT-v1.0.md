# PR-2 · Infrastructure Externalization — Completion Report v1.0

**Origen:** `CANONICAL-DOMAIN-AUDIT-v1.0.md`
**Dependencia:** PR-1 · Canonical Core Consolidation (cerrado).
**Estado:** Entregado.
**Alcance:** Únicamente infraestructura estática. No modifica MCP, OAuth, HMAC, Media Pipeline, JSON-LD, SEO helpers, EB, canonical, OG/Twitter.

---

## 1. Objetivo

Eliminar todas las referencias rígidas al dominio público en la
infraestructura estática (`robots`, `sitemap`, `llms`, `manifest`,
PWA) y hacer que dependan exclusivamente de la fuente única de verdad
establecida en PR-1 (`src/config/site.ts`).

No se cambia el dominio. No se modifica DNS. No se publica. No cambia
comportamiento visible.

## 2. Archivos modificados / creados / eliminados

| Acción | Archivo | Nota |
|---|---|---|
| Modificado | `src/routes/sitemap[.]xml.ts` | Elimina `const BASE_URL = "https://…"`; consume `absoluteUrl()` de `@/config/site`. |
| Creado | `src/routes/robots[.]txt.ts` | `/robots.txt` dinámico; `Sitemap:` derivado de `absoluteUrl("/sitemap.xml")`. |
| Creado | `src/routes/llms[.]txt.ts` | `/llms.txt` dinámico; todos los enlaces absolutos vía `absoluteUrl()`; título y sitio canónico desde `SITE.name`, `SITE.tagline`, `SITE.url`. |
| Creado | `src/routes/manifest[.]webmanifest.ts` | `/manifest.webmanifest` dinámico; `name`, `short_name`, `theme_color` desde `SITE`. |
| Eliminado | `public/robots.txt` | Sustituido por server route. |
| Eliminado | `public/llms.txt` | Sustituido por server route. |
| Eliminado | `public/manifest.webmanifest` | Sustituido por server route. |

Sin cambios en: `src/routes/__root.tsx` (ya consumía `SITE.theme_color`
y referenciaba `/manifest.webmanifest`, `/favicon.ico`, `/logo.png` con
paths relativos), `vite.config.ts`, PWA config, `public/push-sw.js`,
`public/pwa-skipwaiting.js`, iconos, `og/*`.

## 3. Referencias hardcodeadas eliminadas

Búsqueda `rg "quehacerenvalladolid\.com|valladolidmx\.lovable\.app|orientemaya\.com"`
sobre el scope de PR-2 (`public/`, `src/routes/{sitemap,robots,llms,manifest}*.ts`):

- **Antes:** 22 ocurrencias (1 en sitemap route + 1 en `robots.txt` + 20 en `llms.txt`).
- **Después:** 0 ocurrencias.

## 4. Dependencias eliminadas

| Antes | Después |
|---|---|
| `const BASE_URL = "https://quehacerenvalladolid.com"` (sitemap) | `absoluteUrl(e.path)` desde `@/config/site` |
| `Sitemap: https://quehacerenvalladolid.com/sitemap.xml` (robots estático) | `Sitemap: ${absoluteUrl("/sitemap.xml")}` (server route) |
| 20 URLs absolutas hardcodeadas (llms estático) | `absoluteUrl(path)` por entrada (server route) |
| `manifest.webmanifest` estático con literales | server route con `SITE.name` / `SITE.theme_color` |

## 5. Arquitectura antes / después

**Antes:** 4 fuentes independientes (route + 3 ficheros estáticos)
con literales del dominio.

**Después:** 1 fuente única — `src/config/site.ts` (`PUBLIC_DOMAIN`,
`PUBLIC_URL`, `absoluteUrl`, `SITE`). Los 4 recursos derivan de ella:

```
src/config/site.ts (SoT)
  ├── src/routes/sitemap[.]xml.ts
  ├── src/routes/robots[.]txt.ts
  ├── src/routes/llms[.]txt.ts
  └── src/routes/manifest[.]webmanifest.ts
```

## 6. Validaciones

- ✓ `robots` deriva de la fuente única (`absoluteUrl("/sitemap.xml")`).
- ✓ `sitemap` deriva de la fuente única (`absoluteUrl(e.path)`).
- ✓ `llms` deriva de la fuente única (`SITE.name`, `SITE.tagline`, `SITE.url`, `absoluteUrl`).
- ✓ `manifest` deriva de la fuente única (`SITE.name`, `SITE.theme_color`).
- ✓ PWA: `start_url` / `scope` permanecen relativos ("/") — se resuelven
  contra el origen donde se sirve el manifest, inmunes al cambio de dominio.
- ✓ Ningún archivo dentro del scope conserva referencias rígidas al dominio (rg = 0).
- ✓ Typecheck limpio sobre los 4 archivos (`bunx tsgo --noEmit`, sin nuevos errores).
- ✓ Rutas registradas automáticamente por el plugin de TanStack Router
  (`routeTree.gen.ts` incluye `/robots.txt`, `/llms.txt`, `/manifest.webmanifest`).

## 7. Fuera de alcance (respetado)

No se tocan: MCP, OAuth, HMAC allow-list, Media Pipeline,
`resolveMediaSource`, JSON-LD, helpers SEO, Experience Builder,
canonical de páginas, Structured Data, OpenGraph de rutas, Twitter
Cards, emails, cron, webhooks, `push-sw.js`, `pwa-skipwaiting.js`.
Esos hallazgos permanecen listados en el Audit para PRs posteriores.

## 8. Rollback

Rollback conservativo (idempotente):

1. `git restore --source=<pre-PR-2> -- public/robots.txt public/llms.txt public/manifest.webmanifest`
2. `rm src/routes/robots[.]txt.ts src/routes/llms[.]txt.ts src/routes/manifest[.]webmanifest.ts`
3. Revertir `src/routes/sitemap[.]xml.ts` a `const BASE_URL = "https://quehacerenvalladolid.com"`.
4. Regenerar `routeTree.gen.ts` (automático en dev/build).

No hay migraciones de datos, no hay dependencias runtime nuevas, no
hay cambios de contrato público (mismas URLs, mismo `Content-Type`,
mismo contenido observable).

## 9. Confirmación de futura migración a `https://valladolid.mx`

Se confirma expresamente: los 4 recursos de infraestructura del scope
de PR-2 (`robots.txt`, `sitemap.xml`, `llms.txt`, `manifest.webmanifest`)
quedan preparados para la migración a `https://valladolid.mx` mediante
**un único cambio de configuración**:

```ts
// src/config/site.ts
const PUBLIC_DOMAIN = "valladolid.mx"; // ← única línea a modificar
```

Ningún archivo adicional dentro del scope de este PR requerirá edición.
La allow-list HMAC, JSON-LD, OG de páginas, canonical, MCP y OAuth se
migran en PRs posteriores según el plan del Audit.

## 10. Historial

- v1.0 — Entrega inicial. Sin regresiones funcionales. Comportamiento
  observable idéntico al previo (mismos endpoints, mismo contenido).