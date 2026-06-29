-- ============================================================
-- Phase 1 · Block A · Hardening: relocate extensions
-- Fixes linter WARN 0014_extension_in_public
-- ============================================================

-- 1. Dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 2. Drop pgcrypto (gen_random_uuid() is native in PG13+)
DROP EXTENSION IF EXISTS pgcrypto;

-- 3. Move the rest to the extensions schema
ALTER EXTENSION unaccent SET SCHEMA extensions;
ALTER EXTENSION pg_trgm  SET SCHEMA extensions;
ALTER EXTENSION citext   SET SCHEMA extensions;

-- 4. Make the extensions schema discoverable without qualifying it.
--    Applies to all current and future roles in this database.
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;
