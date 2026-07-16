# SEO.A1.1 · Entity Structured Data — Matriz de Wire-up (v1.0)

**Versión:** 1.0  ·  **Fecha:** 2026-07-16  ·  **Estado:** Entregable para autorización Founder (previo al wire-up masivo).
**Alcance:** Sólo inventario + matriz. Ninguna ruta modificada. Cero código nuevo en producción.
**Principio vinculante:** *Founder SEO Evolution Principle* — REUTILIZAR → COMPLETAR → OPTIMIZAR → AUTOMATIZAR.

---

## 1. Método

Se cruzaron tres fuentes:

1. Inventario Fase 0 (`SEO.A1-FASE0-INVENTORY-v1.0.md`).
2. Helpers reales de `src/lib/discovery/seo.ts` (fuente única):
   `buildPublicHead`, `breadcrumbListJsonLd`, `touristDestinationJsonLd`,
   `localBusinessJsonLd` (con `mapCategoryToLocalBusinessType` →
   `LodgingBusiness` / `Restaurant` / `TouristAttraction` / `Store` / …),
   `productJsonLd`, `faqPageJsonLd`, `collectionPageJsonLd`, `webPageJsonLd`.
3. Auditoría de consumidores actuales (`rg` sobre `src/routes/**`).

Toda evolución propuesta **extiende** `src/lib/discovery/seo.ts`. No se crea segunda fuente de metadata ni schemas desconectados de los modelos canónicos.

---

## 2. Estado actual (evidencia rg)

| Ruta | Helper JSON-LD emitido hoy |
|---|---|
| `/` (`index.tsx`) | `webPageJsonLd` |
| `/p/$slug` | `webPageJsonLd` |
| `/l/$slug` | `webPageJsonLd` |
| `/oriente-maya` | `touristDestinationJsonLd` + `collectionPageJsonLd` |
| `/oriente-maya/$destino` | `touristDestinationJsonLd` |
| `/oriente-maya/$destino/$categoria` | `collectionPageJsonLd` |
| `/oriente-maya/$destino/$categoria/$empresa` | `localBusinessJsonLd` (subtipo mapeado por slug) |
| `/oriente-maya/$destino/$categoria/$empresa/$producto` | `productJsonLd` (+ `faqPageJsonLd` condicional) |
| `/eventos/$slug` | `Event` inline (no helper) |
| Resto de rutas públicas | Sin JSON-LD dedicado |

`BreadcrumbList` puede emitirse hoy vía `buildPublicHead({ breadcrumbs })`, pero **no está unificado** en las rutas prioritarias.

---

## 3. Matriz de wire-up autorizada

Convenciones:
- **Schema actual** = lo que emite hoy.
- **Schema requerido** = objetivo mínimo de SEO.A1.1.
- **Fuente** = origen real (jamás inventar).
- **@id canónico** = URL canónica del recurso (self-reference).

### 3.1 Sitewide (root)

| Ruta / superficie | Entidad | Schema actual | Schema requerido | Fuente de datos | Campos faltantes |
|---|---|---|---|---|---|
| `__root.tsx` | Organización oficial | — | `Organization` (`@id: https://quehacerenvalladolid.com/#organization`) | `src/config/site.ts`, `docs/brand-assets/logos/` | `logo` absoluto, `sameAs[]` (redes verificadas) |
| `__root.tsx` | Sitio web | — | `WebSite` (`@id: …/#website`, `publisher → @id organization`) | `SITE.name`, `DISCOVERY_ORIGIN` | — |
| `__root.tsx` | Búsqueda | — | `SearchAction` **sólo si** existe búsqueda pública canónica indexable (`?q=`) | Confirmar Founder | Definir template `?q={search_term_string}` |

> Prohibido inventar `SearchAction` si no existe búsqueda canónica publicada.

### 3.2 Rutas territoriales (Oriente Maya)

| Ruta | Entidad | Schema actual | Schema requerido | Fuente | Faltantes |
|---|---|---|---|---|---|
| `/oriente-maya` | Región turística | `TouristDestination` + `CollectionPage` | Mantener + `BreadcrumbList` + `@id: …/oriente-maya#place` + `containsPlace[]` (destinos publicados) | `src/config/regions.ts`, tabla `destinations` | Verificar `image` (hero real) y `geo` central |
| `/oriente-maya/$destino` | Pueblo (Valladolid/Izamal/Espita/…) | `TouristDestination` | + `BreadcrumbList` + `containedInPlace → Oriente Maya` (ya lo hace) + `@id: …#place` + `containsPlace[]` opcional (categorías reales) | Tabla `destinations` | `latitude`/`longitude`, `image` hero, `keywords` reales |
| `/oriente-maya/$destino/$categoria` | Colección de negocios por categoría en destino | `CollectionPage` | Mantener + `BreadcrumbList` + `about: { @type: <TouristAttraction|LodgingBusiness|Restaurant|Store>, name: <categoría> }` cuando la categoría mapee a subtipo turístico | Tabla `categories` + `mapCategoryToLocalBusinessType` | Etiquetas turísticas por categoría |
| `/oriente-maya/$destino/$categoria/$empresa` | Negocio (empresa/hotel/restaurante/atracción) | `LocalBusiness` subtipo por slug | Mantener + `BreadcrumbList` + `@id: …#business` + `containedInPlace → destino#place` + `aggregateRating` sólo si `reviewCount ≥ 1` real | `businesses`, `business_locations`, `reviews` publicadas | `priceRange`, `openingHoursSpecification` (si existe), `sameAs` (redes verificadas) |
| `/oriente-maya/$destino/$categoria/$empresa/$producto` | Producto / experiencia | `Product` (+ `FAQPage` cond.) | Mantener + `BreadcrumbList` + `@id: …#product` + `Offer` sólo con precio real + `aggregateRating` sólo con reseñas reales publicadas | `products`, `product_faqs`, `reviews` | Verificar `sku`, `brand`, `availability` |

### 3.3 Listados globales (rutas públicas indexables)

| Ruta | Entidad | Schema actual | Schema requerido | Fuente | Faltantes |
|---|---|---|---|---|---|
| `/hoteles` | Colección de hospedaje | — | `CollectionPage` + `BreadcrumbList` + `ItemList<LodgingBusiness>` (Top N publicados) | `businesses` categoría `hoteles` | — |
| `/restaurantes` | Colección de gastronomía | — | `CollectionPage` + `ItemList<Restaurant>` | `businesses` categoría gastronómica | — |
| `/experiencias` | Colección de experiencias | — | `CollectionPage` + `ItemList<TouristAttraction>` | `products` marcadas como experiencia publicada | — |
| `/casas-de-vacaciones` | Colección | — | `CollectionPage` + `ItemList<LodgingBusiness>` | `businesses` categoría `casa-de-vacaciones` | — |
| `/empresas` | Directorio | — | `CollectionPage` + `ItemList<LocalBusiness>` | `businesses` publicadas | — |
| `/eventos` | Colección de eventos | — | `CollectionPage` + `ItemList<Event>` (vigentes/futuros) | `events` publicados | — |
| `/promociones` | Colección de ofertas | — | `CollectionPage` + `ItemList<Offer>` (vigentes) | `promotions` vigentes | — |
| `/que-hacer` | Landing exploración | — | `WebPage` + `BreadcrumbList` | Composición EB | — |
| `/mapa` | Mapa público | — | `WebPage` — indexabilidad a decidir por Founder | — | Confirmar noindex |

### 3.4 Rutas de detalle no territoriales

| Ruta | Entidad | Schema actual | Schema requerido | Fuente | Faltantes |
|---|---|---|---|---|---|
| `/eventos/$slug` | Evento | `Event` inline | Portar a `eventJsonLd` en `seo.ts` (extensión) + `BreadcrumbList` + `location: Place` real + `offers` sólo con precio real | `events` | Helper aún no existe — se crea en `seo.ts` |
| `/producto/$slug` (legacy) | Producto | `Product` (según pipeline actual) | Auditar canonical vs ruta territorial y evitar duplicación | `products` | Confirmar redirect si duplica |
| `/p/$slug` (páginas EB) | Página editorial | `WebPage` | Mantener + `BreadcrumbList` cuando aplique | Composición EB | — |
| `/l/$slug` (landings) | Landing | `WebPage` | Mantener + `BreadcrumbList` cuando aplique | Composición EB | — |
| `/blog` | Blog index | — | `WebPage`; futuro `Blog` cuando exista feed real | — | Fuera de A1.1 |
| `/viajero/$handle` | Perfil viajero público | — | `ProfilePage` sólo si publicado y consentido | `traveler_profiles` con flag público | Confirmar consentimiento antes de indexar |

### 3.5 Rutas excluidas (no indexables)

`/auth`, `/reset-password`, `/unsubscribe`, `/privacidad`, `/terminos`, `/contacto`, `/convertir-en-anfitrion`, `/alux`, `/arma-tu-viaje`, `/preview/**`, `/[.]lovable.*`, `/offline`, `_authenticated/**`, `/cms/**`, `/portal/**`.

Se respeta `noindex` donde exista; ninguna emite JSON-LD de entidad turística.

---

## 4. Extensiones autorizadas a `src/lib/discovery/seo.ts`

Fuente única — se **añaden** helpers, no se duplica arquitectura:

1. `organizationJsonLd()` — sitewide, con `@id`, `logo`, `sameAs`.
2. `webSiteJsonLd({ withSearchAction? })` — sitewide; `SearchAction` **opt-in** sólo si Founder confirma búsqueda canónica.
3. `eventJsonLd()` — portar el inline actual de `/eventos/$slug`.
4. `itemListJsonLd()` — listados globales (§3.3) reutilizando patrón de `collectionPageJsonLd`.
5. Ajuste menor a `localBusinessJsonLd` / `touristDestinationJsonLd`: emitir `@id` estable y referenciar `containedInPlace` por `@id` cuando exista.

Prohibido: nueva fuente de metadata, segundo sitemap, helpers paralelos, schemas ficticios.

---

## 5. Reglas duras (recordatorio operativo)

- Excluir entidades no publicadas (`status != 'published'` o `deleted_at IS NOT NULL`).
- Nunca inventar teléfono, precio, rating, horarios, ubicación.
- `aggregateRating` sólo con `reviewCount ≥ 1` real (tabla `reviews`, `status='published'`).
- `FAQPage` sólo cuando la Q/A esté **visible** en la misma URL.
- `og:image` derivada del hero real; fallback oficial sólo si no existe.
- Cero URLs de assets privados.
- Un único `@id` canónico por página.
- Sin `hreflang` mientras las 6 lenguas compartan URL (deuda registrada en `founder-i18n-seo`).

---

## 6. Fuera de alcance de SEO.A1.1

- Wire-up masivo (se autoriza sólo tras aprobación de esta matriz).
- Sitemap-images (SEO.A1.4).
- Review/FAQ expandido (SEO.A1.3).
- Validaciones automatizadas (SEO.A1.5).
- Knowledge Graph, SEO Observatory, i18n por URL.

---

## 7. Solicitud de decisión al Founder

1. **Aprobar matriz §3** para pasar a wire-up incremental (una superficie por PR).
2. **Decidir `SearchAction`:** ¿existe búsqueda pública canónica indexable hoy (`/marketplace?q=` o similar)? Si no, se omite.
3. **Decidir indexabilidad** de `/mapa`, `/blog`, `/viajero/$handle`.
4. **Confirmar orden de wire-up sugerido:**
   1. Root (Organization + WebSite).
   2. Territoriales (`oriente-maya/**`) — completar `BreadcrumbList` + `@id`.
   3. Listados globales (§3.3).
   4. `/eventos/$slug` portado al helper.
   5. Aggregate rating/reviews sobre datos reales.

No se implementará nada hasta recibir GO explícito sobre esta matriz.
