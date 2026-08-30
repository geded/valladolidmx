update public.businesses b
   set status = 'draft'::content_status
 where b.slug = 'cenote-suytun'
   and b.demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'
   and not exists (select 1 from public.business_users bu where bu.business_id = b.id and bu.status = 'active')
   and not exists (select 1 from public.business_claim_snapshots c where c.business_id = b.id)
   and not exists (select 1 from public.concierge_order_items oi where oi.business_id = b.id);

insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, notes, metadata)
select 'business'::entity_kind, b.id, 'g8_r1_f1g_withdrawn', 'published'::content_status, b.status,
       'Duplicado reconciliado: se conserva la ficha de lugar cenote-suytun',
       jsonb_build_object('batch','G8-R1-F1G-EVALUATION-CONTENT','class','E')
from public.businesses b
where b.slug = 'cenote-suytun' and b.status = 'draft'::content_status;
