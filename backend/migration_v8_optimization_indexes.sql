-- ============================================================
-- MatchSport Optimization Migration v8 - Database Indexing
-- ============================================================

-- This script uses DO blocks to check for table existence before creating indexes,
-- ensuring it runs without errors even if some tables are missing.

DO $$ 
BEGIN
    -- 1. Indexing Foreign Keys
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_codes') THEN CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON public.qr_codes(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins') THEN CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_programs') THEN CREATE INDEX IF NOT EXISTS idx_workout_programs_user_id ON public.workout_programs(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_days') THEN CREATE INDEX IF NOT EXISTS idx_workout_days_program_id ON public.workout_days(program_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_exercises') THEN CREATE INDEX IF NOT EXISTS idx_workout_exercises_day_id ON public.workout_exercises(workout_day_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pr_records') THEN CREATE INDEX IF NOT EXISTS idx_pr_records_user_id ON public.pr_records(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'body_measurements') THEN CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON public.body_measurements(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diet_plans') THEN CREATE INDEX IF NOT EXISTS idx_diet_plans_user_id ON public.diet_plans(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'installments') THEN CREATE INDEX IF NOT EXISTS idx_installments_user_id ON public.installments(user_id); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_logs') THEN CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON public.workout_logs(user_id); END IF;

    -- 2. Indexing Filter/Sort Columns
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.memberships(status); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(end_date); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins') THEN CREATE INDEX IF NOT EXISTS idx_check_ins_check_out_time ON public.check_ins(check_out_time); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON public.announcements(is_active); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON public.announcements(publish_at); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workout_logs') THEN CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON public.workout_logs(workout_date); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read); END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gym_occupancy') THEN CREATE INDEX IF NOT EXISTS idx_gym_occupancy_recorded_at ON public.gym_occupancy(recorded_at); END IF;

    -- 3. Composite Indexes
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN CREATE INDEX IF NOT EXISTS idx_memberships_active_expiry ON public.memberships(user_id, status, end_date); END IF;

END $$;
