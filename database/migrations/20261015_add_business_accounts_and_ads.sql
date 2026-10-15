-- =====================================================================
-- MIGRATION: Business / Professional Accounts + Ad Post Support
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Date: 2026-10-15
-- =====================================================================

-- ── 1. Extend users table with business-profile columns ────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type     varchar(20)  NOT NULL DEFAULT 'PERSONAL',
  ADD COLUMN IF NOT EXISTS company_name     varchar(120),
  ADD COLUMN IF NOT EXISTS business_category varchar(80),
  ADD COLUMN IF NOT EXISTS business_bio     varchar(800),
  ADD COLUMN IF NOT EXISTS business_contact varchar(255),  -- phone / website / email
  ADD COLUMN IF NOT EXISTS business_website varchar(255);

-- Constraint: PERSONAL | BUSINESS
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_account_type;
ALTER TABLE users
  ADD CONSTRAINT chk_users_account_type
    CHECK (account_type IN ('PERSONAL', 'BUSINESS'));

-- ── 2. Extend posts table with ad-post columns ──────────────────────────────────

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_ad            boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ad_radius_km     smallint,             -- 1 | 5 | 10
  ADD COLUMN IF NOT EXISTS ad_duration_days smallint,             -- 7 | 14 | 30
  ADD COLUMN IF NOT EXISTS ad_expires_at    timestamptz;          -- computed at insert

-- Constraint on radius options
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS chk_posts_ad_radius;
ALTER TABLE posts
  ADD CONSTRAINT chk_posts_ad_radius
    CHECK (ad_radius_km IS NULL OR ad_radius_km IN (1, 5, 10));

-- Constraint on duration options
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS chk_posts_ad_duration;
ALTER TABLE posts
  ADD CONSTRAINT chk_posts_ad_duration
    CHECK (ad_duration_days IS NULL OR ad_duration_days IN (7, 14, 30));

-- Index for fast expiry-based filtering in the feed
CREATE INDEX IF NOT EXISTS idx_posts_ad_expires ON posts (is_ad, ad_expires_at)
  WHERE is_ad = true;

-- ── 3. Enable RLS on new columns (inherited by existing policies) ───────────────
-- No new tables, so nothing extra needed. Existing RLS policies cover the table.

-- ── 4. Back-fill existing rows (no-ops on already-defaulted columns) ────────────
UPDATE posts
  SET is_ad = false
  WHERE is_ad IS NULL;

-- Done.
SELECT 'Migration 20261015_add_business_accounts_and_ads applied successfully.' AS status;
