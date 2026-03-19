-- ============================================================
-- MatchSport Migration V6 - Enhanced Progress & Installments
-- ============================================================

-- 1. ENHANCE BODY MEASUREMENTS
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS shoulder_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS bicep_cm NUMERIC(5, 1); -- vkol
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS neck_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS thigh_cm NUMERIC(5, 1);
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS hips_cm NUMERIC(5, 1);

-- 2. ENSURE AUDIT LOGS ARE READY
-- (Already exists, but ensuring we use clear actions)
-- Actions to be used: 'INSTALLMENT_PAID', 'BODY_MEASUREMENT_ADDED'

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_status_user ON installments(status, user_id);
