-- MatchSport Nutrition Final Fix
-- Run this in Supabase SQL Editor to resolve the 'logged_at' and macro columns error

DO $$ 
BEGIN
    -- 1. Check and Rename for 'logged_at'
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'log_date') THEN
        ALTER TABLE public.nutrition_logs RENAME COLUMN log_date TO logged_at;
    ELSIF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'logged_at') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN logged_at DATE DEFAULT CURRENT_DATE;
    END IF;

    -- 2. Ensure macro columns exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'calories') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN calories INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'protein_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN protein_g NUMERIC(6,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'carbs_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN carbs_g NUMERIC(6,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'fat_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN fat_g NUMERIC(6,2) DEFAULT 0;
    END IF;

    -- 3. Ensure other required columns
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'meal_type') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN meal_type TEXT DEFAULT 'main';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'quantity_g') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN quantity_g NUMERIC(6,2) DEFAULT 100;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'raw_text') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN raw_text TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'ai_feedback') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN ai_feedback TEXT;
    END IF;

    -- 4. Ensure created_at exists for sorting if needed
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'nutrition_logs' AND column_name = 'created_at') THEN
        ALTER TABLE public.nutrition_logs ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

END $$;
