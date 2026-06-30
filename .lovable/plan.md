# 14.40.5 — Etapa 5 · Pagos (Stripe + Payment Provider Abstraction)

## Objetivo

Habilitar el cobro en línea de órdenes confirmadas (productos con
`conversion_mode = 'reservar_en_linea'` y `accepts_online_payment = true`)
usando Stripe como primer proveedor, detrás de una capa de abstracción
(`PaymentProvider`) que permita incorporar Paddle, Mercado Pago o PayPal
sin tocar la lógica del Marketplace.

## Principios (no negociables)

- Cero `SUPABASE_SERVICE_ROLE_KEY` en flujos del viajero.
- `supabaseAdmin` sólo dentro del webhook tras verificar la firma HMAC.
- Revalidación server-side de elegibilidad y precios antes de crear el
  PaymentIntent (mismos checks que `order_confirm`).
- Idempotencia por `client_request_id` (cliente → server fn) y por
  `event_id` (webhook → `payment_events`).
- Metadata consistente: `order_id`, `user_id`, `client_request_id`,
  `provider` y `provider_intent_id` en ambos lados.
- Auditoría completa en `order_events` (`payment_initiated`,
  `payment_succeeded`, `payment_failed`, `payment_refunded`).
- Sin acoplamiento directo del UI/dominio a Stripe: todo pasa por el
  contrato `PaymentProvider`.

## Arquitectura — Payment Provider Abstraction

```text
src/lib/payments/
├── provider.ts                 # contrato PaymentProvider + tipos neutrales
├── registry.server.ts          # selección por env PAYMENTS_PROVIDER
├── stripe.server.ts            # implementación Stripe (server-only)
└── payments.functions.ts       # server fns expuestas al cliente
```

Contrato neutral (resumen):

```ts
interface PaymentProvider {
  id: 'stripe' | 'paddle' | 'mercadopago' | 'paypal';
  createIntent(input: CreateIntentInput): Promise<IntentResult>;
  verifyWebhook(req: Request, rawBody: string): Promise<NormalizedEvent>;
  // refund/capture se añaden en olas posteriores
}
```

`IntentResult` devuelve sólo lo que el cliente necesita
(`client_secret`/`checkout_url`, `provider`, `provider_intent_id`). El
Marketplace nunca importa `stripe` directamente.

## Cambios de base de datos (una migración)

1. `payment_events` — nueva tabla:
   - `id uuid PK`, `order_id uuid FK`, `provider text`,
     `provider_event_id text`, `event_type text`, `payload jsonb`,
     `received_at timestamptz`, `processed_at timestamptz`.
   - `UNIQUE(provider, provider_event_id)` → idempotencia de webhook.
   - GRANT `SELECT` a `authenticated` (sólo dueños vía RLS join con
     `orders`), `ALL` a `service_role`. Sin `anon`.
   - RLS: lectura sólo si `EXISTS (orders WHERE id = order_id AND user_id
     = auth.uid())`. Sin INSERT/UPDATE/DELETE para `authenticated`.
2. `orders` — columnas aditivas:
   - `payment_provider text NULL`,
   - `payment_intent_id text NULL`,
   - `payment_status text NOT NULL DEFAULT 'unpaid'`
     (`unpaid|processing|paid|failed|refunded`),
   - `paid_at timestamptz NULL`.
   - Índice parcial `UNIQUE(payment_provider, payment_intent_id)
     WHERE payment_intent_id IS NOT NULL`.
3. RPC `order_mark_paid(order_id, provider, intent_id, event_id)`
   `SECURITY DEFINER`, `search_path = public`, EXECUTE sólo `service_role`.
   Idempotente: si ya está `paid`, retorna sin error; escribe
   `order_events` con `payment_succeeded`.
4. RPC `order_mark_payment_failed(...)` análoga.

## Server functions y rutas

- `src/lib/payments/payments.functions.ts`
  - `createPaymentIntent` — `requireSupabaseAuth`. Carga la orden del
    usuario, revalida `conversion_mode`/`accepts_online_payment`/precios,
    delega en `provider.createIntent`, persiste `payment_provider` +
    `payment_intent_id`, marca `payment_status='processing'`, registra
    `order_events.payment_initiated`. Idempotente por
    `client_request_id`.
- `src/routes/api/public/payments/$provider/webhook.ts`
  - Server route TSS bajo `/api/public/*` (callers externos).
  - Lee `rawBody`, llama `provider.verifyWebhook` (HMAC + timing-safe).
  - Inserta en `payment_events` con `ON CONFLICT DO NOTHING`
    (idempotencia por `provider_event_id`).
  - Si nuevo: importa `supabaseAdmin` dentro del handler y llama
    `order_mark_paid` / `order_mark_payment_failed`.
  - Responde 200 incluso ante reintentos ya procesados.

## UI (sin acoplar a Stripe)

- `/cuenta/historial` — botón "Pagar" en órdenes `pending` con
  `payment_status='unpaid'`. Llama `createPaymentIntent` y, según
  `provider`, redirige a `checkout_url` o monta Stripe Elements
  cargado dinámicamente (lazy import, sólo cliente).
- Páginas `/cuenta/pagos/exito` y `/cuenta/pagos/error` neutrales
  (no mencionan Stripe).

## Secretos (vía `add_secret`, no en código)

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `PAYMENTS_PROVIDER` (default `stripe`) — `set_secret`.

La clave publicable de Stripe se sirve al cliente mediante un server fn
público mínimo (`getPaymentPublicConfig`) que sólo expone valores no
sensibles del proveedor activo.

## QA / Aceptación

1. Orden no reservable → `createPaymentIntent` rechaza con
   `product_not_reservable`.
2. Precio alterado en cliente → revalidación server-side falla.
3. Webhook duplicado (mismo `event_id`) → segunda ejecución no
   duplica `order_events` ni cambia estado.
4. Webhook con firma inválida → 401, sin escritura.
5. Doble click en "Pagar" con mismo `client_request_id` → un único
   PaymentIntent.
6. Sin `SUPABASE_SERVICE_ROLE_KEY` en ningún archivo `.functions.ts` ni
   importado desde rutas cliente.
7. `grep` confirma que `src/components/*` y `src/routes/_authenticated/*`
   no importan `stripe`.

## Entregables documentales

- `docs/blueprint/14.40.5-WAVE-4-STAGE-5-PROGRESS-v1.0.md` al cerrar.

## Preguntas antes de implementar

1. **Modo de checkout Stripe:** ¿Stripe **Checkout** (redirección, más
   simple, menos UI custom) o **Payment Element** embebido (UX en sitio,
   requiere clave publicable en cliente)? Recomiendo **Checkout** para
   Etapa 5 — más simple, igual de seguro, y la abstracción lo oculta.
2. **Moneda:** ¿`MXN` única en Etapa 5, o multi-moneda desde el inicio?
   El catálogo ya tiene `currency` por producto; confirmo que el
   PaymentIntent usa el `currency` de la orden tal cual.
3. **Provisión de claves Stripe:** ¿Procedo a solicitarlas con
   `add_secret` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) en cuanto
   apruebes el plan? El webhook se configura apuntando a
   `https://valladolidmx.lovable.app/api/public/payments/stripe/webhook`.

Tras aprobación del plan + respuestas a (1) y (2), ejecuto la migración,
la abstracción, el provider Stripe, las server fns, el webhook, el UI de
pago y entrego el reporte `14.40.5`.
