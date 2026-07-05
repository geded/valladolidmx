
-- 1. Add 'pending' to membership_status
ALTER TYPE public.membership_status ADD VALUE IF NOT EXISTS 'pending';

-- 2. Allow ownership transfers without a current owner (claims on admin-created businesses)
ALTER TABLE public.business_ownership_transfers
  ALTER COLUMN from_user_id DROP NOT NULL;

ALTER TABLE public.business_ownership_transfers
  DROP CONSTRAINT IF EXISTS business_ownership_transfers_different_users;

ALTER TABLE public.business_ownership_transfers
  ADD CONSTRAINT business_ownership_transfers_different_users
  CHECK (from_user_id IS NULL OR from_user_id <> to_user_id);

-- 3. RLS: allow authenticated users to insert a claim TO themselves
DROP POLICY IF EXISTS "bot self claim insert" ON public.business_ownership_transfers;
CREATE POLICY "bot self claim insert"
  ON public.business_ownership_transfers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = to_user_id AND status = 'pending');

DROP POLICY IF EXISTS "bot admin manage" ON public.business_ownership_transfers;
CREATE POLICY "bot admin manage"
  ON public.business_ownership_transfers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
