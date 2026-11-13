-- MacroChef: Supabase / PostgreSQL schema (idempotent)

-- 1. user_profiles ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'UserWithAdvertisement'
             CHECK (role IN ('Admin', 'Tester', 'UserWithAdvertisement')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'UserWithAdvertisement')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill users registered before the trigger existed
INSERT INTO public.user_profiles (user_id, email)
SELECT u.id, COALESCE(u.email, '')
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- 2. Domain tables ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id                 TEXT PRIMARY KEY,
  name_pl            TEXT,
  name_en            TEXT,
  category           TEXT,
  category_pl        TEXT,
  category_en        TEXT,
  unit               TEXT,
  package_size       NUMERIC,
  source_url         TEXT,
  source_verified_at DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipes (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- id mirrors Dexie plannerEntries id ('plan-<uuid>'); day_key mirrors dayKey
CREATE TABLE IF NOT EXISTS public.planner (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key    TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goals (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name_pl ON public.products (name_pl);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_planner_user_day ON public.planner (user_id, day_key);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);

-- set_updated_at: server-side timestamp on every INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'recipes', 'planner', 'goals'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- 3. Role helper (SECURITY DEFINER avoids RLS recursion on user_profiles) ---
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

-- 4. Row Level Security ----------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals         ENABLE ROW LEVEL SECURITY;

-- user_profiles: read own row only; no client write path (role is immutable for clients)
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.user_profiles FROM anon, authenticated;

-- products: read for authenticated, write for Admin
DROP POLICY IF EXISTS products_select_authenticated ON public.products;
CREATE POLICY products_select_authenticated ON public.products
  FOR SELECT TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS products_insert_admin ON public.products;
CREATE POLICY products_insert_admin ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS products_update_admin ON public.products;
CREATE POLICY products_update_admin ON public.products
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS products_delete_admin ON public.products;
CREATE POLICY products_delete_admin ON public.products
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- recipes: read own + Admin-authored (global library); write only Admin
DROP POLICY IF EXISTS recipes_select_own_or_admin_library ON public.recipes;
CREATE POLICY recipes_select_own_or_admin_library ON public.recipes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin(user_id));

DROP POLICY IF EXISTS recipes_insert_admin ON public.recipes;
CREATE POLICY recipes_insert_admin ON public.recipes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS recipes_update_admin ON public.recipes;
CREATE POLICY recipes_update_admin ON public.recipes
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND (SELECT auth.uid()) = user_id)
  WITH CHECK (public.is_admin() AND (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS recipes_delete_admin ON public.recipes;
CREATE POLICY recipes_delete_admin ON public.recipes
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (SELECT auth.uid()) = user_id);

-- planner / goals: full access for the owner only
DROP POLICY IF EXISTS planner_owner_all ON public.planner;
CREATE POLICY planner_owner_all ON public.planner
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS goals_owner_all ON public.goals;
CREATE POLICY goals_owner_all ON public.goals
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
