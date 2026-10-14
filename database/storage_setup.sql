-- =====================================================================
-- PADOSI - Supabase Storage Buckets & RLS Policies Setup
-- Run this script in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1. Ensure public buckets exist for avatars, post-images, and marketplace-images
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) 
values ('post-images', 'post-images', true) 
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) 
values ('marketplace-images', 'marketplace-images', true) 
on conflict (id) do update set public = true;

-- 2. Avatars Storage Policies
-- Allows viewing avatars publicly
drop policy if exists "Public Access for avatars" on storage.objects;
create policy "Public Access for avatars" 
on storage.objects for select 
using (bucket_id = 'avatars');

-- Allows users to upload avatars (Spring Boot JWT is used, so uploads from frontend use anon key)
drop policy if exists "Anyone can upload avatars" on storage.objects;
create policy "Anyone can upload avatars" 
on storage.objects for insert 
with check (bucket_id = 'avatars');

-- Allows updating avatars (upsert=true)
drop policy if exists "Anyone can update avatars" on storage.objects;
create policy "Anyone can update avatars" 
on storage.objects for update 
using (bucket_id = 'avatars');

-- Allows deleting avatars
drop policy if exists "Anyone can delete avatars" on storage.objects;
create policy "Anyone can delete avatars" 
on storage.objects for delete 
using (bucket_id = 'avatars');

-- 3. Post Images Storage Policies
drop policy if exists "Public Access for post images" on storage.objects;
create policy "Public Access for post images" 
on storage.objects for select 
using (bucket_id = 'post-images');

drop policy if exists "Anyone can upload post images" on storage.objects;
create policy "Anyone can upload post images" 
on storage.objects for insert 
with check (bucket_id = 'post-images');

drop policy if exists "Anyone can update post images" on storage.objects;
create policy "Anyone can update post images" 
on storage.objects for update 
using (bucket_id = 'post-images');

drop policy if exists "Anyone can delete post images" on storage.objects;
create policy "Anyone can delete post images" 
on storage.objects for delete 
using (bucket_id = 'post-images');

-- 4. Marketplace Images Storage Policies
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" 
on storage.objects for select 
using (bucket_id = 'marketplace-images');

drop policy if exists "Anyone can upload marketplace images" on storage.objects;
create policy "Anyone can upload marketplace images" 
on storage.objects for insert 
with check (bucket_id = 'marketplace-images');

drop policy if exists "Anyone can update marketplace images" on storage.objects;
create policy "Anyone can update marketplace images" 
on storage.objects for update 
using (bucket_id = 'marketplace-images');

drop policy if exists "Anyone can delete marketplace images" on storage.objects;
create policy "Anyone can delete marketplace images" 
on storage.objects for delete 
using (bucket_id = 'marketplace-images');
