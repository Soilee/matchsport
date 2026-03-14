-- MatchSport Supabase Table Definitions
-- PostgreSQL (Supabase) version of the MatchSport schema

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('member', 'trainer', 'admin')) DEFAULT 'member',
  profile_photo_url TEXT,
  birth_date DATE,
  kvkk_mask BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBERSHIPS TABLE
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  remaining_days INTEGER NOT NULL,
  status TEXT CHECK (status IN ('active', 'grace', 'expired', 'frozen')) DEFAULT 'active',
  grace_days_remaining INTEGER DEFAULT 7,
  amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR CODES TABLE
CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- CHECK-INS TABLE
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES qr_codes(id),
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  duration_minutes INTEGER
);

-- GYM OCCUPANCY TABLE
CREATE TABLE gym_occupancy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_count INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 100,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  hour_of_day INTEGER CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week TEXT CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'))
);

-- EXERCISES TABLE
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  instructions TEXT,
  image_url TEXT
);

-- WORKOUT PROGRAMS TABLE
CREATE TABLE workout_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  program_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKOUT DAYS TABLE
CREATE TABLE workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  day_of_week TEXT CHECK (day_of_week IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
  muscle_group TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- WORKOUT EXERCISES TABLE
CREATE TABLE workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id UUID NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  sets INTEGER DEFAULT 3,
  reps INTEGER DEFAULT 10,
  weight_kg NUMERIC(6, 2),
  rest_seconds INTEGER DEFAULT 90,
  order_index INTEGER DEFAULT 0
);

-- PR RECORDS TABLE
CREATE TABLE pr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  max_weight_kg NUMERIC(6, 2) NOT NULL,
  reps INTEGER DEFAULT 1,
  achieved_at DATE NOT NULL,
  notes TEXT
);

-- BODY MEASUREMENTS TABLE
CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2),
  body_fat_pct NUMERIC(4, 1),
  chest_cm NUMERIC(5, 1),
  waist_cm NUMERIC(5, 1),
  arm_cm NUMERIC(4, 1),
  leg_cm NUMERIC(4, 1),
  measured_at DATE NOT NULL
);

-- DIET PLANS TABLE
CREATE TABLE diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  plan_name TEXT NOT NULL,
  description TEXT,
  meals JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ANNOUNCEMENTS TABLE
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT CHECK (type IN ('campaign', 'schedule', 'general')) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  publish_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- LEADERBOARD TABLE
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_visits INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  month_year TEXT NOT NULL,
  category TEXT DEFAULT 'attendance'
);

-- BADGES TABLE
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_type TEXT,
  type TEXT CHECK (type IN ('strength', 'consistency', 'time', 'milestone'))
);

-- USER BADGES TABLE
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT CHECK (type IN ('workout_reminder', 'payment', 'announcement')) DEFAULT 'announcement',
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
