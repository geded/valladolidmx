
-- 1) Actualizar handle_new_user para poblar first_name / last_name desde metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full text := COALESCE(meta->>'full_name', meta->>'name');
  v_given text := meta->>'given_name';
  v_family text := meta->>'family_name';
  v_first text;
  v_last text;
  v_display text;
BEGIN
  -- Derivar first/last
  IF v_given IS NOT NULL AND length(trim(v_given)) > 0 THEN
    v_first := trim(v_given);
    v_last := NULLIF(trim(COALESCE(v_family, '')), '');
  ELSIF v_full IS NOT NULL AND length(trim(v_full)) > 0 THEN
    v_first := split_part(trim(v_full), ' ', 1);
    v_last  := NULLIF(trim(substring(trim(v_full) FROM position(' ' IN trim(v_full)) + 1)), '');
    IF v_last = v_first THEN v_last := NULL; END IF;
  ELSE
    v_first := split_part(NEW.email, '@', 1);
    v_last  := NULL;
  END IF;

  v_display := COALESCE(NULLIF(trim(COALESCE(v_first,'') || ' ' || COALESCE(v_last,'')), ''), NEW.email);

  INSERT INTO public.profiles (user_id, email, first_name, last_name, display_name, avatar_url)
  VALUES (NEW.id, NEW.email, v_first, v_last, v_display, meta->>'avatar_url')
  ON CONFLICT (user_id) DO UPDATE
    SET first_name  = COALESCE(public.profiles.first_name,  EXCLUDED.first_name),
        last_name   = COALESCE(public.profiles.last_name,   EXCLUDED.last_name),
        display_name= COALESCE(public.profiles.display_name,EXCLUDED.display_name),
        avatar_url  = COALESCE(public.profiles.avatar_url,  EXCLUDED.avatar_url);

  INSERT INTO public.traveler_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  SELECT NEW.id, 'traveler'::public.app_role
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = NEW.id
      AND role = 'traveler'::public.app_role
      AND scope_type IS NULL
      AND scope_id IS NULL
  );

  RETURN NEW;
END;
$function$;

-- 2) Actualizar el trigger de confirmación de email para hacer el mismo enriquecimiento
CREATE OR REPLACE FUNCTION public.handle_new_traveler_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb;
  v_full text;
  v_given text;
  v_family text;
  v_first text;
  v_last text;
  v_display text;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND
     (OLD.email_confirmed_at IS NULL OR TG_OP = 'INSERT')
  THEN
    meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    v_full := COALESCE(meta->>'full_name', meta->>'name');
    v_given := meta->>'given_name';
    v_family := meta->>'family_name';

    IF v_given IS NOT NULL AND length(trim(v_given)) > 0 THEN
      v_first := trim(v_given);
      v_last  := NULLIF(trim(COALESCE(v_family, '')), '');
    ELSIF v_full IS NOT NULL AND length(trim(v_full)) > 0 THEN
      v_first := split_part(trim(v_full), ' ', 1);
      v_last  := NULLIF(trim(substring(trim(v_full) FROM position(' ' IN trim(v_full)) + 1)), '');
      IF v_last = v_first THEN v_last := NULL; END IF;
    ELSE
      v_first := split_part(NEW.email, '@', 1);
      v_last  := NULL;
    END IF;

    v_display := COALESCE(NULLIF(trim(COALESCE(v_first,'') || ' ' || COALESCE(v_last,'')), ''), NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    SELECT NEW.id, 'traveler'::public.app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.id
        AND role = 'traveler'::public.app_role
        AND scope_type IS NULL
        AND scope_id IS NULL
    );

    INSERT INTO public.profiles (user_id, email, first_name, last_name, display_name, avatar_url)
    VALUES (NEW.id, NEW.email, v_first, v_last, v_display, meta->>'avatar_url')
    ON CONFLICT (user_id) DO UPDATE
      SET first_name  = COALESCE(public.profiles.first_name,  EXCLUDED.first_name),
          last_name   = COALESCE(public.profiles.last_name,   EXCLUDED.last_name),
          display_name= COALESCE(public.profiles.display_name,EXCLUDED.display_name),
          avatar_url  = COALESCE(public.profiles.avatar_url,  EXCLUDED.avatar_url);

    INSERT INTO public.traveler_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Backfill de usuarios existentes: rellenar first/last/avatar cuando estén nulos
UPDATE public.profiles p
SET
  first_name = COALESCE(
    p.first_name,
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'given_name','')),''),
    NULLIF(split_part(trim(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name','')), ' ', 1),'')
  ),
  last_name = COALESCE(
    p.last_name,
    NULLIF(trim(COALESCE(u.raw_user_meta_data->>'family_name','')),''),
    NULLIF(
      trim(
        substring(
          trim(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name',''))
          FROM position(' ' IN trim(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name','') || ' ')) + 1
        )
      ),
      ''
    )
  ),
  avatar_url = COALESCE(p.avatar_url, u.raw_user_meta_data->>'avatar_url')
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.first_name IS NULL OR p.last_name IS NULL OR p.avatar_url IS NULL);

-- 4) Recomponer display_name si quedó vacío o igual al email
UPDATE public.profiles
SET display_name = NULLIF(trim(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), '')
WHERE (display_name IS NULL OR display_name = email)
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);
