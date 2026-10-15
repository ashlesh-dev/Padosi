-- Lost & Found Supabase table and image bucket setup.
-- Run in Supabase Dashboard > SQL Editor. This table uses Supabase Auth UUIDs;
-- the running Padosi UI currently persists listings through Spring Boot's
-- existing lost_found_items table (whose reporter IDs are public.users IDs).

create table if not exists public.lost_and_found (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('lost', 'found')),
  title       text not null check (length(trim(title)) > 0),
  description text,
  category    text not null default 'other',
  location    text,
  image_url   text,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_lost_and_found_created_at
  on public.lost_and_found (created_at desc);
create index if not exists idx_lost_and_found_user_id
  on public.lost_and_found (user_id);

alter table public.lost_and_found enable row level security;
grant select on public.lost_and_found to anon, authenticated;
grant insert, update, delete on public.lost_and_found to authenticated;
grant usage, select on sequence public.lost_and_found_id_seq to authenticated;
drop policy if exists "Anyone can view lost and found posts" on public.lost_and_found;
create policy "Anyone can view lost and found posts"
  on public.lost_and_found for select using (true);
drop policy if exists "Users can create their own lost and found posts" on public.lost_and_found;
create policy "Users can create their own lost and found posts"
  on public.lost_and_found for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update their own lost and found posts" on public.lost_and_found;
create policy "Users can update their own lost and found posts"
  on public.lost_and_found for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own lost and found posts" on public.lost_and_found;
create policy "Users can delete their own lost and found posts"
  on public.lost_and_found for delete to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('lost-found-images', 'lost-found-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read lost and found images" on storage.objects;
create policy "Public read lost and found images"
  on storage.objects for select
  using (bucket_id = 'lost-found-images');
-- Padosi currently authenticates users with its own Spring Boot JWT, not
-- Supabase Auth. Match the existing marketplace image policy so browser uploads
-- using the anon key work; public read is enabled on the bucket above.
drop policy if exists "Upload lost and found images" on storage.objects;
create policy "Upload lost and found images"
  on storage.objects for insert
  with check (bucket_id = 'lost-found-images');
