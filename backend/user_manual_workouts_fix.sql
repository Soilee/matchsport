-- ============================================================
-- MatchSport Database Fix - UUID & Table Stability
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure the tables use the built-in gen_random_uuid() if extension is missing
ALTER TABLE IF EXISTS user_manual_workouts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE IF EXISTS workout_logs 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Fix potential column name mismatch in workout_logs 
-- If the table was created with 'logged_at' but code expects 'workout_date' or vice-versa
-- The code in routes.js currently fetches using 'workout_date' around line 246
-- But the schema in realtime_updates.sql uses 'logged_at'
-- Let's make it consistent. I'll add 'workout_date' as a computed or alias if possible, 
-- or just rename/add the column. 
-- For simplicity and compatibility with existing code:
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workout_logs' AND column_name='workout_date') THEN
        ALTER TABLE workout_logs ADD COLUMN workout_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 3. Ensure RLS is handled
ALTER TABLE user_manual_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own manual workouts" ON user_manual_workouts;
CREATE POLICY "Users can manage their own manual workouts" ON user_manual_workouts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own workout logs" ON workout_logs;
CREATE POLICY "Users can manage their own workout logs" ON workout_logs FOR ALL USING (auth.uid() = user_id);
