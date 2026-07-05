GRANT EXECUTE ON FUNCTION public.unc_list_my_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unc_list_my_deliveries(integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unc_count_my_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unc_mark_delivery_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unc_set_my_preference(public.notification_category, public.notification_channel, boolean, boolean) TO authenticated;