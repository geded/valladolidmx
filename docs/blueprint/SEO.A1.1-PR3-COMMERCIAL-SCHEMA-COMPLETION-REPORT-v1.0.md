# SEO.A1.1 · PR-3 · Commercial Schema — Completion Report v1.0

**Programa:** Carril B · Hardening SEO Evolution & Launch Readiness
**Épica:** SEO.A1.1 · Entity Structured Data
**Sub-ola:** PR-3 · Commercial Schema
**Estado:** Entregado — recomendación GO
**Principio vinculante:** *No markup without visible evidence.*

## 1. Alcance

Ampliar el marcado estructurado de las entidades comerciales y de reputación visibles al viajero: `Product`, `Offer`, `Event`, `Review`, `AggregateRating`, `FAQPage`. Se reutilizan helpers y datos ya publicados por PR-1/PR-2. Cero duplicación de contratos. Cero datos inventados.

## 2. Rutas intervenidas

| Ruta | Entidades emitidas |
| --- | --- |
| `/oriente-maya/{destino}/{categoria}/{empresa}/{producto}` | `Product` (con `Offer`, `AggregateRating`, `Review[]`, `brand=@id`, `seller=@id`, `category`) + `FAQPage` con `about=@id(product)` |
| `/eventos/{slug}` | `Event` (con `location`, `offers`, `organizer=ORG_ID`, `eventStatus`, `eventAttendanceMode`) |

Ninguna otra ruta cambia — PR-1/PR-2 permanecen intactos.

## 3. Matriz entidad interna → Schema.org

| Interna | Schema.org | Fuente | Emitido | Omitido (motivo) |
| --- | --- | --- | --- | --- |
| `products` | `Product` | `getMarketplaceProductBySlug` | `name`, `description`, `image`, `sku=slug`, `category`, `brand=@id(business)`, `url`, `@id` | `mpn/gtin` (no capturado en CMS) |
| `products.price_amount` | `Offer` | mismo DTO | `price`, `priceCurrency`, `availability`, `url`, `seller=@id(business)` | `priceValidUntil` (nunca inventado); Offer omitido si `price_amount <= 0` |
| `reviews` (subset visible) | `Review[]` | `reviews` status=published, deleted_at null | `reviewRating`, `author`, `reviewBody`, `datePublished`, `inLanguage`, `itemReviewed=@id(product)` | Reseñas moderadas / borradores / eliminadas |
| `review_stats` | `AggregateRating` | agregado visible | `ratingValue`, `reviewCount`, `bestRating=5`, `worstRating=1` | Se omite entero si `count == 0` |
| `faqs` (product) | `FAQPage` | `faqs` publicadas | `@id`, `about=@id(product)`, `mainEntity[]` | Se omite si no hay FAQs visibles |
| `events` | `Event` | `getEventBySlug` publicado | `name`, `description`, `image`, `startDate`, `endDate`, `eventStatus`, `eventAttendanceMode`, `location`, `offers`, `organizer=ORG_ID`, `url`, `@id` | `performer` (no publicado); dirección sólo si `venue_name` presente |

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
  "offers": { "@type":"Offer","url":"…","availability":"https://schema.org/InStock","price":0,"priceCurrency":"MXN" },
  "organizer": { "@id": "https://quehacerenvalladolid.com/#organization" }
}
```

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
| Sin `Offer` vacío | Product: `price_amount > 0`; Event: `externalUrl \|\| isFree` |
| Sin `AggregateRating` inflado | omitido si `reviewCount == 0`; mismo agregado que la UI |
| FAQ visible | sólo si la ficha lista FAQs publicadas |
| Event cancelado ≠ activo | `eventStatus` viene del CMS (default `EventScheduled`); helper soporta `EventCancelled/Postponed/Rescheduled/MovedOnline` cuando el CMS los exponga |
| Datos externos sin licencia | prohibidos |

## 6. Validación

| Escenario | Resultado |
| --- | --- |
| Experiencia con precio (`tour-cenote-suytun-guiado-demo`) | ✅ Product+Offer con seller |
| Experiencia sin precio | ✅ Product sin Offer |
| Evento vigente (`festival-sac-be-valladolid`) | ✅ Event `EventScheduled` con location + offers + organizer |
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
 ├── publisher de WebSite
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

## 10. Veredicto final de SEO.A1.1

- PR-1 Foundation — ratificado y cerrado.
- PR-2 Territorial — ratificado y cerrado.
- PR-3 Commercial — entregado; recomendación **GO** para aceptación final.

Grafo semántico Region → Destination → LocalBusiness → Product/Offer/Review/FAQPage + Event/Offer completo y reconciliado por `@id`, con SSR verificado y sin datos inventados.

*Fin del reporte.*
