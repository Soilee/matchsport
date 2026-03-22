-- ============================================================
-- MatchSport Performance Optimizations
-- Run this in Supabase SQL Editor
-- ============================================================

-- Composite index for rapid filtering of active / expired members
CREATE INDEX IF NOT EXISTS idx_memberships_filter 
ON memberships(user_id, status, end_date);

-- Index for remaining_days if used in sorting/filtering often
CREATE INDEX IF NOT EXISTS idx_memberships_remaining 
ON memberships(remaining_days);

-- Ensure user role is indexed for faster dashboard statistics
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- Index for payment statuses
CREATE INDEX IF NOT EXISTS idx_payments_status_date 
ON payments(status, payment_date DESC);
