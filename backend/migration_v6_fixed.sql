-- ============================================================
-- MatchSport Migration V6 (FIXED) - Enhanced Progress & Installments
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- 1. ENSURE INSTALLMENTS TABLE EXISTS (In case V5 was skipped)
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENHANCE BODY MEASUREMENTS
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS shoulder_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS bicep_cm NUMERIC(5, 1); -- vkol
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS neck_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS hips_cm NUMERIC(5, 1);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_status_user ON installments(status, user_id);
CREATE INDEX IF NOT EXISTS idx_installments_user ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date);

-- 4. MEMBERSHIP ENHANCEMENTS (In case V5 was skipped)
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS last_expiry_notification DATE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 5. REALTIME ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE installments;
