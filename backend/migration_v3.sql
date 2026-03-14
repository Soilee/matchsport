-- ============================================================
-- MatchSport Migration V3 - Bug Fix, AI & Gamification
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- 1. FIX PAYMENTS & MEMBERSHIPS PACKAGE TYPE CONSTRAINT
-- Drop check constraints to allow flexible frontend dropdowns without crashing
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_package_type_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_package_type_check;

-- 2. PAYMENTS INSTALLMENT & DEBT SETTINGS
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('cash_full', 'installment')) DEFAULT 'cash_full';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0;

-- 2.1 MEMBERSHIPS DEBT TRACKING COLUMNS
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS next_payment_date DATE;

-- 3. GAMIFICATION & SYNC COLUMNS (users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_checkins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE;

-- 4. NEW TABLES: WORKOUT COMPLETIONS (for streaks)
CREATE TABLE IF NOT EXISTS workout_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_day_id UUID REFERENCES workout_days(id),
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, completed_at)
);

-- 5. NEW TABLES: AI MACRO LOGS
CREATE TABLE IF NOT EXISTS ai_macro_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  protein_g NUMERIC(6, 1) DEFAULT 0,
  carbs_g NUMERIC(6, 1) DEFAULT 0,
  fat_g NUMERIC(6, 1) DEFAULT 0,
  calories INTEGER DEFAULT 0,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.1 NUTRITION LOGS ENHANCEMENTS (For AI Free-text Logging)
ALTER TABLE nutrition_logs ALTER COLUMN food_item_id DROP NOT NULL;
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS raw_text TEXT;

-- 6. UPDATE PAYMENT TRIGGER FOR 'PENDING' -> 'COMPLETED' FLOW
CREATE OR REPLACE FUNCTION fn_extend_membership_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_months INTEGER;
  v_membership RECORD;
  v_new_end DATE;
  v_remaining INTEGER;
  v_base_date DATE;
BEGIN
  -- We only extend on completed payments
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- If this is an UPDATE and it was already completed, don't double count
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Determine months from package_type (flexible matching)
  IF NEW.package_type ILIKE '%12_month%' OR NEW.package_type ILIKE '%1_yil%' OR NEW.package_type ILIKE '%6+6%' THEN 
    v_months := 12;
  ELSIF NEW.package_type ILIKE '%6_month%' THEN 
    v_months := 6;
  ELSIF NEW.package_type ILIKE '%3_month%' THEN 
    v_months := 3;
  ELSE 
    v_months := 1;
  END IF;

  -- Get current active membership for the user
  SELECT * INTO v_membership 
  FROM memberships 
  WHERE user_id = NEW.user_id 
  ORDER BY end_date DESC 
  LIMIT 1;

  IF v_membership IS NOT NULL THEN
    v_base_date := GREATEST(v_membership.end_date, CURRENT_DATE);
    v_new_end := v_base_date + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    UPDATE memberships 
    SET 
      end_date = v_new_end,
      remaining_days = v_remaining,
      status = 'active',
      package_type = NEW.package_type,
      amount = COALESCE(amount, 0) + NEW.amount,
      -- FIX: Use NULLIF to prevent 0 from overriding previous total_price
      total_price = COALESCE(NULLIF(NEW.total_price, 0), COALESCE(total_price, 0)),
      next_payment_date = CASE 
        WHEN COALESCE(NULLIF(NEW.total_price, 0), COALESCE(total_price, 0)) > (COALESCE(amount, 0) + NEW.amount)
        THEN CURRENT_DATE + '30 days'::INTERVAL
        ELSE NULL
      END
    WHERE id = v_membership.id;

    NEW.membership_id := v_membership.id;
  ELSE
    v_new_end := CURRENT_DATE + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    INSERT INTO memberships (user_id, start_date, end_date, total_days, remaining_days, status, package_type, amount, total_price, next_payment_date)
    VALUES (
      NEW.user_id, CURRENT_DATE, v_new_end, v_months * 30, v_remaining, 'active', NEW.package_type, NEW.amount, 
      COALESCE(NULLIF(NEW.total_price, 0), NEW.amount),
      CASE WHEN COALESCE(NULLIF(NEW.total_price, 0), NEW.amount) > NEW.amount THEN CURRENT_DATE + '30 days'::INTERVAL ELSE NULL END
    )
    RETURNING id INTO NEW.membership_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (action, actor_id, target_id, details)
  VALUES (
    'PAYMENT_COMPLETED',
    NEW.processed_by,
    NEW.user_id,
    jsonb_build_object(
      'payment_id', NEW.id,
      'amount', NEW.amount,
      'package_type', NEW.package_type,
      'new_end_date', v_new_end,
      'payment_type', NEW.payment_type,
      'installments', NEW.installment_count
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace trigger to fire on UPDATE as well
DROP TRIGGER IF EXISTS trg_payment_completed ON payments;
CREATE TRIGGER trg_payment_completed
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_extend_membership_on_payment();

-- 7. DIET PLAN MACRO COLUMNS
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS protein_g NUMERIC(6, 1) DEFAULT 0;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS carbs_g NUMERIC(6, 1) DEFAULT 0;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS fat_g NUMERIC(6, 1) DEFAULT 0;
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS daily_calories INTEGER DEFAULT 0;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE workout_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_macro_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE diet_plans;
