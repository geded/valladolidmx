
CREATE TABLE public.composition_preview_tokens (
  token text PRIMARY KEY,
  composition_id uuid NOT NULL REFERENCES public.page_compositions(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX composition_preview_tokens_composition_idx ON public.composition_preview_tokens(composition_id);
CREATE INDEX composition_preview_tokens_expires_idx ON public.composition_preview_tokens(expires_at);

GRANT SELECT, INSERT, DELETE ON public.composition_preview_tokens TO authenticated;
GRANT ALL ON public.composition_preview_tokens TO service_role;

ALTER TABLE public.composition_preview_tokens ENABLE ROW LEVEL SECURITY;

-- Only editors can create tokens (checked via has_role)
CREATE POLICY "Editors can issue preview tokens"
  ON public.composition_preview_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND (
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'editor')
    )
  );

CREATE POLICY "Editors can list their preview tokens"
  ON public.composition_preview_tokens FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Editors can revoke their preview tokens"
  ON public.composition_preview_tokens FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );
