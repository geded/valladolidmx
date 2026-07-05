## Objetivo

Alta profesional de empresas con dos puertas de aprobación que garanticen que sólo empresas reales y con perfil completo aparezcan publicadas.

## Flujo de estados

```text
alta enriquecida ──► pending_identity ──► (Admin: Puerta 1)
                                              │
                    rechazada / más docs ◄────┤
                                              ▼
                                            draft
                                              │
                       anfitrión trabaja perfil en workspace
                                              ▼
                                       pending_review ──► (Admin: Puerta 2)
                                                            │
                              devuelta con notas ◄──────────┤
                                                            ▼
                                                       published
```

## Cambios de base de datos (migración)

- Nuevo `enum business_lifecycle_status`: `pending_identity | draft | pending_review | published | changes_requested | rejected`.
- Columnas nuevas en `businesses`:
  - `lifecycle_status business_lifecycle_status default 'pending_identity'`
  - `verification_document_url text` (ruta en storage privado)
  - `verification_notes text`
  - `submitted_for_review_at timestamptz`
  - `published_at timestamptz`
  - `review_notes text` (notas del admin al devolver o publicar)
- Bucket privado `business-verification` (sólo owner del negocio + admins pueden leer vía RLS en `storage.objects`).
- Ajuste de RLS: `businesses` sólo es visible al público cuando `lifecycle_status = 'published'`; el owner ve siempre la suya.
- RPCs `SECURITY DEFINER` nuevos:
  - `submit_business_for_review(_business_id)` — owner. Requiere perfil mínimo completo (logo, portada, descripción, categoría, ubicación, contacto). Pone `pending_review`.
  - `admin_approve_identity(_business_id, _approve, _notes)` — Puerta 1. Approve → concede `owner` + pone `draft`. Reject → `rejected`.
  - `admin_publish_business(_business_id, _approve, _notes)` — Puerta 2. Approve → `published`. Reject → `changes_requested`.
- RPC `list_pending_business_requests` se amplía: devuelve dos tipos, `identity_review` y `publication_review`.

## Alta enriquecida (formulario en `/cuenta/anfitrion`)

Wizard de 4 pasos, mobile-first, estilo Airbnb:

1. **Datos básicos**: nombre, categoría principal (select desde `business_categories`), destino, tagline, descripción larga (min 80 caracteres).
2. **Ubicación y contacto**: dirección, colonia, referencias, teléfono, WhatsApp, email público, sitio web.
3. **Verificación**: subida obligatoria de UN documento (RFC, acta constitutiva, licencia municipal o comprobante de domicilio del negocio). Storage privado. Mensaje: "Sólo tú y los administradores pueden ver este documento."
4. **Revisión**: resumen antes de enviar. Botón único **Enviar solicitud**.

Sin fotos aquí — las fotos son parte del perfil, se suben en el workspace.

## Workspace de la empresa — Publicación

En el workspace de la empresa nueva ruta `/cuenta/empresa/$businessId/publicacion`:

- Checklist visual estilo Airbnb ("Prepara tu ficha para publicar"):
  - Logo cuadrado ✓/✗
  - Portada panorámica ✓/✗
  - Galería (min 3 fotos) ✓/✗
  - Descripción larga ✓/✗
  - Categoría principal ✓/✗
  - Ubicación con mapa ✓/✗
  - Al menos un canal de contacto ✓/✗
- Botón **Enviar a revisión para publicar** habilitado sólo si el checklist está completo.
- Estado visible: badge del `lifecycle_status` actual.
- Si `changes_requested`: banner con `review_notes` del admin.

## Admin `/admin/anfitriones` — Dos pestañas

- **Pestaña 1 · Verificación de identidad** (Puerta 1): lista `pending_identity`. Cada fila muestra datos + preview del documento (signed URL). Acciones: Aprobar / Rechazar / Pedir más info (nota).
- **Pestaña 2 · Publicaciones pendientes** (Puerta 2): lista `pending_review`. Muestra preview del perfil completo (logo, portada, galería, descripción, mapa). Acciones: Publicar / Devolver con notas.

## Estilo visual (Airbnb + Google Business)

Sin salir del Valladolid Colonial Design System v1.0:
- Wizard: barra de progreso superior, un solo paso visible, botones Atrás/Siguiente sticky en móvil.
- Uploader de documento: dropzone con `rounded-2xl` + borde punteado + preview thumbnail al cargar.
- Checklist de publicación: cards con icono estado + acción rápida "Completar".
- Preview de admin: layout de dos columnas (datos ↔ documento/perfil) idéntico al que ya usamos en CMS.
- Todos los estados con badges tonales (`success/warning/info/destructive`) ya migrados en I3.d.4.

## No regresión / afectados

- `searchBusinessesForClaim` sigue funcionando; ahora filtra por `lifecycle_status = 'published'` para el listado público del reclamo, pero incluye empresas en cualquier estado si el buscador es admin (para reclamos internos).
- Rutas públicas (`/marketplace/*`, cards de empresa) ya usan `deleted_at IS NULL`; añadir filtro `lifecycle_status = 'published'`.
- Migración soft: todas las empresas existentes se marcan `lifecycle_status = 'published'` en el mismo cambio para no romper el marketplace actual.

## Detalles técnicos

- Server fns nuevas en `src/lib/hosting/hosting.functions.ts`: `getVerificationDocumentSignedUrl`, `submitBusinessForReview`, `adminPublishBusiness` (Puerta 2). `approveBusinessRegistration` se renombra internamente a Puerta 1 (`admin_approve_identity`).
- Subida del documento: server fn `createVerificationUploadUrl(business_id, filename, contentType)` que devuelve URL firmada de Supabase Storage al bucket privado.
- Un solo componente `BecomeHostWizard` reemplaza el `RegisterBranch` actual.
- `BusinessPublishChecklist` nuevo componente reutilizable en workspace.
- Los toasts, sheets y navegación reusan Workspace Engine (política Workspace First).
- Sin nuevos providers ni engines (Infrastructure Freeze).

## Fuera de alcance de esta iteración

- Verificación automática por scraping o llamadas al RFC/SAT.
- Verificación por videollamada.
- Sellos institucionales (ya viven en su propio bloque `institutional-badges`).
- Emails transaccionales personalizados de rechazo (usa UNC estándar).
