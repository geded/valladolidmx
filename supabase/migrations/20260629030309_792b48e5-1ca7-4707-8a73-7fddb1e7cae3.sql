-- ============================================================
-- Phase 1 · Block A · Foundation (Infrastructure)
-- Migration: phase1_blockA_foundation
-- Blueprint refs: 13.0A, 13.1, 13.2, 13.3
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto"      WITH SCHEMA public;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent"      WITH SCHEMA public;  -- slug normalization & search
CREATE EXTENSION IF NOT EXISTS "pg_trgm"       WITH SCHEMA public;  -- fuzzy search / trigram indexes
CREATE EXTENSION IF NOT EXISTS "citext"        WITH SCHEMA public;  -- case-insensitive text (emails, slugs)

-- ------------------------------------------------------------
-- 2. SHARED HELPER FUNCTIONS
-- ------------------------------------------------------------
-- Generic updated_at trigger function. Reused by every table with
-- timestamp auditing (Blueprint 11.5 – Database Standards).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at()
  IS 'Standard trigger function: keeps updated_at in sync. Phase 1 Block A.';

-- ------------------------------------------------------------
-- 3. STORAGE RLS POLICIES
-- Buckets created via tool: logos, hero, destinations, companies,
-- products, gallery, documents, temporary.
--
-- Strategy:
--   • PUBLIC-READ buckets (display assets): anon SELECT allowed.
--   • PRIVATE buckets (documents, temporary): owner-only.
--   • Writes: only authenticated; owner = auth.uid().
-- Admin role overrides will be added in Block C alongside user_roles.
-- ------------------------------------------------------------

-- Drop any leftover phase1 policies (idempotent re-run safety)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'phase1_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- --- Public-read display buckets ---
CREATE POLICY "phase1_public_read_display_buckets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('logos','hero','destinations','companies','products','gallery'));

-- --- Private buckets: owner-only read ---
CREATE POLICY "phase1_private_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('documents','temporary')
    AND owner = auth.uid()
  );

-- --- Authenticated upload to any bucket (owner attached automatically) ---
CREATE POLICY "phase1_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('logos','hero','destinations','companies','products','gallery','documents','temporary')
    AND owner = auth.uid()
  );

-- --- Owner update ---
CREATE POLICY "phase1_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

-- --- Owner delete ---
CREATE POLICY "phase1_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (owner = auth.uid());
