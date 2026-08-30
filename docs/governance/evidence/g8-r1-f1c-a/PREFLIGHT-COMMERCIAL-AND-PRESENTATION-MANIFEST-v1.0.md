# G8-R1-F1C-A · Preflight instrument-first — Manifiesto exacto (v1.0)

Estado: READ-ONLY. Cero migraciones aplicadas, cero rutas conectadas, cero publicación,
`omxds_visual_v1_contracts_enabled=false`, sitemap y redirects intactos.

## 1. Autoridad existente — matriz campo → significado → consumidor → brecha

### 1.1 Presentación (Editorial / Cinematográfica)

| Autoridad actual | Significado | Consumidor | Brecha frente a la decisión Founder |
| --- | --- | --- | --- |
| `points_of_interest.metadata.presentation_mode` | modo persistido del lugar | `place-public-reads.server.ts`, `PlacePremiumSurface`, `PlaceEditor` | sólo existe para **lugar**; no hay equivalente para hotel, restaurante, casa de vacaciones, empresa genérica, evento, experiencia, tour ni producto |
| RPC `admin_set_place_presentation_mode` | autorización + fail-closed de portada aprobada | `place-presentation.functions.ts` | válida sólo para lugares; exige `is_editor_or_admin` o `poi.write` → **empresa owner/manager/editor no puede solicitar modo** |
| `PremiumPresentationControl.tsx` | selector UI | CMS lugares | etiqueta y ayuda no cumplen el copy obligatorio "Presentación / Editorial / Cinematográfica (requiere fotografía aprobada)" |
| `place-premium-config.ts` `defaultPresentation` | default por categoría | render | sin default equivalente por familia de empresa/producto/evento |
| — | historial y auditoría del cambio de modo | — | **inexistente**: hoy sólo `updated_by`; no hay versión, actor, motivo ni caída automática registrada |
| `content_audit_log` | bitácora editorial genérica | gates B4 | reutilizable como destino de auditoría del modo (no requiere tabla nueva) |

Conclusión: la autoridad de presentación existe pero está **acoplada a lugares** y sin historial.

### 1.2 Comercial (producto)

| Campo actual (`public.products`) | Significado real hoy | Consumidor | Brecha |
| --- | --- | --- | --- |
| `conversion_mode` (`product_conversion_mode`: informacion, arma_tu_viaje, solicitar_cotizacion, reservar_en_linea, whatsapp, telefono, sitio_externo) | estrategia de CTA de la ficha | `ProductActions.tsx`, portal, marketplace | **es la autoridad más cercana** a los 4 modos comerciales pedidos, pero mezcla canal (whatsapp/telefono/sitio_externo) con intención comercial |
| `accepts_online_payment` (bool) | habilita "Añadir al carrito" | `ProductActions.tsx` | booleano ambiguo; no distingue *solicitado* vs *aprobado* |
| `direct_sale_enabled` + `direct_sale_price_amount` / `_currency` / `_commission_bps` / `_cancellation_policy` / `_terms` / `_min_lead_hours` / `_max_quantity` | contrato CV4.1 de venta directa, validado por trigger `_cv41_validate_direct_sale` | `ventas-en-linea` (portal y CMS), `direct-sales-orders`, comisiones | **ya cubre** precio, moneda, política de cancelación, términos, capacidad máxima y lead time → se reutiliza, no se duplica |
| `requires_availability` (bool) | requiere disponibilidad | portal | no hay inventario ni fuente de disponibilidad |
| `price_amount` / `price_currency` | precio informativo | fichas | duplica `direct_sale_price_amount`; ambigüedad a documentar, no a resolver en esta ola |
| `visibility_level`, `generates_commission` | plan comercial | listados | sin relación con elegibilidad de reserva |
| — | canal externo oficial acreditado (`external_booking`) | — | **inexistente**: hoy `sitio_externo` no guarda URL acreditada |
| — | estado de aprobación de venta en línea (solicitada / aprobada / rechazada por Founder-Admin) | — | **inexistente** |
| — | impuestos | — | **inexistente** |
| — | binding estable para la futura central de Reservaciones | — | **inexistente** |

Autoridad de aprobación de operador: `businesses.status` + `source_review_state` (B4) — reutilizable, sin campos nuevos.

## 2. Modo comercial derivado (sin booleano nuevo ambiguo)

Se propone una **función derivada determinista y fail-closed**, no un campo libre:

```
online_sale      ⇐ direct_sale_enabled AND commerce_sale_state='approved'
                    AND operador aprobado AND precio/moneda/impuestos/política/términos
                    AND proveedor de pagos y webhook operativos AND motor Reservaciones activo
request_booking  ⇐ conversion_mode ∈ {solicitar_cotizacion, reservar_en_linea} sin acreditación completa
external_booking ⇐ conversion_mode='sitio_externo' AND external_booking_url acreditada
plan_only        ⇐ resto (default fail-closed)
```

Mientras Reservaciones no exista, `online_sale` **degrada automáticamente** a `request_booking` (o `plan_only`) y jamás se muestra "Reservar ahora". "Guardar" y "Agregar a Mi Viaje" permanecen siempre y son acciones distintas.

## 3. Migración mínima aditiva propuesta (NO aplicada)

Reversible e idempotente. Nada destructivo, ningún renombre, ningún dato modificado.

1. `public.products`: `commerce_sale_state text NOT NULL DEFAULT 'not_requested'` (`not_requested|requested|approved|rejected`), `commerce_tax_mode text`, `commerce_tax_rate_bps integer`, `external_booking_url text`, `commerce_reviewed_by uuid`, `commerce_reviewed_at timestamptz`.
2. Tabla `public.entity_presentation_modes` (entity_kind, entity_id, mode, requested_mode, effective_mode, actor, reason, created_at) + índice único por entidad — persistencia, versión e historial del modo para **todas** las familias, con lugar migrado por lectura (sin borrar `metadata.presentation_mode`).
3. RPC genérica `set_entity_presentation_mode(entity_kind, entity_id, mode)`: owner/manager/editor **solicita**; staff **aprueba**; `cinematic` fail-closed sin portada aprobada G8-M1; escribe historial y `content_audit_log`.
4. RPC `admin_review_product_commerce(product_id, decision)` para Founder/Admin.
5. GRANT explícitos (`authenticated`, `service_role`) + RLS por propiedad de negocio y rol staff.

Sin esta migración no es posible cumplir "persistir, versionar y auditar" ni la aprobación de venta en línea. **Me detengo aquí antes de aplicarla.**

## 4. Manifiesto exacto de la ola (al aprobarse)

- Blueprint + PCA con permisos exactos de archivos y la migración anterior.
- Persistencia/autorización/historial/fallback del modo en las 9 familias productivas.
- Selector "Presentación" con copy comprensible, en Portal (solicitar) y CMS (aprobar/devolver).
- Elegibilidad premium equivalente para empresa, producto, evento y lugar.
- Derivación del modo comercial + filtros de Administración (5 estados) + binding estable de Reservaciones (sólo contrato).
- Copy de Alux por estado, sin inventar precio, cupo ni confirmación.
- Evidencia: matriz por familia y rol, persistencia tras recarga, cadena Editorial→Cinematográfica→pérdida de portada→Editorial, historial, 5 estados comerciales, cero CTA de pago, QA 390/430/768/1024/1280/1440, lint/typecheck/build/contratos/RLS/Route Inventory/gobernanza.

Excluido explícitamente: Reservaciones, carrito, checkout, pagos, órdenes, reembolsos, correo transaccional, publicación, activación del flag, sitemap y redirects.

## 5. STOP

Preflight cerrado. Se requiere aprobación Founder de la migración aditiva y del manifiesto antes de escribir código.
