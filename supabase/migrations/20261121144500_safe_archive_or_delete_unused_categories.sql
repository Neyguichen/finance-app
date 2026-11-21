CREATE OR REPLACE FUNCTION public.archive_or_delete_category(p_category_id uuid, p_mode text DEFAULT 'archive_or_delete'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_space uuid;
  v_active boolean;
  v_children bigint;
  v_transactions bigint;
  v_fixed bigint;
  v_recurrences bigint;
  v_budgets bigint;
  v_templates bigint;
  v_dependencies jsonb;
  v_total bigint;
BEGIN
  IF p_mode NOT IN ('check', 'archive_or_delete', 'delete_if_unused') THEN
    RAISE EXCEPTION 'Mode de suppression non valide';
  END IF;

  SELECT c.espace_id, c.actif INTO v_space, v_active
  FROM public.categories c
  WHERE c.id = p_category_id
  FOR UPDATE;

  IF v_space IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.espaces e
    WHERE e.id = v_space AND e.user_id = (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'Catégorie inaccessible';
  END IF;

  SELECT count(*) INTO v_children
  FROM public.categories WHERE parent_id = p_category_id;
  SELECT count(*) INTO v_transactions
  FROM public.transactions WHERE categorie_id = p_category_id OR sous_categorie_id = p_category_id;
  SELECT count(*) INTO v_fixed
  FROM public.charges_fixes WHERE categorie_id = p_category_id OR sous_categorie_id = p_category_id;
  SELECT count(*) INTO v_recurrences
  FROM public.charges_fixes_recurrentes WHERE categorie_id = p_category_id OR sous_categorie_id = p_category_id;
  SELECT count(*) INTO v_budgets
  FROM public.budgets WHERE categorie_id = p_category_id;
  SELECT count(*) INTO v_templates
  FROM public.budget_habitudes WHERE categorie_id = p_category_id;

  v_total := v_children + v_transactions + v_fixed + v_recurrences + v_budgets + v_templates;
  v_dependencies := jsonb_build_object(
    'subcategories', v_children,
    'transactions', v_transactions,
    'fixed_expenses', v_fixed,
    'recurrences', v_recurrences,
    'monthly_budgets', v_budgets,
    'budget_templates', v_templates
  );

  IF p_mode = 'check' THEN
    RETURN jsonb_build_object(
      'status', CASE WHEN v_total = 0 THEN 'eligible' ELSE 'blocked' END,
      'can_delete', v_total = 0,
      'references', v_dependencies
    );
  END IF;

  IF v_total = 0 THEN
    DELETE FROM public.categories WHERE id = p_category_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catégorie introuvable'; END IF;
    RETURN jsonb_build_object('status', 'deleted', 'can_delete', true, 'references', v_dependencies);
  END IF;

  IF p_mode = 'archive_or_delete' THEN
    UPDATE public.categories SET actif = false WHERE id = p_category_id;
    RETURN jsonb_build_object('status', 'archived', 'can_delete', false, 'references', v_dependencies);
  END IF;

  RETURN jsonb_build_object('status', 'blocked', 'can_delete', false, 'references', v_dependencies);
END;
$function$

REVOKE ALL ON FUNCTION public.archive_or_delete_category(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_or_delete_category(uuid,text) TO authenticated;
