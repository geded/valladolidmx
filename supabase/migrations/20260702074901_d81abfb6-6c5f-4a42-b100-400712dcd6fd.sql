
CREATE OR REPLACE FUNCTION public._strip_text_overrides(tree jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  keys text[] := ARRAY['heading','title','subtitle','eyebrow','cta_label','cta_secondary_label','body','description'];
  children jsonb;
  new_children jsonb := '[]'::jsonb;
  child jsonb;
  cfg jsonb;
  k text;
BEGIN
  IF tree IS NULL THEN RETURN tree; END IF;
  children := tree #> '{root,children}';
  IF children IS NULL OR jsonb_typeof(children) <> 'array' THEN RETURN tree; END IF;
  FOR child IN SELECT * FROM jsonb_array_elements(children) LOOP
    cfg := child->'config';
    IF cfg IS NOT NULL AND jsonb_typeof(cfg) = 'object' THEN
      FOREACH k IN ARRAY keys LOOP
        cfg := cfg - k;
      END LOOP;
      child := jsonb_set(child, '{config}', cfg);
    END IF;
    new_children := new_children || jsonb_build_array(child);
  END LOOP;
  RETURN jsonb_set(tree, '{root,children}', new_children);
END;
$$;

UPDATE page_compositions
SET current_draft = public._strip_text_overrides(current_draft),
    updated_at = now()
WHERE current_draft IS NOT NULL;

UPDATE page_revisions
SET snapshot = public._strip_text_overrides(snapshot)
WHERE snapshot IS NOT NULL;

DROP FUNCTION public._strip_text_overrides(jsonb);
