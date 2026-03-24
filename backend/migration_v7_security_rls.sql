-- ============================================================
-- MatchSport Security Migration v7 - Row Level Security (RLS)
-- ============================================================

-- 1. Define Helper Function for Admin Check (Always needed for the policies below)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if users table exists before querying
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
      RETURN (
        SELECT role IN ('admin', 'superadmin') 
        FROM public.users 
        WHERE id = auth.uid()
      );
  ELSE
      RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Resilient Policy Application Function
-- This function checks if a table exists before enabling RLS and adding policies.
DO $$ 
BEGIN
    -- --- USERS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins have full access to users" ON public.users;
        DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.users;
        DROP POLICY IF EXISTS "Users can update limited profile info" ON public.users;
        CREATE POLICY "Admins have full access to users" ON public.users FOR ALL TO authenticated USING (public.is_admin());
        CREATE POLICY "Users can view and update their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update limited profile info" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;

    -- --- MEMBERSHIPS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memberships') THEN
        ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins have full access to memberships" ON public.memberships;
        DROP POLICY IF EXISTS "Users can view their own memberships" ON public.memberships;
        CREATE POLICY "Admins have full access to memberships" ON public.memberships FOR ALL TO authenticated USING (public.is_admin());
        CREATE POLICY "Users can view their own memberships" ON public.memberships FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- --- QR CODES ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_codes') THEN
        ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can manage their own QR codes" ON public.qr_codes;
        DROP POLICY IF EXISTS "Admins have full access to QR codes" ON public.qr_codes;
        CREATE POLICY "Users can manage their own QR codes" ON public.qr_codes FOR ALL USING (auth.uid() = user_id);
        CREATE POLICY "Admins have full access to QR codes" ON public.qr_codes FOR ALL TO authenticated USING (public.is_admin());
    END IF;

    -- --- CHECK-INS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'check_ins') THEN
        ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view their own check-ins" ON public.check_ins;
        DROP POLICY IF EXISTS "Admins have full access to check-ins" ON public.check_ins;
        CREATE POLICY "Users can view their own check-ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Admins have full access to check-ins" ON public.check_ins FOR ALL TO authenticated USING (public.is_admin());
    END IF;

    -- --- GYM OCCUPANCY ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'gym_occupancy') THEN
        ALTER TABLE public.gym_occupancy ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Anyone can view occupancy" ON public.gym_occupancy;
        DROP POLICY IF EXISTS "Admins can update occupancy" ON public.gym_occupancy;
        CREATE POLICY "Anyone can view occupancy" ON public.gym_occupancy FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admins can update occupancy" ON public.gym_occupancy FOR ALL TO authenticated USING (public.is_admin());
    END IF;

    -- --- PR RECORDS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pr_records') THEN
        ALTER TABLE public.pr_records ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Manage own PRs" ON public.pr_records;
        DROP POLICY IF EXISTS "Admins view all PRs/Measurements" ON public.pr_records;
        CREATE POLICY "Manage own PRs" ON public.pr_records FOR ALL USING (auth.uid() = user_id);
        CREATE POLICY "Admins view all PRs/Measurements" ON public.pr_records FOR SELECT TO authenticated USING (public.is_admin());
    END IF;

    -- --- BODY MEASUREMENTS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'body_measurements') THEN
        ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Manage own measurements" ON public.body_measurements;
        DROP POLICY IF EXISTS "Admins view all measurements" ON public.body_measurements;
        CREATE POLICY "Manage own measurements" ON public.body_measurements FOR ALL USING (auth.uid() = user_id);
        CREATE POLICY "Admins view all measurements" ON public.body_measurements FOR SELECT TO authenticated USING (public.is_admin());
    END IF;

    -- --- ANNOUNCEMENTS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
        ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Everyone can read announcements" ON public.announcements;
        DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
        CREATE POLICY "Everyone can read announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
        CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.is_admin());
    END IF;

    -- --- NOTIFICATIONS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
        CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
    END IF;

    -- --- INSTALLMENTS ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'installments') THEN
        ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users view own installments" ON public.installments;
        DROP POLICY IF EXISTS "Admins manage installments" ON public.installments;
        CREATE POLICY "Users view own installments" ON public.installments FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Admins manage installments" ON public.installments FOR ALL TO authenticated USING (public.is_admin());
    END IF;

    -- --- LEADERBOARD ---
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leaderboard') THEN
        ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Everyone reads leaderboard" ON public.leaderboard;
        CREATE POLICY "Everyone reads leaderboard" ON public.leaderboard FOR SELECT TO authenticated USING (true);
    END IF;

END $$;

