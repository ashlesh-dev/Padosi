-- =====================================================================
-- PADOSI - Marketplace Setup (Supabase Migration)
-- Run this script in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1. Create saved_listings table for bookmarking functionality
create table if not exists saved_listings (
  listing_id bigint not null references marketplace_listings(id) on delete cascade,
  user_id    bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create index if not exists idx_saved_listings_user on saved_listings(user_id);
alter table saved_listings enable row level security;

-- 2. Create listing_reports table for moderation functionality
create table if not exists listing_reports (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references marketplace_listings(id) on delete cascade,
  reporter_id bigint not null references users(id) on delete cascade,
  reason      varchar(50) not null,
  description text,
  status      varchar(20) not null default 'PENDING',
  created_at  timestamptz not null default now(),
  constraint chk_report_reason check (reason in ('INAPPROPRIATE','SCAM','COUNTERFEIT','OTHER')),
  constraint chk_report_status check (status in ('PENDING','REVIEWED','DISMISSED')),
  constraint uq_listing_report_once unique (listing_id, reporter_id)
);
create index if not exists idx_listing_reports_listing on listing_reports(listing_id);
alter table listing_reports enable row level security;

-- 3. Supabase Storage bucket for marketplace images
-- PADOSI uses a Spring Boot backend, meaning RLS for tables is bypassed since the backend acts as a superuser.
-- However, storage uploads happen directly from the frontend via supabase-js using the ANON key.
insert into storage.buckets (id, name, public) 
values ('marketplace-images', 'marketplace-images', true) 
on conflict (id) do nothing;

-- 4. Storage Policies
-- We allow public read access to all marketplace images
create policy "Public Access" 
on storage.objects for select 
using (bucket_id = 'marketplace-images');

-- We allow anonymous uploads to the marketplace-images bucket, because PADOSI does not use Supabase Auth.
-- The Spring Boot backend issues custom JWTs, which Supabase storage policies cannot inherently validate 
-- without custom Postgres configurations. Thus, we allow inserts based on the bucket ID.
create policy "Anyone can upload marketplace images" 
on storage.objects for insert 
with check (bucket_id = 'marketplace-images');

create policy "Anyone can update marketplace images" 
on storage.objects for update 
using (bucket_id = 'marketplace-images');

create policy "Anyone can delete marketplace images" 
on storage.objects for delete 
using (bucket_id = 'marketplace-images');
