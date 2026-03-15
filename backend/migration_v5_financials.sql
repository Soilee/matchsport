-- ============================================================
-- MatchSport Migration V5 - Financials & Turnstiles
-- ============================================================

-- 1. INSTALLMENTS TABLE (More robust version)
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

-- 2. MEMBERSHIPS ENHANCEMENTS
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS last_expiry_notification DATE;
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 3. APP CONFIG TABLE
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value) 
VALUES ('turnstile_maintenance', '{"enabled": false, "message": "Turnike sistemi şu an bakımdadır."}')
ON CONFLICT (key) DO NOTHING;

-- 4. TURNSTILE LOGS (Check-ins with more info)
-- Already have check_ins table, but we might want a view or just use it.
-- We'll ensure it's tracked in realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;

-- 5. FUNCTION TO AUTO-SET OVERDUE STATUS
CREATE OR REPLACE FUNCTION fn_update_installment_status()
RETURNS void AS $$
BEGIN
    UPDATE installments
    SET status = 'overdue'
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_installments_user ON installments(user_id);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date);
