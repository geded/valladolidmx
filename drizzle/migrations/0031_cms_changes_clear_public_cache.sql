CREATE OR REPLACE FUNCTION public.public_read_cache_bust()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.public_read_cache WHERE key <> '__cms_changed__';
  INSERT INTO public.public_read_cache(key, value, refreshed_at)
  VALUES ('__cms_changed__', 'null'::jsonb, now())
  ON CONFLICT (key) DO UPDATE SET refreshed_at = now();
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.public_read_cache_bust() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_categories','business_contacts','business_locations','business_media','business_menu_items','businesses','destination_media','destination_zones','destinations','editorial_routes','events','faqs','founder_spotlights','media_assets','page_compositions','place_authorities','place_authority_kinds','place_categories','place_category_links','place_events','place_hours','place_media','place_products','place_types','points_of_interest','product_media','products','promotions','related_overrides','seo_metadata','tourism_attribute_definitions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS zz_public_read_cache_bust ON public.%I', t);
    EXECUTE format('CREATE TRIGGER zz_public_read_cache_bust AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.public_read_cache_bust()', t);
  END LOOP;
END $$;