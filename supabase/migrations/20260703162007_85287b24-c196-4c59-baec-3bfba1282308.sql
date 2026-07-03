
-- Iniciativa 3 · Fase 3.3c — Retiro definitivo del modelo v2 (Experience Builder).
-- Precondición verificada por SQL previo:
--   - 10 tablas eb_* v2 con 0 filas
--   - 0 foreign keys externas apuntando a eb_*
--   - respaldo CSV + snapshot de columnas en /mnt/documents/eb-v2-backup-3.3c/

BEGIN;

-- 1) DROP de tablas v2 (CASCADE elimina triggers, políticas RLS, índices y FKs internas).
DROP TABLE IF EXISTS
    public.eb_audit_log,
    public.eb_block_comments,
    public.eb_section_versions,
    public.eb_sections,
    public.eb_templates,
    public.eb_variants,
    public.eb_themes,
    public.eb_preview_tokens,
    public.eb_page_versions,
    public.eb_pages
  CASCADE;

-- 2) DROP de funciones/RPCs exclusivas de v2 (sin consumidores tras 3.3b).
DROP FUNCTION IF EXISTS public.eb__audit(text, uuid, public.eb_audit_action, public.eb_scope, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_can_edit_scope(public.eb_scope, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_comment_create(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_comment_reopen(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_comment_resolve(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_notify_block_comment() CASCADE;
DROP FUNCTION IF EXISTS public.eb_block_comments_touch() CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_delete(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_publish(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_resolve_public(text, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_restore_version(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_rollback(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_save_version(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_unpublish(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.eb_page_upsert(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_preview_resolve(text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_preview_token_issue(uuid, uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.eb_section_publish(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_section_upsert(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_template_clone(uuid, public.eb_scope, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.eb_template_upsert(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_theme_upsert(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_variant_resolve(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.eb_variant_upsert(jsonb) CASCADE;

-- 3) DROP de enums exclusivos de v2.
--    NOTA: `eb_page_kind` NO se elimina — lo usan page_compositions.kind y
--    page_compositions.template_of_kind (v1).
DROP TYPE IF EXISTS public.eb_audit_action CASCADE;
DROP TYPE IF EXISTS public.eb_publish_status CASCADE;
DROP TYPE IF EXISTS public.eb_scope CASCADE;

COMMIT;
