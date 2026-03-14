-- FIX PAYMENTS TABLE SCHEMA
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash_full';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_price NUMERIC(10, 2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- ENSURE STATUS CONSTRAINT INCLUDES 'completed', 'pending', 'failed'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'failed'));
