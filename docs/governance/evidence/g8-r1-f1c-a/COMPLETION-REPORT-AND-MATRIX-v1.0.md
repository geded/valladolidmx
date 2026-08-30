# G8-R1-F1C-A · Completion Report y matriz por familia y rol (v1.0)

Autoridad: `PCA-2026-055`. Blueprint:
`docs/blueprint/G8-R1-F1C-A-PARIDAD-DE-PLANTILLAS-Y-AUTORIDAD-DE-PRESENTACION-v1.0.md`.
Flag: `omxds_visual_v1_contracts_enabled=false`. Cero publicación, cero checkout,
cero pagos, cero sitemap, cero redirects.

## 1. Entregado

| Capa | Artefacto |
| --- | --- |
| Datos | `entity_presentation_modes`, `entity_presentation_mode_history` (migración aditiva, RLS + GRANT) |
| Autoridad | RPC `set_entity_presentation_mode`, `review_entity_presentation_mode`, `get_entity_presentation_mode` |
| Contrato puro | `src/lib/omxds/presentation/entity-presentation.ts` |
| Elegibilidad | `src/lib/omxds/presentation/premium-eligibility.ts` |
| Familia | `src/lib/omxds/presentation/presentation-family.ts` |
| Acceso | `src/lib/omxds/presentation/entity-presentation.functions.ts` |
| UI | `PremiumPresentationControl.tsx` (copy oficial), `PresentationModePanel.tsx` (Portal + CMS) |
| Gate | `scripts/omxds/r1-f1c-a/presentation-authority.contract.test.ts` · `bun run validate:r1:f1c:a` |

## 2. Matriz por familia

| Familia | Asignación automática | Selector de presentación | Persistencia y historial | Cinematográfica |
| --- | --- | --- | --- | --- |
| Hotel | preset canónico por categoría | Sí | `entity_presentation_modes` (business) | con portada aprobada |
| Restaurante | preset canónico por categoría | Sí | `entity_presentation_modes` (business) | con portada aprobada |
| Casa de vacaciones | preset propio, sin autoasignación silenciosa | Sí | `entity_presentation_modes` (business) | con portada aprobada |
| Empresa turística genérica | familia propia por categoría acreditada | Sí | `entity_presentation_modes` (business) | con portada aprobada |
| Evento | preset canónico | Sí | `entity_presentation_modes` (event) | con portada aprobada |
| Experiencia | preset canónico por `product_type` | Sí | `entity_presentation_modes` (product) | con portada aprobada |
| Tour | preset canónico por `product_type` | Sí | `entity_presentation_modes` (product) | con portada aprobada |
| Producto genérico | familia propia declarada | Sí | `entity_presentation_modes` (product) | con portada aprobada |
| Lugar y atractivo | contrato acreditado `premium-entity-place` | Sí | `entity_presentation_modes` con precedencia sobre metadata histórica | con portada aprobada |
| Home / Destino / Listados / Landing SEO | composición canónica | **No** (Landing SEO forzada a Editorial) | n/a | n/a |

Clasificación desconocida → superficie estándar fail-closed, nunca familia genérica.

## 3. Matriz por rol

| Capacidad | Owner / Manager / Editor de empresa (entidad propia) | Editor / Admin / Super Admin | Viajero / anónimo |
| --- | --- | --- | --- |
| Ver el modo vigente de su ficha | Sí | Sí | No |
| Elegir Editorial | Sí | Sí | No |
| Solicitar Cinematográfica | Sí (queda `pending`) | Sí (fija directamente) | No |
| Aprobar o devolver una solicitud | No | Sí | No |
| Ver historial de presentación | Sí (propio) | Sí (completo) | No |
| Cambiar familia o plantilla | No | No (no desde este control) | No |
| Publicar la ficha | No | No | No |

## 4. Comportamiento fail-closed verificado

1. Sin portada gobernada aprobada, Cinematográfica no se aprueba y el control la muestra bloqueada con explicación.
2. Si la portada pierde elegibilidad (derechos, ALT humano, checksum, resolución, pipeline, medio demo), la ficha cae a Editorial de inmediato y conserva la intención del operador.
3. Una solicitud `pending` jamás renderiza Cinematográfica.
4. La entidad sin fila de autoridad lee la metadata histórica de Lugar; sin ella, Editorial.
5. Elegibilidad premium cumplida **no** publica ni activa el flag (`publishes:false`, `activatesFlag:false`).

## 5. Diferencia real entre modos

Verificada por contrato: orden de nodos distinto, densidad distinta, portada a viewport
completo e identidad superpuesta sólo en Cinematográfica, un único H1 en ambos modos y
omisión de todo slot sin información acreditada.

## 6. Gates

`bun run validate:r1:f1c:a` → **PASS**

- Contrato G8-R1-F1C-A: 46 escenarios PASS
- Contrato B4: 20 escenarios PASS · Contrato S1: 38 escenarios PASS
- `lint` PASS (sin deuda nueva) · `typecheck` PASS
- Route Inventory: cobertura PASS
- Gobernanza: `governance:check` PASS (Master Index v0.81, `PCA-2026-055`, addenda AA/AB)

## 7. Exclusiones respetadas

Checkout, pagos, órdenes, reembolsos, publicación, activación del flag, sitemap,
redirects, PR, merge y despliegue: **no ejecutados**.
