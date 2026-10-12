CREATE POLICY "storage cms editor write companies" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('companies','products') AND public.is_editor_or_admin(auth.uid()));
CREATE POLICY "storage cms editor update companies" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('companies','products') AND public.is_editor_or_admin(auth.uid()))
WITH CHECK (bucket_id IN ('companies','products') AND public.is_editor_or_admin(auth.uid()));
CREATE POLICY "storage cms editor read companies" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('companies','products') AND public.is_editor_or_admin(auth.uid()));