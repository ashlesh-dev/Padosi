-- =====================================================================
-- Migration: Add EMERGENCY_ALERT to the post_type CHECK constraint
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- Drop the old constraint that only allowed 4 post types
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_post_type;

-- Re-create it with EMERGENCY_ALERT included
ALTER TABLE posts ADD CONSTRAINT chk_post_type
  CHECK (post_type IN ('GENERAL', 'QUESTION', 'RECOMMENDATION', 'ANNOUNCEMENT', 'EMERGENCY_ALERT'));
