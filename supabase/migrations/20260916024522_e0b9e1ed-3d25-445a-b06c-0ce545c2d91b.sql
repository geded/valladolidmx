CREATE OR REPLACE FUNCTION public._cv41_orders_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_day text;
  v_lock_key bigint;
  v_next integer;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    v_prefix := CASE NEW.source_kind
      WHEN 'direct_sale' THEN 'ERL'
      WHEN 'concierge_proposal' THEN 'AVL'
      ELSE NULL
    END;

    IF v_prefix IS NULL THEN
      RAISE EXCEPTION 'Origen de reservación no reconocido: %', NEW.source_kind;
    END IF;

    v_day := to_char(timezone('America/Merida', statement_timestamp()), 'YYMMDD');
    v_lock_key := hashtextextended('concierge_order_folio:' || v_prefix || ':' || v_day, 0);
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT COALESCE(MAX(substring(folio FROM 12 FOR 3)::integer), 0) + 1
      INTO v_next
      FROM public.concierge_orders
     WHERE folio LIKE v_prefix || '-' || v_day || '-___'
       AND folio ~ ('^' || v_prefix || '-' || v_day || '-[0-9]{3}$');

    IF v_next > 999 THEN
      RAISE EXCEPTION 'Se alcanzó el límite diario de folios para %', v_prefix;
    END IF;

    NEW.folio := v_prefix || '-' || v_day || '-' || lpad(v_next::text, 3, '0');
  END IF;

  RETURN NEW;
END;
$$;