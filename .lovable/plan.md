
# Ola 3 · Canje Robusto del Cupón Digital

**Objetivo**: elevar la experiencia de canje en `/portal/canjear` para que sea segura, verificable y trazable — con confirmación visual del viajero, historial de canjes filtrable, y notificación automática al viajero + invitación a reseñar.

El escáner QR con `html5-qrcode` ya funciona (Ola 2). Esta ola cierra el ciclo alrededor de ese flujo.

---

## Historia 3.1 · Confirmación visual del viajero (identidad)

Antes de "Marcar como canjeado", el empresario debe ver **quién es** el viajero para confirmar identidad y evitar fraudes.

**Backend** (`lookupCoupon`):
- Extender el retorno con: `avatar_url`, `country_code`, `country_name`, `first_name`, `last_name`.
- Leer de `traveler_profiles` (país/idioma) + `profiles` (avatar/nombre).

**Frontend** (`/portal/canjear`):
- Nueva **tarjeta de identidad** encima de la ficha del cupón:
  - Avatar circular grande (o placeholder con iniciales).
  - Nombre completo + bandera del país.
  - Aviso: "Verifica que la persona frente a ti coincide con esta foto."
- Bloqueo del botón "Canjear" hasta que el staff marque un checkbox: *"Confirmo que verifiqué la identidad del viajero"*.

---

## Historia 3.2 · Historial de canjes del negocio (`/portal/canjes`)

Los negocios necesitan auditar sus canjes.

**Backend** (nueva server fn `listBusinessRedemptions`):
- Input: `business_id`, filtros opcionales (`from`, `to`, `promotion_slug`, `staff_user_id`, `channel`).
- Middleware: `requireSupabaseAuth` + verificación `business_users` (mismo patrón que canjear).
- Devuelve: código, título, viajero (nombre + país), staff que canjeó, canal (qr/código), fecha.
- Paginado (50/página).

**Frontend** (nueva ruta `/portal/canjes`):
- Tabla con filtros de fecha, promoción y canal.
- KPIs arriba: total canjes hoy / semana / mes, promo top.
- Botón "Exportar CSV" (cliente, sin backend).
- Enlace desde `/portal/canjear` → "Ver historial".

**Nav**: agregar entrada "Canjes" al portal empresa.

---

## Historia 3.3 · Notificación post-canje al viajero

Cuando el cupón se canjea, mandar email transaccional al viajero.

**Plantilla** `src/lib/email-templates/coupon-redeemed.tsx`:
- Confirmación de canje (negocio, monto/descuento, fecha, código).
- Bloque **"¿Cómo estuvo tu experiencia?"** con CTA a `/negocios/{slug}?review=1` (deep-link a formulario de reseña — la Ola 5 conecta la creación real; por ahora abre la ficha con toast "Próximamente").
- Registrar en `registry.ts`.

**Integración** (dentro de `redeemCoupon`):
- Tras `UPDATE` exitoso, disparar `sendTransactionalEmail` con `idempotencyKey = redeem-${coupon_id}`.
- Correo del viajero: `profiles.email` o `auth.users.email` (vía `supabaseAdmin` cargado dentro del handler).
- Failure-tolerant: si el email falla, el canje NO se revierte (log a `email_send_log`).

---

## Historia 3.4 · Polish del panel de canje

- Feedback háptico/sonoro al detectar QR (opcional, `navigator.vibrate(200)`).
- Estados visuales claros: escaneando (con marco animado), procesando, éxito (checkmark grande + confetti sonner), error (banner rojo).
- Botón "Escanear otro" tras canjear (mantiene la cámara lista).
- Persistir preferencia "Empresa activa" ya existe; ok.

---

## Fuera de alcance (para olas siguientes)

- Reseñas reales (Ola 5).
- Métricas y dashboard de conversión de promos (Ola 5).
- Alux conversacional con contexto de cupones (Ola 4).
- Roles finos de staff (cajero vs gerente).

---

## Definition of Done

- Typecheck + build verdes.
- Historial visible con datos reales de canjes de Ola 2.
- Email de canje enviado (verificable en `email_send_log`).
- Sin regresiones en el escáner QR ni en emisión de cupones.
- Demo Pack: 1 promo con 1 cupón emitido → canjeado desde `/portal/canjear` → email recibido → visible en `/portal/canjes`.

¿Apruebas la Ola 3 completa (3.1 + 3.2 + 3.3 + 3.4) o prefieres partirla y ejecutar sólo 3.1 + 3.3 primero (identidad + email) y dejar historial y polish para una sub-ola posterior?
