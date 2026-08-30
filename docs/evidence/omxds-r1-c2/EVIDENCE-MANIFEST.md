# G8-R1-C2 · Conexión de entidades reales al resolutor canónico — Evidencia

- Autorización: `PCA-2026-051` (Founder, 2026-08-29).
- Blueprint: `docs/blueprint/19.46-G8-R1-C-L-RESOLVER-AND-SEO-LANDING-v1.0.md`.
- Rama: `edit/edt-c7198000-478b-43e1-90b7-919fb8422f7a`.
- Gate: `bun run validate:r1:c2`.

## 1 · Matriz ruta real → entidad → resolutor → preset → superficie

| Ruta real del router                            | Entidad  | Familia canónica  | Preset                        | Superficie             |
| ----------------------------------------------- | -------- | ----------------- | ----------------------------- | ---------------------- |
| `/oriente-maya/{destino}/{categoria}/{empresa}`  | business | `hotel`           | `premium-entity-hotel`        | `BusinessSurface` premium |
| `/oriente-maya/{destino}/{categoria}/{empresa}`  | business | `restaurant`      | `premium-entity-restaurant`   | `BusinessSurface` premium |
| `/oriente-maya/{destino}/{categoria}/{empresa}`  | business | `vacation_rental` | — (no autoasignable)          | Estándar fail-closed   |
| `/producto/{slug}`                               | product  | `experience`      | `premium-entity-experience`   | `ProductSurface` premium |
| `/producto/{slug}`                               | product  | `tour`            | `premium-entity-tour`         | `ProductSurface` premium |
| `/producto/{slug}`                               | product  | `product_generic` | —                             | Estándar fail-closed   |
| `/eventos/{slug}`                                | event    | `event`           | `premium-entity-event`        | `EventSurface` premium |
| `/oriente-maya/{destino}/lugares/{lugar}`        | place    | `place`           | `premium-entity-place`        | `PlacePremiumSurface` (6 variantes) |

Orden de resolución aplicado en las cuatro rutas, sin excepciones:
**override editorial aprobado → preset premium de familia → superficie estándar fail-closed.**

## 2 · Datos reales del CMS por familia

| Familia               | Lectura productiva                                  | Datos consumidos |
| --------------------- | --------------------------------------------------- | ---------------- |
| hotel / restaurante / casa de vacaciones | `getMarketplaceBusinessBySlug` + `getBusinessPremiumEligibility` + `getBusinessRelated` | textos, portada, galería, ubicación, horarios, contacto, tarifas, productos y relaciones |
| experiencia / tour / producto genérico | `getMarketplaceProductBySlug` | textos, portada, precio, disponibilidad, reseñas, empresa oferente |
| evento                | `getEventBySlug`                                     | título, resumen, fechas, sede, organizador acreditado, portada |
| lugar y atractivo     | `getPublicPlace` / `getPlacePreview` + `adaptPlaceToPremiumSurface` | textos, tipo, destino/zona, medios gobernados, ubicación |

No se añadió ninguna fuente de datos nueva: C2 sólo unifica la **decisión de
presentación**. Cero fixtures, cero imágenes de stock, cero textos de demostración.

## 3 · Medios G8-M1, fallback y secciones omitidas

- Portada, galería, ALT y crédito siguen resolviéndose por el pipeline gobernado
  (`resolveMediaSource` / `stableIndexableImageUrl`); C2 no construye URLs.
- `hasRealValue`, `keepSectionsWithRealData` y `omittedSectionIds`
  (`canonical-entity-binding.ts`) omiten toda sección sin datos reales, sin dejar
  hueco visual ni sustituto demostrativo.
- Fallback: cualquier ambigüedad (categoría/tipo desconocido, entidad no elegible,
  override incompatible, preset pendiente de aceptación Founder) resuelve a
  superficie estándar.

## 4 · Delegación y fail-closed

- `place` delega íntegramente en `premium-entity-place`: variantes, diseño y
  reglas de medios no se redefinen aquí.
- `vacation_rental` permanece en el resolutor técnico con `autoAssign=false`:
  nunca se asigna productivamente hasta aceptación visual Founder independiente.
- `premium-seo-landing` conserva Editorial como única presentación acreditada
  (Cinematográfica fail-closed, normalizada por contrato).

## 5 · Invariantes confirmadas

- Cero publicación de entidades o landings.
- Cero migraciones, cero redirects, cero cambios de sitemap.
- `omxds_visual_v1_contracts_enabled` permanece `false`.
- Cuatro landings legacy intactas; sin rutas públicas nuevas.
- Sin botón “Crear Landing SEO”, sin composiciones SEO reales, CL3 no iniciado.
- Sin PR, merge ni despliegue.

## 6 · Gates

| Gate                  | Resultado |
| --------------------- | --------- |
| `bun run lint`        | PASS |
| `bun run typecheck`   | PASS |
| `bun run build`       | PASS |
| `bun run validate:r1:a`  | PASS |
| `bun run validate:r1:cl` | PASS |
| `bun run validate:r1:c2` | PASS (15 contratos) |
