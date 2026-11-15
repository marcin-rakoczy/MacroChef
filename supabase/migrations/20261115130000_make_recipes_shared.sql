-- Make recipes shared across all users (not user-specific)

-- 1. Make user_id nullable for recipes (shared global library)
ALTER TABLE public.recipes
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Set user_id to NULL for all existing recipes (shared library)
UPDATE public.recipes SET user_id = NULL;

-- 3. Update RLS policy: recipes readable by all authenticated users
DROP POLICY IF EXISTS recipes_select_own_or_admin_library ON public.recipes;
CREATE POLICY recipes_select_all ON public.recipes
  FOR SELECT TO authenticated
  USING (TRUE);

-- 4. Update write policy: only Admin can create/update/delete
DROP POLICY IF EXISTS recipes_insert_admin ON public.recipes;
CREATE POLICY recipes_insert_admin ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS recipes_update_admin ON public.recipes;
CREATE POLICY recipes_update_admin ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS recipes_delete_admin ON public.recipes;
CREATE POLICY recipes_delete_admin ON public.recipes
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- 5. Update SYNC code: when creating/updating recipes, set user_id to NULL
--    This is done via AppSyncManager.js changes (no SQL needed here for now)


