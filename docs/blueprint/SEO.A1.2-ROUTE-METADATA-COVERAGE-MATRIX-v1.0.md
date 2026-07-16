# SEO.A1.2 · Route Metadata Coverage — Matriz de Cobertura v1.0

**Fase:** Inventario (previa al wire-up).
**Fuente única SEO:** `src/lib/discovery/seo.ts` (`buildPublicHead`).
**Dominio canónico:** `https://quehacerenvalladolid.com`.
**Regla:** cero modificaciones de código en esta fase; sólo diagnóstico.

---

## 1. Convención de estados

- **✅ Completa** — usa `buildPublicHead`, title/desc específicos, canonical absoluto, OG/Twitter derivados, imagen social real o fallback oficial.
- **🟡 Parcial** — usa el helper pero carece de imagen social, o OG/Twitter incompletos, o canonical relativo.
- **🟠 Genérica** — title/description no reflejan contenido específico.
- **⚫ Noindex correcta** — superficie privada/personal/técnica; debe permanecer noindex.
- **⚠️ Decisión Founder** — requiere resolución explícita.

> `buildPublicHead` ya emite `title`, `description`, `og:title`, `og:description`, `og:type`, `og:url`, `og:locale`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description` en todos los llamadores. `og:image` + `twitter:image` sólo se emiten si el llamador pasa `ogImage`. Canonical absoluto se emite siempre (self-referencial). Por tanto la brecha real se concentra en: (a) **imagen social**, (b) **rutas que no invocan el helper**, (c) **decisiones de indexación**.

---

## 2. Matriz principal

| Ruta | Estado | title | description | canonical | robots | OG core | Twitter | Imagen social | Brecha | Acción propuesta |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` (Home CMS) | 🟡 | específico o CMS | específico o default | `/` absoluto | index | ✅ | ✅ | Sólo si `chrome.seo.og_image` | Fallback oficial ausente | Wire-up: hero publicado del EB o fallback `SITE.og_image` absoluto |
| `/oriente-maya` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ sin `ogImage` | Sin OG image | Fallback oficial |
| `/oriente-maya/$destino` | 🟡 | ✅ | DB o fallback | ✅ | index | ✅ | ✅ | ⚠️ sin `ogImage` | Falta hero destino | Wire-up: hero del destino o fallback |
| `/oriente-maya/$destino/$categoria` | 🟠 | Auto-derivado | Auto-derivado | ✅ | index | ✅ | ✅ | ❌ | Descripción plantilla, sin OG | Descripción editorial CMS + OG derivado del destino |
| `/oriente-maya/$destino/$categoria/$empresa` | 🟡 | ✅ | Recorte 300 | ✅ | index | ✅ | ✅ | ⚠️ sin `ogImage` | Falta portada empresa | `business.cover_url` o primera media |
| `/oriente-maya/$destino/$categoria/$empresa/$producto` | 🟡 | ✅ | tagline/desc | ✅ | index | ✅ | ✅ | ⚠️ sin `ogImage` | Falta portada producto | `product.cover_url` |
| `/producto/$slug` (legacy) | ✅ | ✅ | ✅ | ✅ (rewrite territorial) | index | ✅ | ✅ | ✅ (cover) | — | Mantener |
| `/experiencias` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/hoteles` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/restaurantes` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/casas-de-vacaciones` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/empresas` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/promociones` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/eventos` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/eventos/$slug` | 🟡 | ✅ | Summary | ✅ | index (noindex si 404) | ✅ | ✅ | ⚠️ | Falta imagen evento | `event.cover_url` o portada organizador |
| `/blog` | 🟡 + ⚠️ | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG **y** sin `/blog/$slug` público | Fallback OG + **Decisión Founder** sobre ruta artículo |
| `/arma-tu-viaje` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/contacto` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/convertir-en-anfitrion` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/que-hacer` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/alux` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/privacidad` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/terminos` | 🟡 | ✅ | ✅ | ✅ | index | ✅ | ✅ | ⚠️ | Sin OG | Fallback oficial |
| `/p/$slug` (EB públicas) | 🟡 | CMS o fallback | CMS o fallback | ✅ | según `seo.noindex` | ✅ | ✅ | Sólo si CMS lo define | Falta fallback | Primer hero del snapshot o fallback oficial |
| `/l/$slug` (Landings EB) | 🟡 | CMS | CMS | ✅ | según `seo.noindex` | ✅ | ✅ | Sólo si CMS lo define | Igual que `/p/$slug` | Wire-up idéntico |
| `/mapa` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | ⚠️ | Ratificado noindex | Mantener |
| `/marketplace` | n/a | — | — | — | 301→`/oriente-maya` | — | — | — | Redirect permanente | Mantener |
| `/marketplace/$` | n/a | — | — | — | 301 | — | — | — | Redirect | Mantener |
| `/viajero/$handle` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | avatar | Ratificado | Mantener |
| `/auth` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | — | — | Mantener |
| `/reset-password` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | — | — | Mantener |
| `/unsubscribe` | ⚫ | ✅ | mínimo | — | **noindex** | ❌ | ❌ | — | Meta manual | Migración a helper opcional (baja prio) |
| `/offline` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | — | — | Mantener |
| `/preview/$token` | ⚫ | ✅ | ✅ | ✅ | **noindex** | ✅ | ✅ | — | — | Mantener |
| `/preview/composition/$token` | ⚫ | — | — | — | **noindex** (verificar) | — | — | — | Interno | Verificar noindex |
| `/resenar/negocio/$slug` | ⚫ | ✅ | ✅ | — | **noindex** | ❌ | ❌ | — | Meta manual | Migrar a helper (baja prio) |
| `/viaje-compartido/$token` | ⚫ | ✅ | ✅ | — | **noindex, nofollow** | Parcial | — | — | Meta manual, sin `og:url`/twitter | Ratificar noindex; migración opcional |
| `/.lovable/oauth/consent` | ⚫ | — | — | — | **noindex** (verificar) | — | — | — | OAuth interno | Verificar |
| `/_authenticated/*` (cms, cuenta, admin, concierge, portal, empresa, mi-viaje, paginas) | ⚫ | — | — | — | **noindex** obligatorio | — | — | — | Superficies privadas | Wire-up `noindex` a nivel del layout `_authenticated` como defensa en profundidad |

---

## 3. Brechas transversales

1. **Imagen social por defecto ausente.** Ninguna superficie declara `ogImage` cuando no hay contenido específico. `SITE.og_image = "/logo.png"` es relativo y no válido como `og:image` absoluto. Falta un fallback oficial absoluto (`https://quehacerenvalladolid.com/og/default-1200x630.jpg`) o resolver `/logo.png` a URL absoluta dentro de `buildPublicHead`.
2. **Hero derivado no cableado.** Rutas territoriales (destino, categoría, empresa, producto, evento) tienen imágenes reales publicadas pero no las pasan a `ogImage`. Requiere wire-up puntual en cada `head()` a partir de `loaderData`.
3. **Rutas con meta manual** (`/unsubscribe`, `/resenar/negocio/$slug`, `/viaje-compartido/$token`). Todas son `noindex`, impacto SEO nulo, pero rompen la fuente única. Migración a `buildPublicHead` es cosmética; diferible.
4. **Layout `_authenticated`.** Debe garantizarse `noindex` a nivel de layout para blindar todo el árbol privado sin depender de cada hoja.
5. **Blog editorial.** No existe ruta pública `/blog/$slug`. La listing `/blog` es placeholder. **Decisión Founder**: (a) crear ruta pública mínima en SEO.A1.2 con metadata por artículo, o (b) mantener sólo el índice y postergar.
6. **`/mapa`.** Ratificado noindex.

---

## 4. Decisiones requeridas para el wire-up

| # | Decisión | Recomendación |
|---|---|---|
| D1 | Imagen social por defecto absoluta | Generar/subir `og-default.jpg` (1200×630) como asset estable; ajustar `SITE.og_image` a URL absoluta. |
| D2 | Fallback en `buildPublicHead` | Añadir default opcional (`ogImage ?? SITE_DEFAULT_OG`) para que ninguna ruta indexable quede sin imagen. |
| D3 | `/blog/$slug` | Crear ruta pública mínima en SEO.A1.2 o postergar. |
| D4 | Páginas EB publicadas | Ratificar: `visibility === "public"` ⇒ index; `private`/`draft` ⇒ noindex (ya se cumple vía `seo.noindex`). |
| D5 | `/viaje-compartido/$token` | Ratificar `noindex, nofollow` permanente (datos personales). |
| D6 | Layout `_authenticated` | Autorizar wire-up de `noindex` a nivel de layout como defensa en profundidad. |

---

## 5. Definition of Done pendiente (post-autorización)

- Wire-up de `ogImage` en rutas territoriales (destino, categoría, empresa, producto, evento) reutilizando el hero publicado.
- Fallback oficial de imagen social absoluto.
- `noindex` a nivel del layout `_authenticated`.
- SSR sample check (curl 5 rutas indexables) para confirmar `<meta>` en HTML inicial.
- Typecheck sin errores nuevos.
- Matriz antes/después.
- Completion Report v1.0.
- Veredicto GO/NO-GO para SEO.A1.3.

---

## 6. Recomendación

**GO condicionado** al wire-up, sujeto a que el Founder resuelva D1..D6. Se recomienda ejecutar el wire-up en un solo PR por familia (territorial, listados, institucionales, EB), sin tocar contratos ni arquitectura de rutas.

**Fin del inventario. A la espera de autorización Founder para iniciar el wire-up.**
