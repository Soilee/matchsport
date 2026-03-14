-- ============================================================
-- MatchSport Migration V4 - Robust Realtime & Identity Fix
-- Run this in Supabase SQL Editor
-- ============================================================

-- Fix for "Relation already member of publication" error
-- We use a safe way to ensure 'memberships' is in the publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'memberships'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE memberships;
    END IF;
END $$;

-- CRITICAL: Set REPLICA IDENTITY to FULL for memberships
-- This ensures that the 'user_id' is included in the WAL for every update
-- Otherwise, Supabase Realtime filters (filter: user_id=eq.ID) might not catch all updates
ALTER TABLE memberships REPLICA IDENTITY FULL;

-- Also set it for other key tables to be safe
ALTER TABLE gym_occupancy REPLICA IDENTITY FULL;
ALTER TABLE diet_plans REPLICA IDENTITY FULL;
ALTER TABLE nutrition_logs REPLICA IDENTITY FULL;

-- Ensure audit_logs is tracked too
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
    END IF;
END $$;
