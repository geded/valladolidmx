# SEO.A1.1 · PR-2 · Territorial Schema — Completion Report v1.0

**Estado:** Ejecutado. Pendiente Founder Acceptance Review.  
**Alcance autorizado:** PR-2 · Territorial Schema (grafo Región → Destino → Categoría → Empresa/Producto) + housekeeping aditivo aprobado.

---

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/discovery/seo.ts` | Nuevos helpers `placeId`, `businessEntityId`, `productEntityId`, `collectionId` y constante `ORIENTE_MAYA_PLACE_ID`. Extensión (aditiva) de `touristDestinationJsonLd`, `localBusinessJsonLd`, `productJsonLd`, `collectionPageJsonLd` con `@id` estable, referencias por `@id` (`containedInPlace`, `about`, `publisher`, `isPartOf`) y afinado del mapeo de subtipos Schema.org. Housekeeping: `webPageJsonLd` reconcilia `isPartOf` vía `WEBSITE_ID` y absolutiza `primaryImageOfPage.url`. |
| `src/routes/oriente-maya/index.tsx` | `CollectionPage.about` referencia `ORIENTE_MAYA_PLACE_ID`. |
| `src/routes/oriente-maya/$destino.index.tsx` | Destino usa `containedInId: ORIENTE_MAYA_PLACE_ID` (referencia por `@id`, no re-emisión). |
| `src/routes/oriente-maya/$destino.$categoria.index.tsx` | `CollectionPage.about` → `placeId(destino)`. |
| `src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx` | Empresa incluye `destinationPlaceId` para `containedInPlace`. |
| `src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx` | Producto declara `providerBusinessId` (brand = negocio real, nunca Valladolid.mx). |

**Cero cambios** en contratos públicos, layouts, breadcrumbs visibles, EB, Discovery, Media Pipeline, MCP ni CMS.

---

## 2. Matriz de tipado (interno → Schema.org)

| Interno | Schema.org | Regla |
|---|---|---|
| region (Oriente Maya) | `TouristDestination` | `@id = /oriente-maya#place`. Nodo raíz territorial. |
| destination (pueblo/ciudad) | `TouristDestination` | `containedInPlace → ORIENTE_MAYA_PLACE_ID`. |
| category (listado en destino) | `CollectionPage` + `ItemList` | `about → placeId(destino)`. No es entidad; es superficie editorial. |
| business genérico | `LocalBusiness` | Fallback cuando el slug no matchea. |
| hotel/hospedaje | `Hotel` | (antes `LodgingBusiness`; ahora subtipo específico). |
| restaurant/gastro | `Restaurant` | |
| cenote / zona arqueológica / ruinas / atractivo | `TouristAttraction` | Mapeo por slug de categoría. |
| museo | `Museum` | |
| tour operator / agencia | `TravelAgency` | |
| experiencia | `TouristAttraction` | Fallback conservador (no hay `TouristExperience` en Schema.org core). |
| spa | `HealthAndBeautyBusiness` | |
| bar / café / tienda | `BarOrPub` / `CafeOrCoffeeShop` / `Store` | |
| product | `Product` + `Offer` | `brand → @id del negocio operador` (nunca ORG_ID). |

Cuando no hay certeza suficiente se usa el tipo más general (`LocalBusiness` / `TouristAttraction`) — documentado en el mapper.

---

## 3. Rutas intervenidas y entidades emitidas

| Ruta | Entidades JSON-LD | Referencias por `@id` |
|---|---|---|
| `/` (home) | WebSite, Organization, BreadcrumbList, WebPage | WebPage.isPartOf → WEBSITE_ID; primaryImageOfPage absoluto |
| `/oriente-maya` | WebSite, Organization, BreadcrumbList, TouristDestination (región), CollectionPage | TouristDestination.isPartOf → WEBSITE_ID · CollectionPage.about → ORIENTE_MAYA_PLACE_ID |
| `/oriente-maya/:destino` | + TouristDestination (destino) | containedInPlace → ORIENTE_MAYA_PLACE_ID |
| `/oriente-maya/:destino/:categoria` | + CollectionPage | about → placeId(destino) |
| `/oriente-maya/:destino/:categoria/:empresa` | + Hotel/Restaurant/… | containedInPlace → placeId(destino) · publisher → ORG_ID |
| `/oriente-maya/:destino/:categoria/:empresa/:producto` | + Product (+ FAQPage) | brand → businessEntityId(empresa) |

---

## 4. Ejemplos JSON-LD (extracto SSR real)

### Región `/oriente-maya`
```json
{"@type":"TouristDestination","@id":"https://quehacerenvalladolid.com/oriente-maya#place",
 "isPartOf":{"@id":"https://quehacerenvalladolid.com/#website"},
 "touristType":["Cultural","Naturaleza","Historia Maya","Gastronomía","Cenotes"]}
```

### Destino `/oriente-maya/valladolid`
```json
{"@type":"TouristDestination","@id":"https://quehacerenvalladolid.com/oriente-maya/valladolid#place",
 "geo":{"@type":"GeoCoordinates","latitude":20.6896,"longitude":-88.202},
 "containedInPlace":{"@id":"https://quehacerenvalladolid.com/oriente-maya#place"}}
```

### Listado `/oriente-maya/valladolid/hoteles`
```json
{"@type":"CollectionPage","@id":".../hoteles#collection",
 "isPartOf":{"@id":"https://quehacerenvalladolid.com/#website"},
 "about":{"@id":"https://quehacerenvalladolid.com/oriente-maya/valladolid#place"},
 "mainEntity":{"@type":"ItemList","numberOfItems":3,"itemListElement":[…]}}
```

### Negocio `/oriente-maya/valladolid/hoteles/hacienda-selva-maya`
```json
{"@type":"Hotel","@id":".../hacienda-selva-maya#business",
 "containedInPlace":{"@id":"https://quehacerenvalladolid.com/oriente-maya/valladolid#place"},
 "publisher":{"@id":"https://quehacerenvalladolid.com/#organization"}}
```

---

## 5. Evidencia SSR

Verificado con `curl` contra el dev server sobre 4 URLs (región, destino, listado categoría, ficha hotel). En todas:
- JSON-LD emitido antes de hidratación.
- `@id` únicos por página.
- `isPartOf` → `WEBSITE_ID`.
- Cero duplicación de Organization/WebSite entre root y ruta (root emite fuente única; rutas sólo referencian por `@id`).
- `robots` indexable en las rutas territoriales.

---

## 6. Campos omitidos por falta de datos (regla anti-invención)

| Campo | Cuándo se omite |
|---|---|
| `telephone` / `email` | Sólo si `primary_contact` existe con tipo compatible. |
| `streetAddress` | Sólo si hay `address_line1` real. |
| `geo` | Sólo si latitud y longitud existen (Geolocation Mandatory garantiza cobertura). |
| `priceRange` | No se emite hasta que haya campo canónico en BD (pendiente Founder). |
| `aggregateRating` | Sólo si `reviewCount > 0`. |
| `openingHours` | No emitido — sin fuente canónica todavía. |
| `image` | Sólo si `cover_url` real. |

Nunca se rellena con placeholders.

---

## 7. Housekeeping aplicado (autorizado en PR-2)

1. `WebPage.isPartOf` en Home ahora referencia `WEBSITE_ID` por `@id` (antes re-emitía WebSite parcial).
2. `primaryImageOfPage.url` se absolutiza vía `DISCOVERY_ORIGIN` cuando llega relativa.

Ambos cambios son aditivos, aislados, sin cambio de contrato y sin refactor colateral.

---

## 8. Riesgos

- **Bajo**: subtipos más específicos (`Hotel`, `Museum`, `TravelAgency`) pueden desencadenar validaciones adicionales de Google Rich Results (address/geo). Mitigado por Geolocation Mandatory y `address` mínimo garantizado.
- **Nulo**: no se tocaron contratos públicos, tablas ni contenido.
- **Bajo**: consumidores externos de `webPageJsonLd`/`collectionPageJsonLd` que dependieran del formato inline de `isPartOf` verían ahora una referencia por `@id`. Es semánticamente correcto y sólo aparece en JSON-LD emitido — no hay consumidores conocidos.

---

## 9. Rollback

Reversible con revert único del commit de PR-2 (helpers + 5 rutas). No requiere migración, no toca BD, no cambia URLs, no publica `redirects`.

---

## 10. Outcome Validation

- ✅ Cada entidad territorial tiene `@id` estable, canónico y único por página.
- ✅ Jerarquía Región → Destino → Empresa modelada mediante `containedInPlace` con referencias por `@id` (sin duplicar entidades).
- ✅ `publisher` = `ORG_ID` sólo donde Valladolid.mx es publicador editorial (fichas).
- ✅ `brand` de productos = negocio operador real, jamás Valladolid.mx.
- ✅ Cero datos inventados (dirección, teléfono, horarios, precios).
- ✅ SSR verificado en 4 rutas.
- ✅ Typecheck: limpio.
- ✅ Cero regresiones en EB, Discovery, Media Pipeline, MCP, CMS.

---

## 11. Veredicto

**GO** — condiciones satisfechas. Se sugiere autorizar **PR-3 · Commercial Schema** (Offer refinado, `Event`, `MenuItem`, `Reservation`, `Service`, etc.) sobre esta base ya reconciliada.