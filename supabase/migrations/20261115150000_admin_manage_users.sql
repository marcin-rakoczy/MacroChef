-- Admin Panel: admins can change user roles and delete accounts through SECURITY DEFINER RPCs.
-- Direct client writes to user_profiles stay revoked; every check runs server-side.

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

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_user UUID, new_role TEXT)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.user_profiles;
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

  UPDATE public.user_profiles
  SET role = new_role
  WHERE user_id = target_user
  RETURNING * INTO updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN updated;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users' USING ERRCODE = '42501';
  END IF;
  IF target_user = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(target_user) THEN
    RAISE EXCEPTION 'Change the Admin role before deleting this account' USING ERRCODE = '42501';
  END IF;

  -- Shared recipes must survive the ON DELETE CASCADE from auth.users.
  UPDATE public.recipes SET user_id = auth.uid() WHERE user_id = target_user;

  DELETE FROM auth.users WHERE id = target_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
