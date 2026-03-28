-- MatchSport Nutrition Macros Fix
-- Run this in Supabase SQL Editor to fix the missing columns error

DO $$ 
BEGIN
    -- 1. Fix nutrition_logs table columns
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'calories') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN calories INTEGER;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'protein_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN protein_g NUMERIC(6,2);
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'carbs_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN carbs_g NUMERIC(6,2);
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'fat_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN fat_g NUMERIC(6,2);
    END IF;

    -- 2. Ensure meal_type exists (for AI logging)
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'meal_type') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN meal_type TEXT DEFAULT 'main';
    END IF;

    -- 3. Ensure quantity_g exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'quantity_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN quantity_g NUMERIC(6,2) DEFAULT 100;
    END IF;

    -- 4. Ensure raw_text and ai_feedback exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'raw_text') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN raw_text TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'ai_feedback') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN ai_feedback TEXT;
    END IF;

END $$;
