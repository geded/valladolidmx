# SEO.A1.1 · PR-1 · Foundation Schema — Completion Report v1.0

Alcance autorizado: Organization, WebSite, BreadcrumbList unificado.
SearchAction condicionado a búsqueda pública/indexable/estable/sin auth.

## 1. Cambios de código

| Archivo | Cambio |
| --- | --- |
| `src/lib/discovery/seo.ts` | + `ORG_ID`, `WEBSITE_ID`, `LOGO_ID`; + `organizationJsonLd()`, `websiteJsonLd()`; `breadcrumbListJsonLd` ahora emite `@id` estable por página (`{url}#breadcrumb`). |
| `src/routes/__root.tsx` | Reemplaza JSON-LD inline por helpers. WebSite ya NO emite `potentialAction/SearchAction`. `publisher` referencia Organization por `@id`. |
| `src/routes/mapa.tsx` | `noindex: true` (Founder Decision: sin contenido editorial independiente). |
| `src/routes/viajero.$handle.tsx` | `noindex: true` (Founder Decision: superficies personales fuera del índice). |

Fuente única preservada: toda la implementación pasa por `src/lib/discovery/seo.ts`. Cero duplicación.

## 2. SearchAction — Postponed

No existe superficie pública indexable en `/buscar`. Registrada como
postponed en `seo.ts` (comentario junto a `ORG_ID`/`WEBSITE_ID`).
Se reintroducirá cuando la búsqueda cumpla los 4 criterios Founder.

## 3. Rutas afectadas

- Global (todas las rutas): WebSite + Organization con `@id` estable.
- `/` — indexable, canonical self.
- `/blog` — indexable, canonical self, CollectionPage intacto.
- `/mapa` — `noindex, nofollow`.
- `/viajero/:handle` — `noindex, nofollow`.

## 4. Evidencia SSR (curl → localhost:8080)

- `/`  → robots="index, follow…"; WebSite@id + Organization@id emitidos.
- `/blog`  → robots="index, follow…"; canonical=/blog; CollectionPage presente.
- `/mapa`  → robots="noindex, nofollow"; canonical self.
- `/viajero/mati`  → robots="noindex, nofollow"; canonical self.

Cero JSON-LD con SearchAction. `publisher` reconciliado por `@id`.

## 5. Rich Results Validation

- Organization: name, url, logo (ImageObject), address, areaServed — válido.
- WebSite: url, name, publisher(@id) — válido; sin SearchAction (postponed).
- BreadcrumbList emite `@id` único por página cuando la ruta lo declara.

Recomendado revalidar con Google Rich Results Test tras publicar preview.

## 6. Outcome Validation

- Typecheck limpio (`bunx tsgo --noEmit`).
- SSR emite Organization+WebSite en toda ruta pública.
- SearchAction removido (evita señal rota).
- `/mapa` y `/viajero` fuera del índice.
- `/blog` conserva indexabilidad e infraestructura existente.
- Sin duplicación de metadata; contrato único.

## 7. Veredicto

GO para PR-2 · Territorial Schema (TouristDestination, TouristAttraction,
LocalBusiness, Hotel, Restaurant) reutilizando `ORG_ID` como
`publisher`/`brand`.
