## Sprint 15.10.10 · Colaboración y Flujo Editorial

Objetivo: que varios editores puedan trabajar sobre el mismo Studio sin pisarse, con un flujo claro de revisión antes de publicar y notificaciones al equipo. Reutiliza infraestructura existente (Workspace Engine, notification_deliveries, page_compositions, page_revisions) — sin engines nuevos.

### Historias

**US-01 · Bloqueo suave por página (Soft Lock)**
- Nuevo campo `editing_lock` (jsonb: `{user_id, user_name, acquired_at, heartbeat_at}`) en `page_compositions`.
- RPC `eb_acquire_edit_lock` / `eb_release_edit_lock` / `eb_heartbeat_edit_lock`. Lock expira si `heartbeat_at < now() - 2 min`.
- En `VisualStudio.tsx`: al montar, se intenta adquirir el lock; heartbeat cada 30 s; se libera en unmount o al cerrar pestaña (`visibilitychange` + `beforeunload`).
- Banner amarillo "María González está editando esta página · última actividad hace 15 s" con opción "Forzar edición" (solo admin/super_admin, registra evento en `eb_audit_log`).

**US-02 · Estados de flujo editorial**
- Enum `page_workflow_status`: `draft` | `in_review` | `approved` | `published`.
- Campo `workflow_status` + `workflow_updated_at` + `workflow_updated_by` en `page_compositions`.
- Transiciones válidas (RPC `eb_transition_workflow`):
  - editor/dueño: `draft → in_review`
  - admin/super_admin: `in_review → approved` o `in_review → draft` (rechazo con nota)
  - admin/super_admin: `approved → published` (dispara flujo actual `eb_publish`)
- Botón "Publicar" del topbar se comporta según estado + rol: editores ven "Enviar a revisión"; admins ven "Aprobar" o "Publicar" según estado.

**US-03 · Comentarios inline en bloques**
- Nueva tabla `eb_block_comments` (`page_id`, `block_id`, `author_id`, `body`, `resolved_at`, `parent_id` para hilos).
- Componente `BlockCommentsPanel` acoplado al Inspector: pin visible sobre el bloque cuando tiene hilo abierto; contador en el overlay.
- Reacciones básicas resolver/reabrir; `@mención` al `user_id` dispara notificación.

**US-04 · Notificaciones al equipo**
- Reutiliza `notification_deliveries` + `notification_preferences` existentes.
- Eventos: `page.submitted_for_review`, `page.approved`, `page.rejected`, `page.published`, `page.unpublished`, `page.scheduled`, `page.comment_mention`.
- Destinatarios: dueños de la empresa/zona + admins con permiso sobre la página. Preferencia in-app siempre; email/push respetan `notification_preferences`.

**US-05 · Actividad reciente**
- Vista `page_activity_feed` (union de `page_revisions` + `eb_audit_log` + `eb_block_comments`).
- Drawer "Actividad" en el topbar del Studio con timeline: quién guardó, publicó, comentó, envió a revisión, etc.

### Detalles técnicos

- Todas las mutaciones vía `createServerFn` con `requireSupabaseAuth`; sin edge functions nuevas.
- RLS respeta roles y `user_zone_scopes` ya definidos.
- Realtime: canal `page:{id}` para propagar lock, comentarios y transiciones (usa `supabase.channel` en `VisualStudio.tsx`).
- Cero cambios al motor de composición ni al `PreviewCanvas`.
- Feature flags no requeridos: la UI degrada limpiamente si un usuario no tiene permiso.

### Orden de ejecución

1. Migración A: `editing_lock` + RPCs de lock. UI de lock (US-01).
2. Migración B: `workflow_status` + RPC de transición. UI (US-02).
3. Migración C: `eb_block_comments`. UI de comentarios (US-03).
4. Cableado de notificaciones (US-04).
5. Timeline de actividad (US-05).

### Rollback

Cada migración es aditiva; se puede revertir eliminando columna/tabla sin afectar composiciones existentes. La UI condiciona cada capa a la existencia del dato (`workflow_status ?? 'draft'`), así que retirar una capa no rompe pantallas.

### Plan de verificación

- Typecheck + build tras cada historia.
- Smoke: dos sesiones simultáneas (Chrome + incógnito) contra la misma página validan lock y notificaciones.
- Regresión: publicar/despublicar/programar (15.10.9) siguen funcionando idénticos.
