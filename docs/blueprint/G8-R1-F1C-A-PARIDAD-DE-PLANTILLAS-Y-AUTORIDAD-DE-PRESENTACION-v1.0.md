# G8-R1-F1C-A · Paridad productiva de plantillas y autoridad de presentación — Blueprint v1.0

Alcance corregido por Autorización Founder: **presentación y plantillas**. Excluido:
checkout, pagos, órdenes, reembolsos, publicación, activación del flag
`omxds_visual_v1_contracts_enabled`, sitemap y redirects.

## 1. Decisión de arquitectura

Una **autoridad única de presentación**, transversal a las nueve familias de ficha
individual, con dos modos de una misma ficha:

| Modo | Naturaleza | Requisito |
| --- | --- | --- |
| Editorial | Lectura, contenido práctico, jerarquía de texto | Ninguno. Es el modo seguro y el fallback universal |
| Cinematográfica | Portada inmersiva a viewport completo, identidad sobre la imagen | Portada gobernada aprobada G8-M1 vigente |

No son dos plantillas ni dos superficies: son dos **modos de la misma ficha**, con
la misma URL canónica, el mismo contenido y el mismo H1.

## 2. Persistencia, versión y auditoría

- `public.entity_presentation_modes` — fila única por `(entity_kind, entity_id)` con
  `requested_mode`, `approved_mode`, `review_state`, `cover_media_asset_id`.
- `public.entity_presentation_mode_history` — bitácora inmutable de cada transición
  (`request`, `set`, `approve`, `reject`, `fallback`) con actor, modos origen/destino,
  portada de referencia, motivo y marca temporal. Permite reversión informada.
- RPC `set_entity_presentation_mode` — el equipo de la empresa **solicita**; el staff
  **fija**. Fail-closed: sin portada elegible, Cinematográfica no se aprueba.
- RPC `review_entity_presentation_mode` — aprobación o devolución por staff.
- RPC `get_entity_presentation_mode` — modo vigente con verificación de portada en
  tiempo real y precedencia sobre `points_of_interest.metadata.presentation_mode`.
- Toda transición escribe además en `content_audit_log`.

Precedencia de lectura: `entity_presentation_modes` → metadata histórica de Lugar →
Editorial por defecto. El contrato histórico se conserva sin reinterpretarse.

## 3. Fail-closed de portada (G8-M1)

`evaluateGovernedCover` exige, de forma acumulativa: pertenencia a la entidad,
`review_state=approved`, pipeline completo, derechos declarados, crédito, ALT humano
(no IA), checksum, ausencia de URL firmada temporal, ausencia de medio demo, mínimo
1600×900 px y relación de aspecto ≥ 1.2.

Si la portada deja de ser elegible en cualquier momento, la superficie **cae a
Editorial de inmediato** y el modo solicitado se conserva para una futura
reaprobación, sin pérdida de intención del operador.

## 4. Diferencia real de DOM

| | Editorial | Cinematográfica |
| --- | --- | --- |
| Orden de nodos | identidad → esenciales → portada → narrativa → prácticos → galería → mapa → relacionados → acciones | portada → identidad → narrativa → galería → esenciales → mapa → prácticos → relacionados → acciones |
| Densidad | `comfortable` | `immersive` |
| Portada | proporción contenida | altura de viewport |
| Identidad | bloque propio | superpuesta a la portada |
| H1 | uno | uno |

`layoutsDifferMaterially()` verifica en el gate que la diferencia no sea sólo de clases.
`renderableSlots()` omite todo slot sin información real: nunca hay huecos ni contenido
inventado.

## 5. Alcance del selector

Expuesto sólo en las nueve familias de ficha individual: hotel, restaurante, casa de
vacaciones, empresa turística genérica, evento, experiencia, tour, producto genérico y
lugar.

No expuesto en Home premium, Destino premium, Listados premium ni Landing SEO. La
Landing SEO queda **forzada a Editorial** por contrato.

## 6. Facultades por rol

| Rol | Elegir Editorial | Solicitar Cinematográfica | Aprobar / devolver | Cambiar familia | Publicar |
| --- | --- | --- | --- | --- | --- |
| Owner / Manager / Editor de la empresa (sobre entidades propias) | Sí | Sí (queda `pending`) | No | No | No |
| Editor / Admin / Super Admin | Sí | Sí (fija directamente) | Sí | No | No |
| Viajero / anónimo | No | No | No | No | No |

Ningún rol cambia la familia de la ficha desde este control, y ningún cambio de
presentación publica ni altera el estado de contenido.

## 7. Asignación automática de familia

Orden obligatorio, sin excepciones:

```
override editorial aprobado y compatible → preset canónico de familia → superficie estándar (fail-closed)
```

`resolvePresentationFamily` extiende el resolutor canónico acreditado con
`vacation_rental`, `business_generic` y `product_generic`. Una categoría o
`product_type` desconocido **no** se enmascara con la familia genérica: resuelve a
superficie estándar con diagnóstico de desarrollo.

## 8. Elegibilidad premium equivalente

`evaluatePremiumEligibility` aplica el mismo estándar a empresa, producto, evento y
lugar: estado editorial acreditado, clasificación canónica, ruta canónica, contenido
real sin demo, portada gobernada, galería mínima (3 / 3 / 1 / 3), ubicación cuando la
familia la exige, relaciones obligatorias y bitácora editorial.

Publicación, elegibilidad premium y modo de presentación son decisiones **separadas**:
el resultado declara explícitamente `publishes: false` y `activatesFlag: false`.

## 9. Copy oficial

"Presentación" · "Editorial — Lectura clara y contenido práctico" · "Cinematográfica —
Portada inmersiva; requiere fotografía aprobada". Sin nombres de presets, slugs,
identificadores ni jerga de contratos. Verificado por gate.

## 10. Gate

`bun run validate:r1:f1c:a` — 46 escenarios de contrato + gates B4/S1 + lint +
typecheck + Route Inventory + gobernanza.
