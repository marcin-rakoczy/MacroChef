ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS image_url VARCHAR;

UPDATE public.recipes
SET image_url = COALESCE(
      NULLIF(BTRIM(data->>'imageUrl'), ''),
      CASE
        WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('breakfast', 'śniadanie', 'sniadanie')
          THEN 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&h=900&q=85'
        WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('dinner', 'kolacja')
          THEN 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&h=900&q=85'
        WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('snack', 'przekąska', 'przekaska', 'dessert', 'deser')
          THEN 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&h=900&q=85'
        WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('lunch', 'obiad')
          THEN 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&h=900&q=85'
        ELSE 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=900&h=900&q=85'
      END
    ),
    data = jsonb_set(
      data,
      '{imageUrl}',
      to_jsonb(COALESCE(
        NULLIF(BTRIM(data->>'imageUrl'), ''),
        CASE
          WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('breakfast', 'śniadanie', 'sniadanie')
            THEN 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&h=900&q=85'
          WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('dinner', 'kolacja')
            THEN 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&h=900&q=85'
          WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('snack', 'przekąska', 'przekaska', 'dessert', 'deser')
            THEN 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&h=900&q=85'
          WHEN LOWER(COALESCE(data->'category'->>'en', data->'category'->>'pl', '')) IN ('lunch', 'obiad')
            THEN 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&h=900&q=85'
          ELSE 'https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=900&h=900&q=85'
        END
      )),
      true
    )
WHERE image_url IS NULL OR BTRIM(image_url) = '' OR
      NULLIF(BTRIM(data->>'imageUrl'), '') IS NULL;
