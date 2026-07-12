CREATE POLICY "business_reads_own_orders"
  ON public.concierge_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.concierge_order_items oi
      JOIN public.business_users bu ON bu.business_id = oi.business_id
      WHERE oi.order_id = concierge_orders.id
        AND bu.user_id = auth.uid()
    )
  );