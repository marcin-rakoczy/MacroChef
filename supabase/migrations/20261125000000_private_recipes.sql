-- Authenticated users can read their own recipes and the Admin-authored library.
BEGIN;

DO $$
DECLARE policy RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd = 'ALL'
  ) THEN
    RAISE EXCEPTION 'Remove or replace recipes ALL policies before applying this migration';
  END IF;
  FOR policy IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'recipes' AND cmd IN ('SELECT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.recipes', policy.policyname);
  END LOOP;
END $$;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY recipes_select_own_or_admin_library ON public.recipes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin(user_id));
CREATE POLICY recipes_update_admin_owner ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND (SELECT auth.uid()) = user_id)
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);
CREATE POLICY recipes_delete_admin_owner ON public.recipes
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (SELECT auth.uid()) = user_id);

COMMIT;
