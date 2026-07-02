
GRANT EXECUTE ON FUNCTION public.eb_get_published_home(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_page_resolve_public(text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_preview_resolve(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_variant_resolve(uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_list_block_library() TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_create_composition(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_save_composition_draft(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_create_revision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_restore_revision(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_publish_composition(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_unpublish_composition(uuid, text) TO authenticated;
