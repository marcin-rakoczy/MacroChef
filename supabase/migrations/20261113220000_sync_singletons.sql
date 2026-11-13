-- Refuse to migrate ambiguous existing data rather than deleting it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_user_day_unique
  ON public.planner (user_id, day_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_user_unique
  ON public.goals (user_id);
