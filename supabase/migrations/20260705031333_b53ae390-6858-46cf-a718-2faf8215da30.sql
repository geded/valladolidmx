-- Owner-read: el autor puede leer sus reseñas en cualquier estado (draft/in_review/published)
DROP POLICY IF EXISTS "reviews_author_read_own" ON public.reviews;
CREATE POLICY "reviews_author_read_own" ON public.reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = author_user_id AND deleted_at IS NULL);

-- Una reseña activa por (autor, sujeto)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_author_subject
  ON public.reviews (author_user_id, subject_kind, subject_id)
  WHERE deleted_at IS NULL AND author_user_id IS NOT NULL;