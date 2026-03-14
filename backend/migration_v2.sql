-- ============================================================
-- MatchSport Migration V2 - Consolidated Schema & Triggers
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. SCHEMA REPAIRS: Add 'superadmin' role, fix constraints
-- ============================================================

-- Drop old constraint and re-add with superadmin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('member', 'trainer', 'admin', 'superadmin'));

-- Add package_type to memberships if missing
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS package_type 
  TEXT CHECK (package_type IN ('1_month', '3_months', '6_months', '12_months'));

-- Add payment_date column alias (already has created_at, but explicit is better)
-- Ensure amount exists on memberships
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);


-- ============================================================
-- 2. PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'eft')) DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  package_type TEXT CHECK (package_type IN ('1_month', '3_months', '6_months', '12_months')),
  processed_by UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 3. AUDIT LOGS TABLE  
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);


-- ============================================================
-- 4. TRIGGER: Auto-extend membership on completed payment
-- ============================================================

CREATE OR REPLACE FUNCTION fn_extend_membership_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_months INTEGER;
  v_membership RECORD;
  v_new_end DATE;
  v_remaining INTEGER;
  v_base_date DATE;
BEGIN
  -- Only fire on completed payments
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Determine months from package_type  
  v_months := CASE NEW.package_type
    WHEN '1_month'   THEN 1
    WHEN '3_months'  THEN 3
    WHEN '6_months'  THEN 6
    WHEN '12_months' THEN 12
    ELSE 1  -- default 1 month
  END;

  -- Get current active membership for the user
  SELECT * INTO v_membership 
  FROM memberships 
  WHERE user_id = NEW.user_id 
  ORDER BY end_date DESC 
  LIMIT 1;

  IF v_membership IS NOT NULL THEN
    -- If existing membership, extend from the later of end_date or today
    v_base_date := GREATEST(v_membership.end_date, CURRENT_DATE);
    v_new_end := v_base_date + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    UPDATE memberships 
    SET 
      end_date = v_new_end,
      remaining_days = v_remaining,
      status = 'active',
      package_type = NEW.package_type,
      amount = COALESCE(amount, 0) + NEW.amount
    WHERE id = v_membership.id;

    -- Link payment to membership
    NEW.membership_id := v_membership.id;
  ELSE
    -- Create new membership
    v_new_end := CURRENT_DATE + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    INSERT INTO memberships (user_id, start_date, end_date, total_days, remaining_days, status, package_type, amount)
    VALUES (NEW.user_id, CURRENT_DATE, v_new_end, v_remaining, v_remaining, 'active', NEW.package_type, NEW.amount)
    RETURNING id INTO NEW.membership_id;
  END IF;

  -- Auto-log to audit
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
      'remaining_days', v_remaining
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_payment_completed ON payments;
CREATE TRIGGER trg_payment_completed
  BEFORE INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_extend_membership_on_payment();


-- ============================================================
-- 5. AUDIT TRIGGER: Auto-log user changes
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (action, target_id, details)
    VALUES ('USER_CREATED', NEW.id, jsonb_build_object('full_name', NEW.full_name, 'role', NEW.role, 'email', NEW.email));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, target_id, details)
    VALUES ('USER_UPDATED', NEW.id, jsonb_build_object(
      'old_role', OLD.role, 'new_role', NEW.role,
      'old_name', OLD.full_name, 'new_name', NEW.full_name
    ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (action, target_id, details)
    VALUES ('USER_DELETED', OLD.id, jsonb_build_object('full_name', OLD.full_name, 'email', OLD.email));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_users ON users;
CREATE TRIGGER trg_audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_user_changes();


-- ============================================================
-- 6. AUDIT TRIGGER: Auto-log membership changes
-- ============================================================

CREATE OR REPLACE FUNCTION fn_audit_membership_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (action, target_id, details)
    VALUES ('MEMBERSHIP_UPDATED', NEW.user_id, jsonb_build_object(
      'old_status', OLD.status, 'new_status', NEW.status,
      'old_end_date', OLD.end_date, 'new_end_date', NEW.end_date,
      'old_remaining', OLD.remaining_days, 'new_remaining', NEW.remaining_days
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_memberships ON memberships;
CREATE TRIGGER trg_audit_memberships
  AFTER UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION fn_audit_membership_changes();


-- ============================================================
-- 7. FINANCIAL VIEWS
-- ============================================================

-- Monthly Revenue View
CREATE OR REPLACE VIEW vw_monthly_revenue AS
SELECT 
  date_trunc('month', payment_date)::DATE AS month,
  SUM(amount) AS total_revenue,
  COUNT(*) AS transaction_count,
  SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) AS cash_revenue,
  SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) AS card_revenue,
  SUM(CASE WHEN payment_method IN ('bank_transfer', 'eft') THEN amount ELSE 0 END) AS transfer_revenue
FROM payments
WHERE status = 'completed'
GROUP BY 1
ORDER BY 1 DESC;

-- Current Month Earnings
CREATE OR REPLACE VIEW vw_current_month_earnings AS
SELECT
  COALESCE(SUM(amount), 0) AS total_earnings,
  COUNT(*) AS payment_count,
  COALESCE(AVG(amount), 0) AS avg_payment
FROM payments
WHERE status = 'completed'
  AND date_trunc('month', payment_date) = date_trunc('month', CURRENT_DATE);

-- Pending / Expected Payments (members whose membership is expiring soon or expired)
CREATE OR REPLACE VIEW vw_pending_payments AS
SELECT 
  u.id AS user_id,
  u.full_name,
  u.email,
  u.phone,
  m.end_date,
  m.remaining_days,
  m.package_type,
  m.status AS membership_status,
  CASE 
    WHEN m.remaining_days <= 0 THEN 'expired'
    WHEN m.remaining_days <= 7 THEN 'expiring_soon'
    ELSE 'active'
  END AS urgency
FROM users u
JOIN memberships m ON u.id = m.user_id
WHERE m.remaining_days <= 7 OR m.status IN ('expired', 'grace')
ORDER BY m.remaining_days ASC;

-- Active Occupancy (people currently in the gym)
CREATE OR REPLACE VIEW vw_active_occupancy AS
SELECT COUNT(*) AS current_count
FROM check_ins
WHERE check_out_time IS NULL;


-- ============================================================
-- 8. SUPERADMIN CREATION SCRIPT
-- ============================================================

-- Password: SuperAdmin2026! (bcrypt hash)
-- IMPORTANT: Change this password after first login!
INSERT INTO users (full_name, nickname, email, phone, password_hash, role)
VALUES (
  'Super Admin',
  'Boss',
  'superadmin@matchsport.com',
  '5551234567',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: SuperAdmin2026!
  'superadmin'
)
ON CONFLICT (email) DO UPDATE SET role = 'superadmin';


-- ============================================================
-- 9. ENABLE REALTIME FOR NEW TABLES
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;


-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================================
