-- Run this once in the Supabase SQL Editor for the existing Padosi database.
-- The application reads and writes these tables through the Spring Boot API.
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS handle varchar(40);

-- Assign existing accounts a unique, searchable handle based on name and user ID.
UPDATE users
SET handle = left(
  coalesce(nullif(trim(both '-' from regexp_replace(lower(full_name), '[^a-z0-9]+', '-', 'g')), ''), 'neighbor'),
  18
) || '-' || id::text
WHERE handle IS NULL OR btrim(handle) = '';

ALTER TABLE users ALTER COLUMN handle SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_handle ON users (lower(handle));

ALTER TABLE posts ADD COLUMN IF NOT EXISTS category varchar(40) NOT NULL DEFAULT 'None';
ALTER TABLE posts ALTER COLUMN category SET DEFAULT 'None';

-- Earlier versions stored "General" as a place category; that is now no tag.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_posts_category;
UPDATE posts SET category = 'None' WHERE category = 'General';
ALTER TABLE posts ADD CONSTRAINT chk_posts_category CHECK (
  category IN ('None', 'Restaurant', 'Grocery Store', 'Barber / Salon',
               'Medical / Pharmacy', 'Dance Studio', 'Services', 'Events')
);

-- Match the four post types exposed by the creation form.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS chk_post_type;
ALTER TABLE posts ADD CONSTRAINT chk_post_type CHECK (
  post_type IN ('GENERAL', 'QUESTION', 'RECOMMENDATION', 'ANNOUNCEMENT')
);

-- Trigram indexes keep contains-search responsive as the feed grows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_posts_content_trgm ON posts USING gin (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_category_trgm ON posts USING gin (category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_handle_trgm ON users USING gin (handle gin_trgm_ops);

COMMIT;
