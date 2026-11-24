-- Rename legacy localized product columns without copying or dropping data.
-- Coordinate this change with client deployment; older clients use the old names.
BEGIN;

DO $$
DECLARE
  old_name TEXT;
  new_name TEXT;
  old_exists BOOLEAN;
  new_exists BOOLEAN;
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'public.products does not exist';
  END IF;

  FOR old_name, new_name IN
    SELECT * FROM (VALUES
      ('name_pl', 'name_polish'),
      ('name_en', 'name_english'),
      ('category_pl', 'category_polish'),
      ('category_en', 'category_english')
    ) AS names(old_name, new_name)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = old_name
    ), EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = new_name
    ) INTO old_exists, new_exists;

    IF old_exists AND new_exists THEN
      RAISE EXCEPTION 'Both public.products.% and public.products.% exist; resolve the collision before migrating',
        old_name, new_name;
    ELSIF old_exists THEN
      EXECUTE format('ALTER TABLE public.products RENAME COLUMN %I TO %I', old_name, new_name);
    ELSIF NOT new_exists THEN
      RAISE EXCEPTION 'Neither public.products.% nor public.products.% exists', old_name, new_name;
    END IF;
  END LOOP;

  IF to_regclass('public.idx_products_name_pl') IS NOT NULL THEN
    IF to_regclass('public.idx_products_name_polish') IS NOT NULL THEN
      RAISE EXCEPTION 'Both legacy and renamed product name indexes exist';
    END IF;
    ALTER INDEX public.idx_products_name_pl RENAME TO idx_products_name_polish;
  END IF;
END $$;

COMMIT;
