-- ============================================================
-- MatchSport Schema Sync & Fix v10 (ULTRA ROBUST)
-- Run this in Supabase SQL Editor to resolve all 500 errors
-- ============================================================

-- 1. NUTRITION_LOGS FIXES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nutrition_logs') THEN
        CREATE TABLE public.nutrition_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            food_name TEXT,
            calories INTEGER,
            protein_g NUMERIC(6,2),
            carbs_g NUMERIC(6,2),
            fat_g NUMERIC(6,2),
            meal_type TEXT DEFAULT 'main',
            quantity_g NUMERIC(6,2) DEFAULT 100,
            raw_text TEXT,
            ai_feedback TEXT,
            logged_at DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table already exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'raw_text') THEN
            ALTER TABLE public.nutrition_logs ADD COLUMN raw_text TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'ai_feedback') THEN
            ALTER TABLE public.nutrition_logs ADD COLUMN ai_feedback TEXT;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'meal_type') THEN
            ALTER TABLE public.nutrition_logs ADD COLUMN meal_type TEXT DEFAULT 'main';
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'quantity_g') THEN
            ALTER TABLE public.nutrition_logs ADD COLUMN quantity_g NUMERIC(6,2) DEFAULT 100;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'log_date') THEN
            ALTER TABLE public.nutrition_logs RENAME COLUMN log_date TO logged_at;
        END IF;
    END IF;
END $$;

-- 2. WORKOUT_TABLES FIXES
DO $$ 
BEGIN
    -- Ensure manual workouts table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_manual_workouts') THEN
        CREATE TABLE public.user_manual_workouts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            workout_name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    -- Ensure workout_logs table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_logs') THEN
        CREATE TABLE public.workout_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            workout_id UUID REFERENCES public.user_manual_workouts(id) ON DELETE CASCADE,
            exercise_name TEXT NOT NULL,
            sets_count INTEGER DEFAULT 1,
            reps_count INTEGER DEFAULT 1,
            weight_kg NUMERIC(6,2),
            duration_minutes INTEGER,
            logged_at DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- If exists, fix columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workout_logs' AND column_name = 'duration_minutes') THEN
            ALTER TABLE public.workout_logs ADD COLUMN duration_minutes INTEGER;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workout_logs' AND column_name = 'workout_id') THEN
            ALTER TABLE public.workout_logs ADD COLUMN workout_id UUID REFERENCES public.user_manual_workouts(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workout_logs' AND column_name = 'sets_count') THEN
            ALTER TABLE public.workout_logs ADD COLUMN sets_count INTEGER DEFAULT 1;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workout_logs' AND column_name = 'reps_count') THEN
            ALTER TABLE public.workout_logs ADD COLUMN reps_count INTEGER DEFAULT 1;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'workout_logs' AND column_name = 'workout_date') THEN
            ALTER TABLE public.workout_logs RENAME COLUMN workout_date TO logged_at;
        END IF;
    END IF;

    -- Ensure workout_completions table (for streaks)
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_completions') THEN
        CREATE TABLE public.workout_completions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            workout_day_id UUID REFERENCES public.workout_days(id) ON DELETE SET NULL,
            logged_at DATE DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 3. AI_MACRO_LOGS FIXES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_macro_logs') THEN
        CREATE TABLE public.ai_macro_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            raw_text TEXT NOT NULL,
            protein_g NUMERIC(6,2),
            carbs_g NUMERIC(6,2),
            fat_g NUMERIC(6,2),
            calories INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
    
    -- Enable RLS & Apply Policies
    ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_manual_workouts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_macro_logs ENABLE ROW LEVEL SECURITY;
    
    -- Sync policies
    DROP POLICY IF EXISTS "Users manage own nutrition logs" ON public.nutrition_logs;
    CREATE POLICY "Users manage own nutrition logs" ON public.nutrition_logs FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users manage own manual workouts" ON public.user_manual_workouts;
    CREATE POLICY "Users manage own manual workouts" ON public.user_manual_workouts FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own workout logs" ON public.workout_logs;
    CREATE POLICY "Users manage own workout logs" ON public.workout_logs FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own workout completions" ON public.workout_completions;
    CREATE POLICY "Users manage own workout completions" ON public.workout_completions FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users manage own AI logs" ON public.ai_macro_logs;
    CREATE POLICY "Users manage own AI logs" ON public.ai_macro_logs FOR ALL USING (auth.uid() = user_id);
END $$;
