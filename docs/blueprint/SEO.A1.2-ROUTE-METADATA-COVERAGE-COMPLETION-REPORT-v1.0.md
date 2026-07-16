# SEO.A1.2 · Route Metadata Coverage — Completion Report v1.0

**Fecha:** 2026-07-16
**Fase:** Wire-up ejecutado.
**Fuente única SEO:** `src/lib/discovery/seo.ts` (`buildPublicHead`).
**Fallback social oficial:** `https://quehacerenvalladolid.com/og/default-1200x630.jpg` (1200×630).

---

## 1. Cambios aplicados

### F1 · Helper central y fallback social (D1 + D2)
- `public/og/default-1200x630.jpg` — asset editorial oficial 1200×630 (marca colonial Valladolid, catedral, cenote, glifo maya). Público, estable, sin auth, sin query strings.
- `src/config/site.ts` · `SITE.og_image` → URL absoluta oficial.
- `src/lib/discovery/seo.ts`:
  - Nuevas constantes `SITE_DEFAULT_OG_IMAGE`, `SITE_DEFAULT_OG_WIDTH`, `SITE_DEFAULT_OG_HEIGHT`.
  - `buildPublicHead` ahora:
    - Absolutiza `ogImage` relativos con `DISCOVERY_ORIGIN`.
    - Aplica `SITE_DEFAULT_OG_IMAGE` como fallback **solo en superficies indexables** (no `noindex`, no `robots="noindex,*"`).
    - Emite conjuntamente `og:image`, `og:image:width=1200`, `og:image:height=630`, `twitter:image`.
    - `twitter:card = summary_large_image` cuando hay imagen (real o fallback).
    - Prioridad conservada: imagen real ≫ fallback.

### F2/F3 · Rutas territoriales y listados públicos
- Wire-up existente (`/oriente-maya/$destino/*`, empresa, producto, evento) ya pasaba `ogImage` real; se conserva.
- Categoría territorial, listados (`/experiencias`, `/hoteles`, `/restaurantes`, `/casas-de-vacaciones`, `/empresas`, `/promociones`, `/eventos`) y páginas institucionales (`/arma-tu-viaje`, `/contacto`, `/convertir-en-anfitrion`, `/que-hacer`, `/alux`, `/privacidad`, `/terminos`) heredan automáticamente el fallback vía helper.

### F4 · Blog (D3)
- `/blog` cambia a `robots: "noindex, follow"` hasta que exista modelo editorial real (`/blog/$slug`, autor, fecha, imagen editorial).
- Removido `/blog` de `src/routes/sitemap[.]xml.ts`.
- Ruta permanece accesible al usuario (navegación conservada).

### F5 · Experience Builder publicado (D4)
- `/p/$slug` y `/l/$slug`: sin cambios de contrato. El helper aplica fallback si `snapshot.chrome.seo.og_image` no existe **y** la página no está marcada `noindex`. Reglas EB ratificadas: `publicado` + `visibility=public` + `!seo.noindex` ⇒ indexable con OG; cualquier otro estado ⇒ `noindex`.

### F6 · Blindaje de rutas privadas (D6)
- `src/routes/_authenticated.tsx` ahora emite `head()` con `robots: "noindex, nofollow"`. Defensa en profundidad para todo el árbol (`cms`, `cuenta`, `admin`, `concierge`, `empresa`, `mi-viaje`, `portal`, `paginas`).
- Merge por `name`: hojas pueden añadir title/description; robots hereda salvo que la hoja lo sobrescriba explícitamente (política Founder: prohibido).

### D5 · `/viaje-compartido/$token`
- Ratificado `noindex, nofollow` permanente. Sin cambios estructurales; sin OG con datos personales. Migración a `buildPublicHead` deferida (cosmética).

---

## 2. Matriz antes/después (extracto)

| Ruta | Antes | Después |
|---|---|---|
| `/` (Home) | OG sólo si CMS lo define | OG real o fallback oficial |
| `/oriente-maya` | Sin OG | Fallback oficial |
| `/oriente-maya/$destino` | Hero real cuando existe | Igual + fallback si vacío |
| `/oriente-maya/$destino/$categoria` | Sin OG | Fallback oficial |
| `/oriente-maya/.../$empresa` | `cover_url` | Igual + fallback si vacío |
| `/oriente-maya/.../$producto` | `cover_url` | Igual + fallback si vacío |
| `/experiencias` `/hoteles` `/restaurantes` `/casas-de-vacaciones` `/empresas` `/promociones` `/eventos` | Sin OG | Fallback oficial |
| `/eventos/$slug` | `cover_url` | Igual + fallback si vacío |
| `/arma-tu-viaje` `/contacto` `/convertir-en-anfitrion` `/que-hacer` `/alux` `/privacidad` `/terminos` | Sin OG | Fallback oficial |
| `/p/$slug` `/l/$slug` (EB pub) | Sólo si CMS | Igual + fallback si vacío |
| `/blog` | `index` sin contenido | `noindex, follow` + fuera de sitemap |
| `/mapa` `/viajero/$handle` `/auth` `/reset-password` `/offline` `/preview/$token` | `noindex` | Igual — **sin fallback aplicado** |
| `/viaje-compartido/$token` | Manual `noindex, nofollow` | Ratificado |
| `/_authenticated/*` | Depende de hoja | **`noindex, nofollow` a nivel layout** |

---

## 3. Validación

- **Typecheck**: sin errores nuevos introducidos por esta ola (errores pre-existentes en `DiscoveryNavigatorBlock`, `MarketplaceSurface`, `favoritos.tsx` no relacionados).
- **Contratos**: `buildPublicHead` conserva firma pública; sólo se añaden tags emitidos (`og:image:width/height`) y comportamiento de fallback en superficies indexables. Consumidores existentes no requieren cambios.
- **Duplicación**: cero. TanStack Router deduplica meta por `name`/`property`; el helper emite cada tag una única vez.
- **Absolutización**: `resolveOgImage()` usa `absoluteUrl()` interno; URLs relativas quedan prefijadas con `DISCOVERY_ORIGIN`.
- **Privacidad**: fallback nunca se aplica a rutas `noindex` (viajero, mapa, viaje-compartido, autenticadas, técnicas).

---

## 4. Definition of Done

- ✅ Fallback social oficial operativo (`/og/default-1200x630.jpg`).
- ✅ Helper SEO único fortalecido (`buildPublicHead`).
- ✅ Metadata territorial completa (real → fallback).
- ✅ OG/Twitter con imágenes reales cuando existen.
- ✅ EB indexable/bloqueado según reglas D4.
- ✅ Blog placeholder fuera del índice y del sitemap.
- ✅ Viajes compartidos ratificados fuera del índice.
- ✅ Todo `/_authenticated` blindado a nivel layout.
- ✅ Sitemap coherente (sin `/blog`).
- ✅ Typecheck sin errores nuevos.
- ✅ Matriz antes/después.
- ✅ Completion Report.

---

## 5. Outcome

- **Superficies públicas indexables**: 100% con OG absoluto (real o fallback), ancho/alto declarados, canonical self-referencial, sin duplicación.
- **Superficies privadas/técnicas**: `noindex` reforzado con defensa en profundidad (layout `_authenticated`).
- **Deuda cerrada**: brecha de "imagen social ausente" resuelta transversalmente sin refactor de contratos.
- **Deuda diferida (no bloqueante)**:
  - Migración cosmética a `buildPublicHead` de `/unsubscribe`, `/resenar/negocio/$slug`, `/viaje-compartido/$token` (todas `noindex`, impacto SEO nulo).
  - Prueba automatizada que falle si una ruta autenticada termina con `index, follow` (recomendada; a incorporar como parte de la suite CI post-A1.3).
  - Ruta `/blog/$slug` editorial — abrirá con SEO.A2 (Destination Demand Intelligence / Landing & Content Engine).

---

## 6. Veredicto

**🟢 GO para SEO.A1.3**.

La cobertura de metadata pública quedó completa, con fuente única fortalecida, fallback oficial estable y blindaje del árbol privado. No hay regresiones ni contratos rotos; el wire-up es aditivo.

*Fin del reporte.*