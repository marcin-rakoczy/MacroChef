-- Run as the table owner (or a database administrator), with errors stopping execution.
-- This replaces ALL policies on the five tables: permissive policies combine with OR.
-- Profile identity is user_id, not id. Profile writes remain limited to the admin RPC.
-- The hardening transaction commits; the subsequent fixture transaction always rolls back.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin(check_user UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = check_user AND role = 'Admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Preserve the existing admin-only role-management path; clients cannot write profiles directly.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user UUID, new_role TEXT)
RETURNS public.user_profiles
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE updated public.user_profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles' USING ERRCODE = '42501';
  END IF;
  IF new_role IS NULL OR new_role NOT IN ('Admin', 'Tester', 'UserWithAdvertisement') THEN
    RAISE EXCEPTION 'Invalid role: %', new_role USING ERRCODE = '22023';
  END IF;
  IF target_user = auth.uid() AND new_role <> 'Admin' THEN
    RAISE EXCEPTION 'You cannot remove your own Admin role' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_profiles SET role = new_role
  WHERE user_id = target_user RETURNING * INTO updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN updated;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

DO $$
DECLARE
  target_table TEXT;
  policy RECORD;
  col RECORD;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['user_profiles', 'products', 'recipes', 'planner', 'goals'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    FOR policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy.policyname, target_table);
    END LOOP;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', target_table);
    FOR col IN
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND information_schema.columns.table_name = target_table
    LOOP
      EXECUTE format('REVOKE ALL (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        col.column_name, target_table);
    END LOOP;
  END LOOP;
END;
$$;

GRANT SELECT ON public.user_profiles TO authenticated;
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY user_profiles_select_admin ON public.user_profiles
  FOR SELECT TO authenticated USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products, public.recipes TO authenticated;
CREATE POLICY products_select_authenticated ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY products_insert_admin ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY products_update_admin ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_delete_admin ON public.products
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY recipes_select_own_or_admin_library ON public.recipes
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id OR public.is_admin(user_id));
CREATE POLICY recipes_insert_admin ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);
CREATE POLICY recipes_update_admin_owner ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND (SELECT auth.uid()) = user_id)
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);
CREATE POLICY recipes_delete_admin_owner ON public.recipes
  FOR DELETE TO authenticated USING (public.is_admin() AND (SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner, public.goals TO authenticated;
CREATE POLICY planner_owner_all ON public.planner
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY goals_owner_all ON public.goals
  FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DO $$
DECLARE missing TEXT;
BEGIN
  SELECT string_agg(required.name, ', ') INTO missing
  FROM unnest(ARRAY['user_profiles', 'products', 'recipes', 'planner', 'goals']) AS required(name)
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = required.name
    AND c.relkind IN ('r', 'p')
  WHERE c.oid IS NULL OR NOT c.relrowsecurity;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing tables or RLS disabled: %', missing;
  END IF;
END;
$$;
COMMIT;

-- INSERT violations throw 42501. RLS USING filters UPDATE/DELETE targets instead:
-- those statements succeed with zero affected rows, which must also be verified.
BEGIN;
DO $$
DECLARE
  admin_id UUID := gen_random_uuid();
  tester_id UUID := gen_random_uuid();
  ads_id UUID := gen_random_uuid();
  actor UUID;
  actor_role TEXT;
  product_id TEXT := 'rls-audit-product-' || gen_random_uuid()::TEXT;
  recipe_id TEXT := 'rls-audit-recipe-' || gen_random_uuid()::TEXT;
  own_plan TEXT;
  own_goals TEXT;
  denied BOOLEAN;
  affected INTEGER;
BEGIN
  INSERT INTO auth.users (id, email) VALUES
    (admin_id, admin_id::TEXT || '@rls-audit.invalid'),
    (tester_id, tester_id::TEXT || '@rls-audit.invalid'),
    (ads_id, ads_id::TEXT || '@rls-audit.invalid');
  INSERT INTO public.user_profiles (user_id, email, role) VALUES
    (admin_id, admin_id::TEXT || '@rls-audit.invalid', 'Admin'),
    (tester_id, tester_id::TEXT || '@rls-audit.invalid', 'Tester'),
    (ads_id, ads_id::TEXT || '@rls-audit.invalid', 'UserWithAdvertisement')
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.products (id, name_english) VALUES (product_id, 'RLS audit');
  INSERT INTO public.recipes (id, user_id, data) VALUES (recipe_id, admin_id, '{}'::JSONB);
  INSERT INTO public.recipes (id, user_id, data) VALUES
    (recipe_id || '-tester', tester_id, '{}'::JSONB),
    (recipe_id || '-ads', ads_id, '{}'::JSONB);
  INSERT INTO public.planner (id, user_id, day_key, data)
    VALUES ('rls-audit-plan-' || admin_id::TEXT, admin_id, 'audit', '{}'::JSONB);
  INSERT INTO public.goals (id, user_id, data)
    VALUES ('rls-audit-goals-' || admin_id::TEXT, admin_id, '{}'::JSONB);

  FOR actor, actor_role IN
    SELECT * FROM (VALUES (tester_id, 'Tester'), (ads_id, 'UserWithAdvertisement')) AS actors(id, role)
  LOOP
    PERFORM set_config('request.jwt.claim.sub', actor::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', actor, 'role', 'authenticated')::TEXT, true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = actor AND role = actor_role)
      OR EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = admin_id)
      OR NOT EXISTS (SELECT 1 FROM public.products WHERE id = product_id)
      OR NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id)
      OR NOT EXISTS (SELECT 1 FROM public.recipes WHERE id =
        CASE WHEN actor = tester_id THEN recipe_id || '-tester' ELSE recipe_id || '-ads' END)
      OR EXISTS (SELECT 1 FROM public.recipes WHERE id =
        CASE WHEN actor = tester_id THEN recipe_id || '-ads' ELSE recipe_id || '-tester' END) THEN
      RAISE EXCEPTION 'Incorrect SELECT visibility for %', actor_role;
    END IF;

    denied := false;
    BEGIN
      INSERT INTO public.products (id, name_english) VALUES (product_id || actor::TEXT, 'forbidden');
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could insert a product', actor_role; END IF;

    denied := false;
    BEGIN
      INSERT INTO public.recipes (id, user_id, data)
        VALUES (recipe_id || actor::TEXT, actor, '{}'::JSONB);
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could insert a recipe', actor_role; END IF;

    UPDATE public.products SET name_english = 'forbidden' WHERE id = product_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could update a product', actor_role; END IF;
    DELETE FROM public.products WHERE id = product_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could delete a product', actor_role; END IF;
    UPDATE public.recipes SET data = '{"forbidden":true}'::JSONB WHERE id = recipe_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could update a recipe', actor_role; END IF;
    DELETE FROM public.recipes WHERE id = recipe_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could delete a recipe', actor_role; END IF;

    denied := false;
    BEGIN
      UPDATE public.user_profiles SET role = 'Admin' WHERE user_id = actor;
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could update profile roles directly', actor_role; END IF;
    denied := false;
    BEGIN
      PERFORM public.admin_set_user_role(actor, 'Admin');
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could promote through the admin RPC', actor_role; END IF;

    IF EXISTS (SELECT 1 FROM public.planner WHERE user_id = admin_id)
      OR EXISTS (SELECT 1 FROM public.goals WHERE user_id = admin_id) THEN
      RAISE EXCEPTION '% could read another user''s data', actor_role;
    END IF;
    denied := false;
    BEGIN
      INSERT INTO public.planner (id, user_id, day_key, data)
        VALUES ('rls-audit-foreign-' || actor::TEXT, admin_id, 'audit', '{}'::JSONB);
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could insert another user''s plan', actor_role; END IF;
    denied := false;
    BEGIN
      INSERT INTO public.goals (id, user_id, data)
        VALUES ('rls-audit-foreign-' || actor::TEXT, admin_id, '{}'::JSONB);
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could insert another user''s goals', actor_role; END IF;
    UPDATE public.planner SET data = '{"forbidden":true}'::JSONB WHERE user_id = admin_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could update another user''s plan', actor_role; END IF;
    DELETE FROM public.planner WHERE user_id = admin_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could delete another user''s plan', actor_role; END IF;
    UPDATE public.goals SET data = '{"forbidden":true}'::JSONB WHERE user_id = admin_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could update another user''s goals', actor_role; END IF;
    DELETE FROM public.goals WHERE user_id = admin_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION '% could delete another user''s goals', actor_role; END IF;

    own_plan := 'rls-audit-own-plan-' || actor::TEXT;
    own_goals := 'rls-audit-own-goals-' || actor::TEXT;
    INSERT INTO public.planner (id, user_id, day_key, data)
      VALUES (own_plan, actor, 'audit', '{}'::JSONB);
    INSERT INTO public.goals (id, user_id, data)
      VALUES (own_goals, actor, '{}'::JSONB);
    IF NOT EXISTS (SELECT 1 FROM public.planner WHERE id = own_plan)
      OR NOT EXISTS (SELECT 1 FROM public.goals WHERE id = own_goals) THEN
      RAISE EXCEPTION '% could not read their own records', actor_role;
    END IF;
    UPDATE public.planner SET data = '{"owned":true}'::JSONB WHERE id = own_plan;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION '% could not update their own plan', actor_role; END IF;
    UPDATE public.goals SET data = '{"owned":true}'::JSONB WHERE id = own_goals;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION '% could not update their own goals', actor_role; END IF;
    denied := false;
    BEGIN
      UPDATE public.planner SET user_id = admin_id WHERE id = own_plan;
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could transfer their plan', actor_role; END IF;
    denied := false;
    BEGIN
      UPDATE public.goals SET user_id = admin_id WHERE id = own_goals;
    EXCEPTION WHEN SQLSTATE '42501' THEN denied := true;
    END;
    IF NOT denied THEN RAISE EXCEPTION '% could transfer their goals', actor_role; END IF;
    DELETE FROM public.planner WHERE id = own_plan;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION '% could not delete their own plan', actor_role; END IF;
    DELETE FROM public.goals WHERE id = own_goals;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION '% could not delete their own goals', actor_role; END IF;
    EXECUTE 'RESET ROLE';
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub', admin_id::TEXT, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::TEXT, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = tester_id) THEN
    RAISE EXCEPTION 'Admin could not read another profile';
  END IF;
  PERFORM public.admin_set_user_role(tester_id, 'Admin');
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = tester_id AND role = 'Admin') THEN
    RAISE EXCEPTION 'Admin could not change another role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id || '-tester') THEN
    RAISE EXCEPTION 'Admin could not read another Admin''s shared recipe';
  END IF;
  UPDATE public.recipes SET data = '{"forbidden":true}'::JSONB WHERE id = recipe_id || '-tester';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Admin could update another user''s recipe'; END IF;
  DELETE FROM public.recipes WHERE id = recipe_id || '-tester';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Admin could delete another user''s recipe'; END IF;
  INSERT INTO public.products (id, name_english) VALUES (product_id || '-admin', 'admin');
  UPDATE public.products SET name_english = 'admin' WHERE id = product_id || '-admin';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin could not update a product'; END IF;
  DELETE FROM public.products WHERE id = product_id || '-admin';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin could not delete a product'; END IF;
  INSERT INTO public.recipes (id, user_id, data)
    VALUES (recipe_id || '-admin', admin_id, '{}'::JSONB);
  UPDATE public.recipes SET data = '{"admin":true}'::JSONB WHERE id = recipe_id || '-admin';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin could not update a recipe'; END IF;
  DELETE FROM public.recipes WHERE id = recipe_id || '-admin';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Admin could not delete a recipe'; END IF;
  EXECUTE 'RESET ROLE';

  RAISE NOTICE 'RLS verification passed for Admin, Tester and UserWithAdvertisement';
END;
$$;
ROLLBACK;
