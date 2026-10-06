-- =====================================================================
-- PADOSI - Database schema (PostgreSQL 15+ on Supabase, with PostGIS)
-- Run this whole script ONCE in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================
-- Conventions
--   * Primary keys are BIGINT identity columns.
--   * All "location" columns are geography(Point, 4326) -> (longitude, latitude).
--     NOTE: PostGIS points are ordered (LONGITUDE, LATITUDE), not lat/lng!
--   * Distances in ST_DWithin on geography are in METRES (5 km = 5000).
--   * Enum-like columns are VARCHAR + CHECK (maps to @Enumerated(EnumType.STRING)).
--   * users.role has NO check constraint on purpose, so values such as
--     SOCIETY_ADMIN can be added later without changing the schema.
-- =====================================================================

-- 1. Enable PostGIS (Supabase installs extensions in the "extensions" schema,
--    which is already on the search_path of the default postgres user).
create extension if not exists postgis with schema extensions;

-- 2. Helper: automatically refresh updated_at on every UPDATE
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================================================================
-- LOCALITIES (neighbourhoods) - seeded for Andheri, Mumbai
-- =====================================================================
create table localities (
  id          bigint generated always as identity primary key,
  name        varchar(100) not null,
  city        varchar(100) not null default 'Mumbai',
  state       varchar(100) not null default 'Maharashtra',
  pincode     varchar(6),
  center      geography(Point, 4326) not null,   -- used by the manual-locality fallback
  created_at  timestamptz not null default now(),
  constraint uq_locality unique (name, city),
  constraint chk_locality_pincode check (pincode is null or pincode ~ '^[0-9]{6}$')
);
create index idx_localities_center on localities using gist (center);

-- =====================================================================
-- USERS (profile + saved location)
-- =====================================================================
create table users (
  id               bigint generated always as identity primary key,
  full_name        varchar(100) not null,
  email            varchar(255) not null,
  password_hash    varchar(100) not null,                -- BCrypt hash, never plain text
  phone            varchar(15),
  bio              varchar(500),
  avatar_url       text,                                 -- Supabase Storage public URL
  role             varchar(20)  not null default 'USER', -- USER | ADMIN (more later)
  locality_id      bigint not null references localities(id),
  location         geography(Point, 4326) not null,      -- NEVER returned to other users
  search_radius_km smallint not null default 5,          -- user's chosen radius
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_users_radius check (search_radius_km in (1, 5, 10)),
  constraint chk_users_phone check (phone is null or phone ~ '^[0-9+ -]{7,15}$')
);
-- Case-insensitive unique email
create unique index uq_users_email on users (lower(email));
create index idx_users_locality on users (locality_id);
create index idx_users_location on users using gist (location);
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

-- =====================================================================
-- POSTS (community feed + announcements) - Lost & Found and Alerts are separate
-- =====================================================================
create table posts (
  id          bigint generated always as identity primary key,
  author_id   bigint not null references users(id) on delete cascade,
  locality_id bigint not null references localities(id),
  post_type   varchar(20) not null default 'GENERAL',     -- GENERAL | ANNOUNCEMENT
  content     text not null,
  location    geography(Point, 4326) not null,            -- copied from author at creation
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_post_type check (post_type in ('GENERAL', 'ANNOUNCEMENT')),
  constraint chk_post_content check (length(trim(content)) > 0)
);
create index idx_posts_location on posts using gist (location);
create index idx_posts_author on posts (author_id);
create index idx_posts_created on posts (created_at desc);
create trigger trg_posts_updated before update on posts
  for each row execute function set_updated_at();

create table post_images (
  id            bigint generated always as identity primary key,
  post_id       bigint not null references posts(id) on delete cascade,
  image_url     text not null,
  display_order smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint uq_post_image_order unique (post_id, display_order)
);

create table comments (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references posts(id) on delete cascade,
  author_id  bigint not null references users(id) on delete cascade,
  content    varchar(1000) not null,
  created_at timestamptz not null default now(),
  constraint chk_comment_content check (length(trim(content)) > 0)
);
create index idx_comments_post on comments (post_id, created_at);
create index idx_comments_author on comments (author_id);

-- One like per user per post (composite primary key prevents duplicates)
create table post_likes (
  post_id    bigint not null references posts(id) on delete cascade,
  user_id    bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index idx_post_likes_user on post_likes (user_id);

-- =====================================================================
-- LOST & FOUND (own section, separate from the feed)
-- =====================================================================
create table lost_found_items (
  id          bigint generated always as identity primary key,
  reporter_id bigint not null references users(id) on delete cascade,
  locality_id bigint not null references localities(id),
  kind        varchar(10) not null,                       -- LOST | FOUND
  title       varchar(150) not null,
  description text,
  place_hint  varchar(200),                               -- e.g. "near Andheri station east exit"
  image_url   text,                                       -- single photo is enough here
  status      varchar(10) not null default 'OPEN',        -- OPEN | RESOLVED
  location    geography(Point, 4326) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_lf_kind check (kind in ('LOST', 'FOUND')),
  constraint chk_lf_status check (status in ('OPEN', 'RESOLVED'))
);
create index idx_lf_location on lost_found_items using gist (location);
create index idx_lf_reporter on lost_found_items (reporter_id);
create index idx_lf_status on lost_found_items (status, created_at desc);
create trigger trg_lf_updated before update on lost_found_items
  for each row execute function set_updated_at();

-- =====================================================================
-- EMERGENCY ALERTS (own section, time-limited)
-- =====================================================================
create table alerts (
  id          bigint generated always as identity primary key,
  author_id   bigint not null references users(id) on delete cascade,
  locality_id bigint not null references localities(id),
  alert_type  varchar(20) not null,                       -- MEDICAL|FIRE|SAFETY|WEATHER|UTILITY|OTHER
  severity    varchar(10) not null default 'WARNING',     -- INFO | WARNING | CRITICAL
  title       varchar(150) not null,
  description text,
  location    geography(Point, 4326) not null,
  is_active   boolean not null default true,
  expires_at  timestamptz not null,                       -- queries ignore expired alerts
  created_at  timestamptz not null default now(),
  constraint chk_alert_type check (alert_type in ('MEDICAL','FIRE','SAFETY','WEATHER','UTILITY','OTHER')),
  constraint chk_alert_severity check (severity in ('INFO','WARNING','CRITICAL')),
  constraint chk_alert_expiry check (expires_at > created_at)
);
create index idx_alerts_location on alerts using gist (location);
create index idx_alerts_author on alerts (author_id);
create index idx_alerts_expiry on alerts (is_active, expires_at);

-- =====================================================================
-- SERVICE PROVIDERS
-- Any user can optionally add ONE provider profile (1:1 with users).
-- Provider distance filtering uses the owner's users.location.
-- =====================================================================
create table service_categories (
  id         bigint generated always as identity primary key,
  name       varchar(60) not null unique,
  icon       varchar(10),                                 -- emoji used by the UI
  created_at timestamptz not null default now()
);

create table service_providers (
  id               bigint generated always as identity primary key,
  user_id          bigint not null unique references users(id) on delete cascade,
  category_id      bigint not null references service_categories(id),
  headline         varchar(100) not null,                 -- e.g. "Sketch artist - portraits"
  description      text,
  contact_phone    varchar(15),
  experience_years smallint,
  is_available     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_sp_experience check (experience_years is null or experience_years between 0 and 60)
);
create index idx_sp_category on service_providers (category_id);
create trigger trg_sp_updated before update on service_providers
  for each row execute function set_updated_at();

-- =====================================================================
-- REVIEWS (of service providers; recommendations = high-rated reviews)
-- =====================================================================
create table reviews (
  id          bigint generated always as identity primary key,
  provider_id bigint not null references service_providers(id) on delete cascade,
  reviewer_id bigint not null references users(id) on delete cascade,
  rating      smallint not null,
  comment     varchar(1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_review_rating check (rating between 1 and 5),
  constraint uq_review_once unique (provider_id, reviewer_id)   -- 1 review per user per provider
);
create index idx_reviews_reviewer on reviews (reviewer_id);
create trigger trg_reviews_updated before update on reviews
  for each row execute function set_updated_at();

-- =====================================================================
-- MARKETPLACE (second-hand listings)
-- =====================================================================
create table marketplace_listings (
  id          bigint generated always as identity primary key,
  seller_id   bigint not null references users(id) on delete cascade,
  locality_id bigint not null references localities(id),
  title       varchar(150) not null,
  description text,
  price       numeric(10,2) not null,                     -- in INR
  category    varchar(20) not null default 'OTHER',
  item_condition varchar(10) not null default 'GOOD',
  status      varchar(10) not null default 'AVAILABLE',   -- AVAILABLE | SOLD
  location    geography(Point, 4326) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_listing_price check (price >= 0),
  constraint chk_listing_category check (category in
    ('FURNITURE','ELECTRONICS','BOOKS','CLOTHING','VEHICLES','HOME','OTHER')),
  constraint chk_listing_condition check (item_condition in ('NEW','LIKE_NEW','GOOD','FAIR')),
  constraint chk_listing_status check (status in ('AVAILABLE','SOLD'))
);
create index idx_listings_location on marketplace_listings using gist (location);
create index idx_listings_seller on marketplace_listings (seller_id);
create index idx_listings_status on marketplace_listings (status, created_at desc);
create trigger trg_listings_updated before update on marketplace_listings
  for each row execute function set_updated_at();

create table listing_images (
  id            bigint generated always as identity primary key,
  listing_id    bigint not null references marketplace_listings(id) on delete cascade,
  image_url     text not null,
  display_order smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint uq_listing_image_order unique (listing_id, display_order)
);

-- Extra FK indexes (Postgres does not create these automatically)
create index idx_posts_locality on posts (locality_id);
create index idx_listings_locality on marketplace_listings (locality_id);
create index idx_alerts_locality on alerts (locality_id);
create index idx_lf_locality on lost_found_items (locality_id);

-- =====================================================================
-- SECURITY: Row Level Security
-- Supabase auto-exposes the "public" schema through its REST API. We do NOT
-- use that API. Enabling RLS with no policies blocks it completely, while
-- our Spring Boot backend (which connects as the postgres owner role)
-- is unaffected.
-- =====================================================================
alter table localities           enable row level security;
alter table users                enable row level security;
alter table posts                enable row level security;
alter table post_images          enable row level security;
alter table comments             enable row level security;
alter table post_likes           enable row level security;
alter table lost_found_items     enable row level security;
alter table alerts               enable row level security;
alter table service_categories   enable row level security;
alter table service_providers    enable row level security;
alter table reviews              enable row level security;
alter table marketplace_listings enable row level security;
alter table listing_images       enable row level security;

-- =====================================================================
-- SEED DATA
-- =====================================================================
-- Service categories (the 5 required + a few for people like sketch artists)
insert into service_categories (name, icon) values
  ('Plumber', '🚰'), ('Electrician', '⚡'), ('Tutor', '📚'),
  ('Cleaner', '🧹'), ('Mechanic', '🔧'), ('Artist', '🎨'), ('Other', '✦');

-- SAMPLE / FALLBACK DATA ONLY. Locality names are used for the manual-locality
-- fallback and for display. Centre points are APPROXIMATE (lng, lat).
-- Pincodes are set only where confident; NULL means "not verified".
insert into localities (name, pincode, center) values
  ('Andheri West',    '400058', st_point(72.8347, 19.1364)::geography),
  ('Andheri East',    '400069', st_point(72.8697, 19.1136)::geography),
  ('Lokhandwala',     '400053', st_point(72.8277, 19.1429)::geography),
  ('Versova',         '400061', st_point(72.8133, 19.1316)::geography),
  ('Oshiwara',        NULL,     st_point(72.8340, 19.1520)::geography),
  ('Jogeshwari West', '400102', st_point(72.8490, 19.1360)::geography),
  ('Vile Parle West', '400056', st_point(72.8372, 19.1010)::geography),
  ('Vile Parle East', '400057', st_point(72.8514, 19.1020)::geography),
  ('Sakinaka',        NULL,     st_point(72.8890, 19.1030)::geography),
  ('Marol',           NULL,     st_point(72.8790, 19.1190)::geography),
  ('Jogeshwari East', '400060', st_point(72.8600, 19.1400)::geography),
  ('Four Bungalows',  NULL,     st_point(72.8230, 19.1260)::geography);

