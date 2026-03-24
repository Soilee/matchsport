-- ============================================================
-- MatchSport Schema Finalization v9 - Missing Tables & RLS
-- ============================================================

-- 1. APP CONFIG TABLE (For Maintenance Mode & Global Settings)
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER MANUAL WORKOUTS (Personal custom workouts)
CREATE TABLE IF NOT EXISTS public.user_manual_workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workout_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WORKOUT COMPLETIONS (Streak tracking)
CREATE TABLE IF NOT EXISTS public.workout_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workout_day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL,
    completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, completed_at)
);

-- 4. DAILY TASKS (Gamification)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NUTRITION LOGS (Manual entry)
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    calories INTEGER,
    protein_g NUMERIC(5,2),
    carbs_g NUMERIC(5,2),
    fats_g NUMERIC(5,2),
    logged_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- RLS POLICIES FOR NEW TABLES ---

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_manual_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- App Config: Public read, Admin write
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read app_config" ON public.app_config;
    DROP POLICY IF EXISTS "Admin manage app_config" ON public.app_config;
    CREATE POLICY "Public read app_config" ON public.app_config FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Admin manage app_config" ON public.app_config FOR ALL TO authenticated USING (public.is_admin());
END $$;

-- User Manual Workouts: Owner manage
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own manual workouts" ON public.user_manual_workouts;
    CREATE POLICY "Users manage own manual workouts" ON public.user_manual_workouts FOR ALL USING (auth.uid() = user_id);
END $$;

-- Workout Completions: Owner manage
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own completions" ON public.workout_completions;
    CREATE POLICY "Users manage own completions" ON public.workout_completions FOR ALL USING (auth.uid() = user_id);
END $$;

-- Daily Tasks: Public read, completion is user-specific (might need a junction table for true multi-user tasks, but keeping it simple for now as per existing logic)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users view tasks" ON public.daily_tasks;
    CREATE POLICY "Users view tasks" ON public.daily_tasks FOR SELECT TO authenticated USING (true);
END $$;

-- Nutrition Logs: Owner manage
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users manage own nutrition" ON public.nutrition_logs;
    CREATE POLICY "Users manage own nutrition" ON public.nutrition_logs FOR ALL USING (auth.uid() = user_id);
END $$;

-- --- INDEXES FOR NEW TABLES ---
CREATE INDEX IF NOT EXISTS idx_manual_workouts_user ON public.user_manual_workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON public.workout_completions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_logs(user_id, logged_at);
