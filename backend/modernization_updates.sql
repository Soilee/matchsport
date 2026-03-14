-- PHASE 15: MODERNIZATION & HYBRID UPDATES

-- 1. USER MEASUREMENTS (For Progress Charts)
CREATE TABLE IF NOT EXISTS user_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who entered the data
  weight_kg NUMERIC(5, 2),
  fat_percentage NUMERIC(4, 1),
  muscle_mass_kg NUMERIC(5, 2),
  chest_cm NUMERIC(5, 1),
  waist_cm NUMERIC(5, 1),
  arm_cm NUMERIC(5, 1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ADMIN AUDIT HISTORY (Audit Logging)
CREATE TABLE IF NOT EXISTS admin_audit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id),
  target_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- e.g., 'ADD_DAYS', 'ASSIGN_DIET', 'UPDATE_MEASUREMENT'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE REALTIME
-- Note: Must be executed in Supabase Dash for full effect, but these tables should be in public publication
ALTER PUBLICATION supabase_realtime ADD TABLE user_measurements;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_audit_history;
ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
