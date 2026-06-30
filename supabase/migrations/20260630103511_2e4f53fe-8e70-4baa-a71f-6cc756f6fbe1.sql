
REVOKE EXECUTE ON FUNCTION
  public.eb_theme_upsert(jsonb),
  public.eb_template_upsert(jsonb),
  public.eb_template_clone(uuid, public.eb_scope, uuid, text),
  public.eb_section_upsert(jsonb),
  public.eb_section_publish(uuid, text),
  public.eb_page_upsert(jsonb),
  public.eb_page_save_version(uuid, text),
  public.eb_page_publish(uuid, text),
  public.eb_page_unpublish(uuid),
  public.eb_page_restore_version(uuid, uuid),
  public.eb_page_delete(uuid),
  public.eb_variant_upsert(jsonb),
  public.eb_preview_token_issue(uuid, uuid, uuid, int),
  public.eb_preview_resolve(text),
  public.eb__audit(text, uuid, public.eb_audit_action, public.eb_scope, uuid, jsonb),
  public.eb_can_edit_scope(public.eb_scope, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.eb_theme_upsert(jsonb),
  public.eb_template_upsert(jsonb),
  public.eb_template_clone(uuid, public.eb_scope, uuid, text),
  public.eb_section_upsert(jsonb),
  public.eb_section_publish(uuid, text),
  public.eb_page_upsert(jsonb),
  public.eb_page_save_version(uuid, text),
  public.eb_page_publish(uuid, text),
  public.eb_page_unpublish(uuid),
  public.eb_page_restore_version(uuid, uuid),
  public.eb_page_delete(uuid),
  public.eb_variant_upsert(jsonb),
  public.eb_preview_token_issue(uuid, uuid, uuid, int),
  public.eb_preview_resolve(text),
  public.eb_can_edit_scope(public.eb_scope, uuid)
TO authenticated;
