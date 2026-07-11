## Ola 2 · Cupón Digital Valladolid.mx

Alcance aprobado: cupón con QR + código único, `/cuenta/mis-cupones`, panel de canje en `/portal`, límite 1 por viajero por promoción, vigencia = `promotion.ends_at`.

### 1. Base de datos (migración única)

**Tabla `traveler_coupons`**

Campos de dominio:
- `promotion_slug` (text, indexado) — ancla la landing (`page_compositions.slug`)
- `promotion_id` (uuid nullable) — cuando exista registro en `promotions`
- `business_id` (uuid nullable) — para filtrar canje por negocio
- `user_id` (uuid, FK auth.users)
- `code` (text, unique) — 10 chars alfanuméricos legibles (ej. `VMX-A3K9-7X`)
- `qr_token` (uuid unique) — payload interno del QR
- `discount_percent` (numeric nullable) — snapshot
- `title` (text) — snapshot del título
- `terms` (text nullable) — snapshot
- `valid_until` (timestamptz)
- `status` enum(`active`,`redeemed`,`expired`,`revoked`) default `active`
- `redeemed_at`, `redeemed_by` (uuid → auth.users, staff del negocio)
- `redeemed_channel` (`qr` | `code`)

Índices: `(user_id, promotion_slug)` UNIQUE parcial `WHERE status <> 'revoked'` → aplica límite 1 por viajero por promoción.

GRANTs: authenticated (select/insert/update), service_role (all).

RLS:
- Viajero ve/actualiza sólo sus cupones (`auth.uid() = user_id`, y update sólo si aún `active`).
- Staff del negocio ve cupones donde `business_id ∈ business_users.business_id` (helper `has_business_access`).
- Admin ve todo vía `has_role(auth.uid(),'admin')`.

Trigger: al `SELECT` marca `expired` si `valid_until < now()`; alternativa: función `expire_stale_coupons()` que corre en el server fn de listado antes de leer.

### 2. Server functions (`src/lib/promotions/coupons.functions.ts`)

Todas con `requireSupabaseAuth`:
- `issueCoupon({ promotion_slug })` → valida `is_public=true` (perfil 100%), lee snapshot desde `page_compositions` (+ opcional `promotions` por `business_id`), inserta cupón, devuelve `{ code, qr_token, valid_until }`. Manejo de UNIQUE → devuelve el existente.
- `listMyCoupons()` → cupones del viajero con estado calculado.
- `getCouponByCode({ code })` → para staff en `/portal/canjear`.
- `redeemCoupon({ qr_token_or_code, business_id })` → sólo si el usuario tiene acceso al negocio; marca `redeemed`.

### 3. UI viajero

- **`PromocionesGate`**: si `eligible`, el click en tarjeta abre `CouponIssueDialog` en vez del link. Muestra código + QR + botón "Ver en mis cupones".
- **`/cuenta/mis-cupones.tsx`** (nueva ruta bajo `_authenticated/cuenta/`): grid con Active / Usados / Expirados. Cada card: título, negocio, descuento, vigencia, botón "Mostrar QR" (modal con QR grande + código). Item en `navigation-registry`.

### 4. UI negocio · Panel de canje

- **`/portal/canjear.tsx`** (bajo `_authenticated/portal/`): input para pegar/teclear código, botón "Escanear QR" (usa `html5-qrcode`, ya disponible o instalar). Al leer, muestra ficha del cupón (viajero, descuento, vigencia) y botón "Marcar como canjeado". Success → toast + reset.
- Item en `navigation-registry` visible sólo con rol `business_owner`/`business_staff`.

### 5. Dependencias
- `qrcode` (generar SVG del QR en cliente) — `bun add qrcode @types/qrcode`
- `html5-qrcode` para escaneo en portal — `bun add html5-qrcode`

### 6. DoD
- Typecheck + build OK.
- Playwright: registrar viajero, completar perfil, desbloquear cupón, verlo en `/cuenta/mis-cupones`; iniciar sesión negocio, canjear código manual, cupón queda `redeemed`.
- Demo Pack: 1 promoción sembrada + 1 cupón activo.

### Fuera de alcance
- Notificaciones/email del cupón (Ola 3).
- Push cuando falten X días para expirar.
- Reporte analítico de canjes por negocio.

¿Apruebas para implementar tal cual?
