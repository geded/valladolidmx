create or replace function public.cms_media_transition(
  _media_id uuid,
  _to public.content_status,
  _notes text default null
)
returns public.media_assets
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.media_assets;
  v_from public.content_status;
  v_is_admin boolean;
  v_admin record;
  v_actor uuid := auth.uid();
  v_event_id text;
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_editor_or_admin(v_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_row from public.media_assets
   where id = _media_id and deleted_at is null
   for update;
  if not found then
    raise exception 'media_not_found' using errcode = 'P0002';
  end if;

  v_from := v_row.status;
  v_is_admin := public.is_admin(v_actor);

  if _to in ('approved','published') and not v_is_admin then
    raise exception 'forbidden_requires_admin' using errcode = '42501';
  end if;

  if not (
    (v_from = 'draft' and (_to in ('in_review','archived') or (v_is_admin and _to in ('approved','published'))))
    or (v_from = 'in_review' and _to in ('approved','published','draft','archived'))
    or (v_from = 'approved' and _to in ('published','draft','archived'))
    or (v_from = 'published' and _to in ('archived','draft'))
    or (v_from = 'archived' and _to = 'draft')
  ) then
    raise exception 'invalid_transition:%->%', v_from, _to using errcode = '22023';
  end if;

  update public.media_assets
     set status = _to,
         updated_by = v_actor,
         updated_at = now(),
         review_state = case
           when _to in ('approved','published') then 'approved'::public.media_review_state
           when _to = 'draft' and v_from = 'in_review' then 'needs_revision'::public.media_review_state
           else review_state
         end,
         reviewed_by = case when _to in ('approved','published') then v_actor else reviewed_by end,
         reviewed_at = case when _to in ('approved','published') then now() else reviewed_at end
   where id = _media_id
   returning * into v_row;

  insert into public.content_audit_log (entity_kind, entity_id, action, from_status, to_status, actor_user_id, notes)
  values ('media_asset', _media_id, 'transition', v_from, _to, v_actor, nullif(btrim(coalesce(_notes,'')), ''));

  if _to = 'in_review' then
    v_event_id := 'media_review:' || _media_id::text || ':' || extract(epoch from now())::bigint::text;
    v_payload := jsonb_build_object(
      'media_id', _media_id,
      'alt_text', v_row.alt_text,
      'requested_by', v_actor,
      'url', '/cms/media?estado=in_review'
    );

    for v_admin in
      select distinct ur.user_id
        from public.user_roles ur
       where ur.role in ('admin','super_admin')
    loop
      perform public.unc_publish_in_app(
        v_event_id,
        'media.review_requested',
        v_admin.user_id,
        'staff',
        'operational'::public.notification_category,
        v_payload
      );

      perform public.unc_publish_push(
        v_event_id,
        'media.review_requested',
        v_admin.user_id,
        'staff',
        'operational'::public.notification_category,
        'unc-push-generic',
        v_payload
      );
    end loop;
  end if;

  return v_row;
end;
$$;