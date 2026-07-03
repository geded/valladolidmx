-- US-R1 (a) · Ampliar enum eb_page_kind con los kinds del Recovery Plan §1.
-- Aditivo; usa IF NOT EXISTS para ser idempotente y no dañar migraciones previas.
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'home'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'marketplace'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'experience'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'hotel'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'restaurant'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'route'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'alux'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'trip_builder'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'custom'; EXCEPTION WHEN others THEN NULL; END $$;