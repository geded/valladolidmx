# G8-R1-F1A · Remediación técnica previa al Release Candidate — v1.0

**Estado:** Approved
**Autoridad:** Autorización Founder G8-R1-F1A (2026-08-29).
**Base:** HEAD acreditado del Preflight G8-R1-F0 (`3661dc5c…`).
**Invariantes:** `omxds_visual_v1_contracts_enabled=false`; cero publicación; cero
cambios de contenido, sitemap o redirects; cero renombrado de slugs.

## 1. Alcance autorizado

Remediar exclusivamente los bloqueantes **técnicos** del Preflight F0:

1. Exposición de los secretos de firma de webhooks salientes.
2. Deuda Prettier nueva en la remediación R1-E-R3.
3. Gate `test:q2b` en rojo por instantánea de migraciones obsoleta.
4. Diagnóstico (sin autoridad de configuración externa) de Google Maps.
5. Auditoría **read-only** de colisiones de slug.
6. Matriz fail-closed de pagos y correo.
7. Submanifiesto de Casa de Vacaciones (sin autoasignación de plantilla).

Fuera de alcance: carga editorial (R1-F1B), publicación, Release Candidate.

## 2. Seguridad crítica · Secretos de webhook

**Hallazgo F0.** `public.notification_webhook_endpoints` otorgaba `SELECT` de
tabla completa al rol `authenticated`, y la política
`webhook_endpoints_owner_select` (`owner_user_id = auth.uid()`) permitía al
dueño leer `secret_current` y `secret_previous` desde la Data API.

**Remediación.** Migración mínima, aditiva, reversible e idempotente:

- Nuevo esquema `private`, sin `USAGE` para `anon`/`authenticated`, fuera de la
  Data API expuesta.
- Nueva tabla `private.notification_webhook_secrets` (`endpoint_id` PK con
  `ON DELETE CASCADE`, `secret_current`, `secret_previous`, timestamps), con RLS
  habilitada y privilegios sólo para `service_role`.
- Copia idempotente de valores previos y baja de las columnas
  `secret_current` / `secret_previous` en la tabla pública.
- `public.unc_webhook_secret_set(uuid, text)` — `SECURITY DEFINER`, valida
  propiedad (`owner_user_id = auth.uid()`) o `service_role`, escribe/rota el
  secreto y **nunca lo devuelve**. `EXECUTE` para `authenticated` y
  `service_role`; revocado para `PUBLIC` y `anon`.
- `private.unc_webhook_secret_get(uuid)` — lectura reservada a `service_role`
  para la firma de envíos; revocada para `PUBLIC`, `anon` y `authenticated`.

**Rotación.** La tabla contenía **0 filas** (`total=0`, `with_cur=0`,
`with_prev=0`): no existen secretos reales emitidos, por lo que no se requiere
rotación ni coordinación externa.

**Consumidores.** Único consumidor de código:
`src/lib/notifications/webhooks.functions.ts`. `createWebhookEndpoint` y
`rotateWebhookSecret` generan el secreto server-side y lo persisten vía RPC; lo
devuelven una sola vez al cliente y jamás lo releen. `_authz.ts` sólo lee
`owner_user_id`. Ninguna vista, log, error, tipo cliente ni auditoría copia el
secreto.

**ACL antes / después**

| Rol | Antes | Después |
|---|---|---|
| `anon` | sin política (denegado por RLS) pero con `GRANT` de tabla | sin columnas de secreto en el esquema público |
| `authenticated` (dueño) | **leía `secret_current` y `secret_previous`** | no existe columna legible; sólo puede *escribir* vía RPC |
| `authenticated` (no dueño) | denegado por RLS | denegado por RLS y por la RPC |
| `service_role` | acceso total | acceso total en `private` |

**Rollback.** Reversible: recrear ambas columnas en la tabla pública,
`UPDATE … FROM private.notification_webhook_secrets`, y eliminar tabla,
funciones y esquema privado.

## 3. Lint y gate Q2B

- `prettier --write` aplicado **sólo** a
  `src/lib/alux/memory-projection.functions.ts`,
  `src/lib/alux/memory-summary.ts` y
  `src/lib/notifications/webhooks.functions.ts`. Sin reescritura de generados.
- `scripts/omxds/q2b/places-cms.contract.test.ts`: la aserción congelaba la
  lista de migraciones en `20260828145637_z`, condición que quedó obsoleta por
  evoluciones **gobernadas** posteriores (R1-E-R3 y esta misma remediación). No
  se rebaja ni se elimina el test: se sustituye la instantánea por el invariante
  real que Q2B protege — **`content_audit_log` es la única autoridad de
  auditoría de lugares** —, verificando que ninguna migración cree un almacén
  paralelo (`*place*audit*` / `*poi*audit*`) y conservando
  `expect(FUNCTIONS).not.toContain("place_audit")`. Autoridad:
  `PCA-2026-029-ADDENDUM-X`.

## 4. Google Maps · Diagnóstico

- Clave usada en cliente: `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`
  (Maps JavaScript API), consumida por `src/components/maps/InteractiveMap.tsx`
  y `src/components/maps/LocationPickerMap.tsx`. La clave nunca se imprime.
- Static Maps ya está resuelto server-side por
  `src/routes/api/public/maps/static.ts` vía gateway (no usa browser key).
- Causa de `RefererNotAllowedMapError`: la restricción de HTTP referrer de la
  browser key no incluye los orígenes productivos actuales.
- **Sin autoridad en este entorno** para modificar la consola de Google Cloud.
  Se entrega la lista exacta de referrers requeridos (§ Entrega). Subpaso
  detenido; el resto de F1A continúa.

## 5. Colisiones de slug (read-only, sin cambios)

| Slug | Familias | IDs | Estado | Ruta canónica | Veredicto |
|---|---|---|---|---|---|
| `ek-balam` | destino / lugar | `11111111-…-000000000002` / `6c22aa5f-…` | published / draft | `/oriente-maya/ek-balam` vs `/p/ek-balam` | Colisión **legítima entre familias**: espacios de nombres distintos, el resolutor canónico no se rompe |
| `chichen-itza` | destino / lugar | `ec9eb324-…` / `3842b6cb-…` | draft / draft | `/oriente-maya/chichen-itza` vs `/p/chichen-itza` | Legítima; ambos en borrador, sin URL indexada |
| `cenote-suytun` | lugar / empresa | `b5c4be83-…` / `33e4c2c7-…` | published / published | `/p/cenote-suytun` vs ruta de empresa bajo destino/categoría | Legítima; **decisión editorial pendiente** sobre cuál es la entidad autoritativa de cara al viajero |

Sin renombrar, archivar, borrar ni redirigir. No se crea restricción transversal
artificial de unicidad de slug entre familias. Rollback: no aplica (cero
escrituras). SEO: 0 redirects existentes; ninguna URL pública cambia.

## 6. Matriz de integraciones (fail-closed)

| Integración | Estado | Secret requerido | Comportamiento actual |
|---|---|---|---|
| Cobro en línea (Stripe) | **Requiere credencial** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Sin credencial no se ejecuta cobro; el checkout debe fallar de forma explicable, nunca simular pago |
| Correo transaccional (Resend) | **Requiere credencial** | `RESEND_API_KEY` | Sin credencial no se finge envío exitoso |
| Google Maps (interactivo) | **Requiere decisión/config Founder** | referrers en Google Cloud | Mapa no carga en dominios no autorizados |
| Google Maps (estático) | Funcional | `GOOGLE_MAPS_API_KEY`, `LOVABLE_API_KEY` | Proxy server-side operativo |
| Alux / AI Gateway | Funcional | `LOVABLE_API_KEY` | Operativo |
| WhatsApp / contacto directo | Funcional cuando el dato existe | — | Depende de contenido por empresa |
| Cobro en línea alternativo | **Requiere decisión Founder** | — | Sin decisión |

Los Secrets se configuran en el panel de Cloud del proyecto. **No** deben
pegarse en el chat, en el código, en documentación, en el DOM ni en logs.

## 7. Casa de vacaciones (submanifiesto, sin autoasignación)

`premium-entity-vacation-rental` permanece **PENDIENTE FOUNDER** y fail-closed;
no bloquea a las demás familias. Pendientes de decisión antes de asignar:

1. Autoridad visual: ¿hereda de `premium-entity-hotel` por variante o requiere
   variante propia declarada?
2. Conexión CMS: campos diferenciales (capacidad, estancia mínima, reglas de
   casa, política de cancelación) no modelados hoy.
3. Medios: requisito mínimo de portada + galería por unidad.
4. Ruta canónica dentro del modelo `/oriente-maya/:destino/:categoria/:empresa`.
5. Diferencias frente a hotel en CTA de disponibilidad.
6. JSON-LD: `LodgingBusiness` vs `VacationRental`.

## 8. Veredicto

**R1-F1A CERRADA en su alcance técnico ejecutable**, con un subpaso detenido por
falta de autoridad externa: la configuración de HTTP referrers de Google Maps
corresponde al Founder. Se mantiene STOP CONDITION: no se inicia R1-F1B ni el
Release Candidate.
