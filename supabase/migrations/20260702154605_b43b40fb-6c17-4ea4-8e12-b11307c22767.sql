INSERT INTO public.states (country_id, slug, name, iso_code, status)
VALUES ('00000001-0000-4000-8000-000000000001', 'quintana-roo', 'Quintana Roo', 'MX-ROO', 'published')
ON CONFLICT DO NOTHING;