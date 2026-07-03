
-- 1) Storage policy: destinations bucket must join media_assets
DROP POLICY IF EXISTS destinations_bucket_public_read ON storage.objects;
CREATE POLICY destinations_bucket_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'destinations'
    AND EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.storage_bucket = storage.objects.bucket_id
        AND ma.storage_path = storage.objects.name
        AND ma.status = 'published'
        AND ma.deleted_at IS NULL
    )
  );

-- 2) Storage policy: demo-media bucket must join media_assets (published only)
DROP POLICY IF EXISTS demo_media_public_read ON storage.objects;
CREATE POLICY demo_media_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'demo-media'
    AND EXISTS (
      SELECT 1 FROM public.media_assets ma
      WHERE ma.storage_bucket = storage.objects.bucket_id
        AND ma.storage_path = storage.objects.name
        AND ma.status = 'published'
        AND ma.deleted_at IS NULL
    )
  );

-- 3) Fix mutable search_path on eb_lock_is_active
ALTER FUNCTION public.eb_lock_is_active(jsonb) SET search_path = public;

-- 4) Revoke EXECUTE from PUBLIC/anon/authenticated on all SECURITY DEFINER
--    functions in public, then re-grant only where needed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid,
           format('%I.%I(%s)', n.nspname, p.proname,
                  pg_catalog.pg_get_function_identity_arguments(p.oid)) AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    -- service_role keeps EXECUTE (retained via default owner grants)
  END LOOP;
END $$;

-- 5) Grant EXECUTE to authenticated for user-callable RPCs
--    (each performs its own authorization: role checks or auth.uid()).
GRANT EXECUTE ON FUNCTION public.alux_traveler_log_suggestion(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_business_product_faq(uuid, text, text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_business_product_faq(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_acquire_edit_lock(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_archive_composition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_cancel_scheduled_publish(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_comment_create(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_comment_reopen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_comment_resolve(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_delete_composition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_duplicate_composition(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_heartbeat_edit_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_mark_composition_as_template(uuid, boolean, eb_page_kind) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_r2_authz(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_release_edit_lock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_rename_composition(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_schedule_publish_composition(uuid, timestamp with time zone, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_set_workflow_state(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_unarchive_composition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eb_update_composition_slug(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_business_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_business_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_business_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_business_promotion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_business_product_faqs(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_business_product_faq(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_plan_build_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_plan_ensure_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_plan_import_favorites(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.travel_plan_is_concierge_reader(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.traveler_alux_context_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_business_ownership_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_business_ownership_transfer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_demo_seed(text) TO authenticated;

-- 6) Grant EXECUTE to anon+authenticated only for truly public read RPCs
GRANT EXECUTE ON FUNCTION public.eb_resolve_public_route(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_get_published_by_slug(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eb_get_published_home(text) TO anon, authenticated;

-- Note: trigger functions (eb_notify_*, eb_page_slug_redirect_trigger,
-- eb_reset_workflow_on_publish, audit_user_roles_changes, _concierge_*, etc.)
-- do not need EXECUTE grants — they run under the trigger owner. Similarly,
-- admin_* / assign_zone_scope / admin_assign_role / etc. are called from
-- server functions that resolve the caller server-side; they are invoked as
-- authenticated, so they receive an explicit grant below.
GRANT EXECUTE ON FUNCTION public.admin_acknowledge_system_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_custom_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_evaluate_functional_alerts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_system_alerts(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketplace_funnel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_system_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_custom_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_metrics_summary(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_products(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_zone_scope(uuid, text, uuid, app_role, text) TO authenticated;
