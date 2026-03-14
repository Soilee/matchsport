-- ENTERPRISE SCHEMA UPDATES

-- 1. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES users(id), -- Admin/Trainer who took the payment
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed'
);

-- 2. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- e.g., 'SUSPEND_MEMBER', 'APPROVE_PAYMENT', 'EXTEND_MEMBERSHIP'
  actor_id UUID REFERENCES users(id), -- Who did it
  target_id UUID REFERENCES users(id), -- To whom
  details JSONB, -- Previous state vs New state
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UPDATES TO MEMBERSHIPS (Adding package types)
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS package_type TEXT CHECK (package_type IN ('1 Month', '3 Months', '6 Months', '12 Months'));

-- 4. VIEW FOR FINANCIALS (Monthly Revenue)
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
  date_trunc('month', payment_date) as month,
  SUM(amount) as total_revenue,
  COUNT(id) as transaction_count
FROM payments
WHERE status = 'completed'
GROUP BY 1;

-- 5. FUNCTION TO NOTIFY ON STATUS CHANGE (Real-time logic placeholder)
-- Admin Panel handles specific suspensions, DB ensures data integrity.
