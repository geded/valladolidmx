
-- Fix: ON CONFLICT must match the partial unique index on user_roles(user_id, role) WHERE scope_type IS NULL AND scope_id IS NULL.
-- The previous 4-column inference did not match the partial index and raised 23505 on every email confirmation.

CREATE OR REPLACE FUNCTION public.handle_new_traveler_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND
     (OLD.email_confirmed_at IS NULL OR TG_OP = 'INSERT')
  THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT NEW.id, 'traveler'::public.app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.id
        AND role = 'traveler'::public.app_role
        AND scope_type IS NULL
        AND scope_id IS NULL
    );

    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.traveler_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

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
