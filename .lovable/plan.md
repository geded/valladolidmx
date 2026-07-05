
# E6 · Related Collection

**Programa:** Discovery Layer · **Carril A** (Producto) · **Versión:** v2.5
**Dependencias cerradas:** E5 (Traveler Public Profile), N-Blueprint v1.0, H-03 Block Rules
**Preparación E7:** contrato `RelatedCollectionProvider` + tabla `related_overrides` (ver conversación previa)

---

## 1. Alcance v1

**Superficies (4):** Empresa · Producto/Experiencia · Destino · Evento.
**Estrategia:** Reglas automáticas + overrides manuales (pin/hide).
**Fallback vacío:** Populares del destino activo. Si aún <3 items → oculta el bloque.
**Render:** Bloque oficial EB `vmx.discovery.related-collection` (H-03, L4, evolutivo a L6).

## 2. Contrato del Provider (preparado para E7)

Firma única que E6 implementa y E7 podrá reemplazar sin refactorizar el bloque:

```ts
getRelatedCollection({
  entityType: 'business' | 'product' | 'destination' | 'event',
  entityId: string,
  surface: string,           // 'business-profile' | ...
  context?: {                // activado desde v1, opcional
    activeDestinationId?: string,
    localeId?: string,
    season?: string,
  },
  limit?: number,            // default 8
}) → {
  items: RelatedItem[],
  strategy: 'same-category' | 'same-destination' | 'same-region'
          | 'tags-match' | 'popular-destination' | 'manual-pin',
  rationale?: string,        // explicable por defecto
}
```

`RelatedItem` = `{ id, entityType, title, subtitle, image, href, badges[], score }`.
`href` se resuelve vía `@/lib/navigation` (contrato N-Blueprint) — nunca hardcodeado.

## 3. Reglas automáticas por entidad

| Entidad | Regla primaria | Secundaria | Terciaria (fallback) |
|---|---|---|---|
| Empresa | `same_category + same_destination` | `same_category + same_region` | `popular-destination` |
| Producto/Experiencia | `same_category + same_destination + tags` | `same_category + same_region` | `popular-destination` |
| Destino | `same_region` (tourism_region) | `neighbor destinations` | `popular globales del tipo` |
| Evento | `same_destination + fechas ±30d` | `same_destination` | `popular-destination` |

Excluye el propio `entityId`, ítems `hidden` en overrides, y items no publicados.
`limit` por defecto 8, mínimo para render 3.

## 4. Backend (una migración)

Tabla `related_overrides` (fuente única):

- `id`, `entity_type`, `entity_id`, `surface`
- `related_entity_type`, `related_entity_id`
- `mode` enum `pin | hide`
- `position` int null (orden para pins)
- `note` text null (rationale editorial)
- `created_by` (auth.uid), `created_at`, `updated_at`
- Índice compuesto `(entity_type, entity_id, surface)`
- Unicidad `(entity_type, entity_id, surface, related_entity_type, related_entity_id)`

GRANTs + RLS:
- `SELECT` a `anon` y `authenticated` (los pins son públicos; se renderizan en superficies públicas).
- `INSERT/UPDATE/DELETE` sólo a admin/super_admin/editor vía `has_role`.
- `service_role`: ALL.

RPC `related_get_collection(p_entity_type, p_entity_id, p_surface, p_context jsonb, p_limit)` — SECURITY DEFINER, devuelve JSON con `items`, `strategy`, `rationale`. Implementa reglas + overrides + fallback populares.

## 5. Server functions (client-safe, en `src/lib/related/`)

- `related.functions.ts` → `getRelatedCollection` (público, publishable key server client — llama RPC).
- `related-admin.functions.ts` → `listOverrides`, `upsertOverride`, `deleteOverride` (`requireSupabaseAuth` + role check).

## 6. Bloque oficial EB — `vmx.discovery.related-collection`

Ubicación: `src/components/eb/blocks/discovery/RelatedCollection/`
- `RelatedCollection.block.tsx` (presentación)
- `RelatedCollection.contract.ts` (Zod, `contractVersion: "1.0.0"`)
- `RelatedCollection.config.tsx` (panel de configuración: título, límite, variante, filtros)
- `RelatedCollection.registry.ts` (registro en Library, L4, categoría Discovery)

Contrato (3 capas H-03):
- **Presentación:** variante (`grid` | `carousel` | `list`), densidad, cards del Cards Registry.
- **Contenido:** título, subtítulo, empty-state message, cta opcional.
- **Comportamiento:** `entityBinding` (auto desde surface), `limit`, `strategyHint` (opcional), `showRationale` (bool).

DoR H-03 (6 preguntas en verde) documentado en el bloque.
Ficha de madurez L4 (preparado L5 = admin overrides UI, L6 = recomendación IA vía E7).

## 7. Integración en superficies

Añadir el bloque al preset EB por defecto de las 4 plantillas:
- `business-profile` → después de "Reviews", antes de footer.
- `product-detail` → después de "Detalles", antes de "Reviews".
- `destination-detail` → después de "Puntos de interés".
- `event-detail` → después de "Info del evento".

Sin código específico en las superficies: sólo el bloque en el preset. Consistencia H-03.

## 8. Workspace mini-UI · Overrides

Nueva pestaña "Relacionados" en el Inspector de cada ficha (Workspace Engine, sin nuevos engines):
- Lista los items sugeridos automáticamente (preview).
- Acciones por item: **Pin arriba** · **Ocultar** · **Nota editorial**.
- Búsqueda para pinear items ajenos a las reglas.
- Máx 6 pins por surface.

Consume `listOverrides` + `upsertOverride`/`deleteOverride`.

## 9. Cards Registry

Reutiliza cards existentes (`business-card`, `product-card`, `destination-card`, `event-card`) del Cards Registry — no crea nuevas variantes.

## 10. SEO / Performance

- SSR del bloque en fichas públicas (loader → `getRelatedCollection` vía TanStack Query).
- `loading="lazy"` en imágenes de cards.
- No añade og:image (ya definido por la ficha).
- Prefetch on hover vía TanStack Link `preload`.

## 11. Demo Pack (obligatorio)

Seeds en migración: mínimo 6 items relacionables por cada uno de 4 entidades demo (1 por tipo), 2 pins + 1 hide como ejemplo editorial.
URLs exactas, credenciales editor, pasos de reproducción, marca temporal.

## 12. DoD

- Typecheck + Build + Smoke.
- Bloque en Library visible y arrastrable.
- Bloque renderiza en las 4 fichas demo con datos reales.
- Overrides funcionales (pin/hide/nota).
- Fallback populares verificado (vaciando overrides).
- Comparativa visual antes/después de las 4 fichas.
- Completion Report `16.20-E6-COMPLETION-REPORT-v1.0.md` con matriz de reutilización + ficha de madurez L4 + preparación E7 documentada.
- Product Changelog actualizado (Roadmap v2.0).

## 13. Fuera de alcance (queda para E7)

Reglas configurables por admin · priorización/scoring · campañas · señales de traveler · integración Alux · A/B testing · panel de recomendaciones. E6 deja los ganchos: contrato, tabla overrides, campo `context`, `strategy`, `rationale`.

---

**Ejecución sugerida en 3 pasos revisables:**
1. Migración (`related_overrides` + RPC + seeds demo).
2. Server fns + bloque EB + integración en presets.
3. Workspace mini-UI overrides + Completion Report + Demo Pack.

¿Apruebas el plan y arranco por el paso 1 (migración)?
