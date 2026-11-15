-- Shared recipe library: every authenticated user reads all recipes regardless of user_id.
-- user_id stays as the authoring Admin (NOT NULL); only Admins may write.

-- Self-contained: some environments never received the initial schema helper.
CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = check_user AND role = 'Admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Drop every existing recipes policy (live names may differ from the initial migration).
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.recipes', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;

DROP POLICY IF EXISTS recipes_select_own_or_admin_library ON public.recipes;
DROP POLICY IF EXISTS recipes_select_all ON public.recipes;
CREATE POLICY recipes_select_all ON public.recipes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS recipes_insert_admin ON public.recipes;
CREATE POLICY recipes_insert_admin ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS recipes_update_admin ON public.recipes;
CREATE POLICY recipes_update_admin ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS recipes_delete_admin ON public.recipes;
CREATE POLICY recipes_delete_admin ON public.recipes
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Normalize legacy CSV imports (*PerServing) to the fields the UI reads.
UPDATE public.recipes
SET data = (data - 'caloriesPerServing' - 'proteinPerServing' - 'carbsPerServing'
                 - 'fatPerServing' - 'fatsPerServing' - 'userId')
  || jsonb_build_object(
       'calories', COALESCE(data->'calories', data->'caloriesPerServing', '0'::jsonb),
       'protein',  COALESCE(data->'protein',  data->'proteinPerServing',  '0'::jsonb),
       'carbs',    COALESCE(data->'carbs',    data->'carbsPerServing',    '0'::jsonb),
       'fats',     COALESCE(data->'fats',     data->'fatPerServing', data->'fatsPerServing', '0'::jsonb))
WHERE data ?| ARRAY['caloriesPerServing', 'proteinPerServing', 'carbsPerServing',
                    'fatPerServing', 'fatsPerServing', 'userId'];
