-- RLS para bucket business-verification: rutas <auth.uid()>/<filename>
CREATE POLICY "biz_verif_owner_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'business-verification' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));

CREATE POLICY "biz_verif_owner_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'business-verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "biz_verif_owner_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'business-verification' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'business-verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "biz_verif_owner_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'business-verification' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid())));
