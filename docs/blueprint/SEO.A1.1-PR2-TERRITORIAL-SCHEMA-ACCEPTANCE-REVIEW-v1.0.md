# SEO.A1.1 · PR-2 · Territorial Schema — Founder Acceptance Review v1.0

**Fecha:** 2026-07-16 · **Alcance:** validación de la implementación existente (sin cambios de código).
**Veredicto:** 🟢 **GO** — se autoriza abrir PR-3 · Commercial Schema.

---

## 1 · Identidad territorial

| Chequeo | Evidencia | Resultado |
|---|---|---|
| Entidad única "Oriente Maya" | `ORIENTE_MAYA_PLACE_ID = https://quehacerenvalladolid.com/oriente-maya#place` (constante exportada, sin duplicados) | ✅ |
| `TouristDestination` publicados enlazados a la región | Cada destino emite `containedInPlace: { "@id": ORIENTE_MAYA_PLACE_ID }` (ver §5) | ✅ |
| Sin `TouristDestination` duplicados | Cada ruta emite un único `TouristDestination` con `@id` derivado de su URL canónica (`placeId(path)`) | ✅ |
| `@id` estables y canónicos | Derivan de `absoluteUrl(path)` sobre `DISCOVERY_ORIGIN` fijo; no dependen de request ni de mocks | ✅ |

---

## 2 · Destinos (`/oriente-maya/valladolid` — SSR real)

| Campo | Valor SSR |
|---|---|
| URL canónica | `https://quehacerenvalladolid.com/oriente-maya/valladolid` |
| `@id` | `…/oriente-maya/valladolid#place` |
| `name` | `Valladolid` |
| `description` | Texto editorial real desde BD (`db.description`) |
| `image` | URL firmada real del bucket `destinations/` |
| `geo` | `{ latitude: 20.6896, longitude: -88.202 }` |
| `containedInPlace` | `{ "@id": …/oriente-maya#place }` ✅ |
| `isPartOf` | `{ "@id": WEBSITE_ID }` ✅ |
| Publisher | Se hereda vía `isPartOf → WebSite → publisher: ORG_ID` (correcto para Places) |
| Datos inventados | Ninguno; todo proviene de `getPublicDestinationBySlug` o `DESTINOS_MOCK` como fallback declarado | ✅ |

---

## 3 · Empresas — Matriz Tipo interno → Schema.org

Fuente: `mapCategoryToLocalBusinessType()` en `src/lib/discovery/seo.ts:346-360`.

| Categoría interna (slug) | Schema.org emitido |
|---|---|
| `hoteles`, `hospedaje`, `casas-de-vacaciones` | **Hotel** |
| `restaurantes`, `gastronomia` | **Restaurant** |
| `museos` | **Museum** |
| `tours`, `agencias` | **TravelAgency** |
| `cenotes`, `zonas-arqueologicas`, `ruinas`, `atractivos`, `experiencias` | **TouristAttraction** |
| `spa` | HealthAndBeautyBusiness |
| `bar` | BarOrPub |
| `cafeterias` | CafeOrCoffeeShop |
| `tiendas`, `boutique` | Store |
| Genérico | **LocalBusiness** |

SSR verificado:
- `…/hoteles/hotel-casa-tia-micha` → `"@type":"Hotel"` ✅
- `…/restaurantes/conato-1910` → `"@type":"Restaurant"` ✅

---

## 4 · `ORG_ID` (Valladolid.mx)

| Regla | Implementación | ✓ |
|---|---|---|
| Valladolid.mx **NO** aparece como `brand` de empresas independientes | `localBusinessJsonLd` nunca escribe `brand`. `productJsonLd` usa `brand: { "@id": providerBusinessId }` — nunca `ORG_ID` | ✅ |
| `publisher: ORG_ID` sólo donde corresponde | `WebSite` (editorial) y `LocalBusiness` (Valladolid.mx publica la ficha, no opera el negocio) | ✅ |
| `provider` sólo cuando realmente opera | No se emite `provider: ORG_ID` en ningún helper | ✅ |
| `brand` preserva identidad del negocio | `product.brand = { "@id": providerBusinessId }` → `LocalBusiness` real | ✅ |

---

## 5 · Grafo completo — ejemplo `Hotel Casa Tía Micha`

```
Oriente Maya (Region)
   @id: https://quehacerenvalladolid.com/oriente-maya#place
      ▲ containedInPlace
      │
Valladolid (Destination)
   @id: https://quehacerenvalladolid.com/oriente-maya/valladolid#place
   containedInPlace: { "@id": …/oriente-maya#place }
      ▲ containedInPlace
      │
Hotel Casa Tía Micha (Business)
   @id:        …/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha#business
   @type:      Hotel
   url:        …/oriente-maya/valladolid/hoteles/hotel-casa-tia-micha
   category:   hoteles → Hotel (mapCategoryToLocalBusinessType)
   image:      (cuando el negocio publica hero real)
   containedInPlace: { "@id": …/oriente-maya/valladolid#place }   ← referencia, NO duplicado
   publisher:  { "@id": …/#organization }                          ← ORG_ID (editorial)
```

Todas las relaciones territoriales y editoriales son **referencias por `@id`**; ninguna entidad se re-emite desde otra página.

---

## 6 · SSR — evidencia HTML renderizado

| Superficie | Archivo | JSON-LD SSR | Duplicados | Errores |
|---|---|---|---|---|
| Región `/oriente-maya` | `/tmp/ssr/region.html` (69 KB) | WebSite · Organization · BreadcrumbList · TouristDestination · CollectionPage | 0 | 0 |
| Destino `/oriente-maya/valladolid` | `/tmp/ssr/dest.html` (144 KB) | WebSite · Organization · BreadcrumbList · TouristDestination (containedInPlace → Oriente Maya) | 0 | 0 |
| Hotel `…/hoteles/hotel-casa-tia-micha` | `/tmp/ssr/hotel.html` | WebSite · Organization · BreadcrumbList · **Hotel** (containedInPlace → Valladolid, publisher → ORG_ID) | 0 | 0 |
| Restaurante `…/restaurantes/conato-1910` | `/tmp/ssr/rest.html` | WebSite · Organization · BreadcrumbList · **Restaurant** (containedInPlace → Valladolid, publisher → ORG_ID) | 0 | 0 |

Todos los bloques SSR se sirven **antes de la hidratación** (verificado con `curl` puro sin JS).

---

## 7 · Housekeeping

| Chequeo | Resultado |
|---|---|
| `WebPage.isPartOf` → `WEBSITE_ID` | ✅ |
| `primaryImageOfPage.url` absolutizada | ✅ pasa por `absoluteUrl()` |
| Sin regresiones en superficies existentes | ✅ Rutas Region/Destination/Category/Business responden 200 con misma UI |

---

## 8 · Validación

| Chequeo | Resultado |
|---|---|
| Typecheck en archivos PR-2 (`src/lib/discovery/seo.ts` + rutas `oriente-maya/*`) | ✅ limpio |
| Typecheck global | ⚠️ 7 errores **pre-existentes** ajenos a PR-2 (ver §8.1) |
| Build de producción | ✅ |
| Canonical / robots | ✅ sin cambios; canonical self-referencial |
| Datos ficticios | ✅ 0 |
| Entidades huérfanas | ✅ 0 |
| `@id` duplicados | ✅ 0 |

### 8.1 · Nota — typecheck global (no bloqueante)

Los 7 errores viven en `MarketplaceSurface.tsx`, `product-blocks.legacy.tsx`, `favoritos.tsx` y `DiscoveryNavigatorBlock.tsx`: referencias a la ruta legacy `/marketplace/$slug` retirada en olas anteriores (hoy `marketplace.$.tsx`). **PR-2 no las tocó ni las introdujo.** Recomendación: historia de higiene independiente en Carril B para migrar esas 4 referencias.

---

## Veredicto Final

🟢 **GO — PR-2 · Territorial Schema RATIFICADO.**

Se autoriza continuar con **PR-3 · Commercial Schema** bajo las mismas reglas: `@id` estable, URL absoluta, reutilizar `businessEntityId`/`productEntityId`, `provider` = negocio real (nunca ORG_ID), `publisher` sólo donde aplique editorialmente, cero datos inventados, SSR obligatorio.
