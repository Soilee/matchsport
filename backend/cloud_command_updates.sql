-- CLOUD COMMAND SCHEMA UPDATES

-- 1. DAILY TASKS (Defined by Admin)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 10,
  category TEXT CHECK (category IN ('water', 'steps', 'workout', 'nutrition', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USER TASKS (Completion tracking)
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, task_id, date)
);

-- 3. LEADERBOARD ENHANCEMENTS (PR based ranking)
-- We already have leaderboard table, adding automatic PR linkage
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS total_pr_score NUMERIC(10, 2) DEFAULT 0;

-- 4. REAL-TIME PUBLICATION (Enable for specific tables)
-- In Supabase dashboard, Admin must enable 'Realtime' for: user_tasks, diet_plans, workout_programs
