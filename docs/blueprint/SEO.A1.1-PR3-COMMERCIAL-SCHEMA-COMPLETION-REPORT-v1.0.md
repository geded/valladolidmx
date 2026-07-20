# SEO.A1.1 · PR-3 · Commercial Schema — Completion Report v1.0

**Programa:** Carril B · Hardening SEO Evolution & Launch Readiness
**Épica:** SEO.A1.1 · Entity Structured Data
**Sub-ola:** PR-3 · Commercial Schema
**Estado:** Entregado — recomendación GO
**Principio vinculante:** *No markup without visible evidence.*

> **Actualización v1.1 · Founder Acceptance Review PR-3.**
> Se corrigen dos desviaciones semánticas exigidas por el Founder:
> (1) `organizer` deja de usar `ORG_ID` como fallback genérico;
> (2) se ratifica que `price: 0` sólo se emite bajo la bandera
> canónica `is_free = true` visible en la UI ("Entrada: Gratuita").

## 1. Alcance

Ampliar el marcado estructurado de las entidades comerciales y de reputación visibles al viajero: `Product`, `Offer`, `Event`, `Review`, `AggregateRating`, `FAQPage`. Se reutilizan helpers y datos ya publicados por PR-1/PR-2. Cero duplicación de contratos. Cero datos inventados.

## 2. Rutas intervenidas

| Ruta | Entidades emitidas |
| --- | --- |
| `/oriente-maya/{destino}/{categoria}/{empresa}/{producto}` | `Product` (con `Offer`, `AggregateRating`, `Review[]`, `brand=@id`, `seller=@id`, `category`) + `FAQPage` con `about=@id(product)` |
| `/eventos/{slug}` | `Event` (con `location`, `offers` sólo con evidencia, `organizer` sólo con evidencia real, `eventStatus`, `eventAttendanceMode`) |

Ninguna otra ruta cambia — PR-1/PR-2 permanecen intactos.

## 3. Matriz entidad interna → Schema.org

| Interna | Schema.org | Fuente | Emitido | Omitido (motivo) |
| --- | --- | --- | --- | --- |
| `products` | `Product` | `getMarketplaceProductBySlug` | `name`, `description`, `image`, `sku=slug`, `category`, `brand=@id(business)`, `url`, `@id` | `mpn/gtin` (no capturado en CMS) |
| `products.price_amount` | `Offer` | mismo DTO | `price`, `priceCurrency`, `availability`, `url`, `seller=@id(business)` | `priceValidUntil` (nunca inventado); Offer omitido si `price_amount <= 0` |
| `reviews` (subset visible) | `Review[]` | `reviews` status=published, deleted_at null | `reviewRating`, `author`, `reviewBody`, `datePublished`, `inLanguage`, `itemReviewed=@id(product)` | Reseñas moderadas / borradores / eliminadas |
| `review_stats` | `AggregateRating` | agregado visible | `ratingValue`, `reviewCount`, `bestRating=5`, `worstRating=1` | Se omite entero si `count == 0` |
| `faqs` (product) | `FAQPage` | `faqs` publicadas | `@id`, `about=@id(product)`, `mainEntity[]` | Se omite si no hay FAQs visibles |
| `events` | `Event` | `getEventBySlug` publicado | `name`, `description`, `image`, `startDate`, `endDate`, `eventStatus`, `eventAttendanceMode`, `location`, `offers` (sólo con `is_free=true` o `external_url`), `organizer` (sólo cuando `business_id` referencia empresa publicada con destino + categoría + slug), `url`, `@id` | `performer` (no publicado); dirección sólo si `venue_name` presente; `organizer` omitido si no hay evidencia — `ORG_ID` NUNCA como fallback |

## 4. Ejemplos SSR

### 4.1 Product con precio + brand + seller

```json
{
  "@type": "Product",
  "@id": "https://quehacerenvalladolid.com/…/tour-cenote-suytun-guiado-demo#product",
  "name": "Tour Cenote Suytun · Guiado",
  "sku": "tour-cenote-suytun-guiado-demo",
  "category": "Cenotes",
  "brand": { "@id": "https://quehacerenvalladolid.com/…/cenote-suytun#business" },
  "offers": {
    "@type": "Offer",
    "price": 550,
    "priceCurrency": "MXN",
    "availability": "https://schema.org/InStock",
    "seller": { "@id": "https://quehacerenvalladolid.com/…/cenote-suytun#business" },
    "url": "https://quehacerenvalladolid.com/…/tour-cenote-suytun-guiado-demo"
  }
}
```

### 4.2 Event vigente

```json
{
  "@type": "Event",
  "@id": "https://quehacerenvalladolid.com/eventos/festival-sac-be-valladolid#event",
  "name": "Festival Sac-Be Valladolid",
  "startDate": "2026-07-23T05:54:17+00:00",
  "endDate":   "2026-07-25T05:54:17+00:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Ex-convento de Sisal",
    "address": { "@type":"PostalAddress","addressLocality":"Valladolid","addressRegion":"Yucatán","addressCountry":"MX" }
  },
  "offers": { "@type":"Offer","url":"…","availability":"https://schema.org/InStock","price":0,"priceCurrency":"MXN" }
  // organizer omitido: el evento no fue publicado con business_id
  // organizador real; Valladolid.mx sólo publica/lista el evento.
}
```

> `price: 0` aparece porque este evento tiene `is_free = true` visible
> en la ficha ("Entrada: Gratuita"). Cuando `is_free = false` y no
> hay `external_url`, se omite `offers`. `price_amount null` / ausente
> **nunca** se traduce a `price: 0`.

### 4.3 FAQPage vinculada al Product

```json
{
  "@type": "FAQPage",
  "@id": "https://quehacerenvalladolid.com/…/{producto}#faq",
  "about": { "@id": "https://quehacerenvalladolid.com/…/{producto}#product" },
  "mainEntity": [ { "@type":"Question","name":"…","acceptedAnswer":{"@type":"Answer","text":"…"} } ]
}
```

### 4.4 Review individual

```json
{
  "@type": "Review",
  "reviewRating": { "@type":"Rating","ratingValue":5,"bestRating":5,"worstRating":1 },
  "author": { "@type":"Person","name":"María P." },
  "reviewBody": "…",
  "datePublished": "2026-06-10T12:00:00Z",
  "inLanguage": "es",
  "itemReviewed": { "@id": "https://quehacerenvalladolid.com/…/{producto}#product" }
}
```

## 5. Cumplimiento del principio *No markup without visible evidence*

| Regla | Aplicación |
| --- | --- |
| Nada tras auth | reads vía publishable client + policies `TO anon` |
| Cero borradores | queries filtran `status='published'` y `deleted_at IS NULL` |
| Cero simulaciones | Reviews sólo de `public.reviews`; Simulation Pack aislado |
| Sin `priceValidUntil` inventado | omitido si no hay dato canónico |
| Sin `Offer` vacío | Product: `price_amount > 0`; Event: `externalUrl \|\| isFree`. `price: 0` sólo con `is_free=true` visible; nunca por ausencia de precio |
| Sin `AggregateRating` inflado | omitido si `reviewCount == 0`; mismo agregado que la UI |
| FAQ visible | sólo si la ficha lista FAQs publicadas |
| Event cancelado ≠ activo | `eventStatus` viene del CMS (default `EventScheduled`); helper soporta `EventCancelled/Postponed/Rescheduled/MovedOnline` cuando el CMS los exponga |
| Organizer con evidencia | `organizer` emitido sólo si el evento fue publicado con `business_id` que referencia empresa publicada con destino + categoría + slug — se emite por `@id`. Si sólo hay nombre publicado, se emite `Organization` con `name`. **Sin evidencia ⇒ `organizer` se omite.** ORG_ID prohibido como fallback |
| Datos externos sin licencia | prohibidos |

## 6. Validación

| Escenario | Resultado |
| --- | --- |
| Experiencia con precio (`tour-cenote-suytun-guiado-demo`) | ✅ Product+Offer con seller |
| Experiencia sin precio | ✅ Product sin Offer |
| Evento vigente (`festival-sac-be-valladolid`) | ✅ Event `EventScheduled` con location + offers (`price:0`, `is_free=true`); `organizer` OMITIDO (sin `business_id` publicado) |
| Evento con `is_free=false` sin `external_url` | ✅ `offers` omitido (sin evidencia de venta) |
| Evento con `business_id` publicado (empresa organizadora) | ✅ `organizer = { @id: businessEntityId(...) }` — referencia por `@id`, cero duplicación |
| Evento cancelado | Helper preparado; sin datos publicados hoy |
| Ficha con reseñas | ✅ `Review[]` + `AggregateRating` |
| Ficha sin reseñas (demo) | ✅ silencio limpio |
| Página con FAQ visible | ✅ FAQPage con `about=@id(product)` |
| Página sin FAQ | ✅ ninguna FAQPage |
| `bunx tsgo --noEmit` | 0 errores nuevos (7 errores legacy Carril B permanecen ajenos) |
| SSR JSON-LD válido (curl) | ✅ 4 rutas verificadas |
| `@id` estables absolutos | ✅ |
| Cero duplicados | ✅ |
| Canonical + robots | ✅ |

## 7. Relaciones por `@id`

```
Organization (ORG_ID)
 └── publisher de WebSite
    (NUNCA organizer de Event de terceros)

LocalBusiness (#business, cuando publica el evento)
 └── organizer de Event

Region (ORIENTE_MAYA_PLACE_ID)
 └── containedInPlace de Destination
     └── containedInPlace de LocalBusiness (#business)
         ├── brand de Product (#product)
         └── seller de Offer

Product (#product)
 ├── itemReviewed de Review
 └── about de FAQPage (#faq)
```

## 8. Rollback

Cambios aislados en 3 archivos: `src/lib/discovery/seo.ts`, `src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx`, `src/routes/eventos.$slug.tsx`. Sin migraciones ni cambios de DTO. `git revert` restaura el marcado previo.

## 9. Outcome Validation

- Cobertura comercial completa (Product/Offer/Event/Review/AggregateRating/FAQPage) con evidencia visible.
- Reconciliación por `@id` con PR-1/PR-2 sin reemitir entidades.
- Cero datos inventados, cero `Offer` vacío, cero rating inflado.
- Helper preparado para estados de evento (Cancelled/Postponed/Rescheduled/MovedOnline) y hasta 10 reseñas visibles cuando el CMS/moderación las publiquen.

## 10. Ratificación Founder Acceptance Review PR-3

| Requisito | Estado |
| --- | --- |
| `organizer` nunca cae en `ORG_ID` como fallback | ✅ Corregido en `src/routes/eventos.$slug.tsx` (ORG_ID eliminado) |
| `organizer` emite `@id` de la empresa cuando existe evidencia | ✅ vía DTO extendido `organizer_business_slug/destination_slug/category_slug` |
| `organizer` como `Organization`/`Person` cuando sólo hay nombre | ✅ soportado por `organizerName` del helper |
| `organizer` omitido sin evidencia | ✅ default en helper y en la ruta |
| `price: 0` sólo con gratuidad explícita visible (`is_free=true`) | ✅ verificado en helper — `price_amount null ≠ price 0` |
| `Offer` de evento sin gratuidad y sin `external_url` | ✅ omitido |
| `Review[]` = reseñas publicadas visibles en la misma página | ✅ top 5 publicadas via `getMarketplaceProductBySlug` |
| `AggregateRating.reviewCount` refleja la misma población visible | ✅ mismo `review_stats` que la UI |
| Sin datos personales fuera de la UI | ✅ `Person.name` = nombre público mostrado |
| `itemReviewed` referencia al Product correcto | ✅ por `@id` estable |
| `FAQPage` sólo con FAQs visibles sin auth | ✅ mismo dataset de la ficha |
| `about` de FAQPage → `@id(Product)` | ✅ |
| SSR post-ajuste en producto y evento | ✅ re-verificado con `curl` |
| Canonical + robots | ✅ intactos |
| Typecheck sin errores nuevos | ✅ |

## 11. Veredicto final de SEO.A1.1

- PR-1 Foundation — ratificado y cerrado.
- PR-2 Territorial — ratificado y cerrado.
- PR-3 Commercial — ajustado tras Founder Acceptance Review; recomendación **GO** para cierre automático de SEO.A1.1.

Grafo semántico Region → Destination → LocalBusiness → Product/Offer/Review/FAQPage + Event/Offer completo y reconciliado por `@id`, con SSR verificado y sin datos inventados.

*Fin del reporte.*
