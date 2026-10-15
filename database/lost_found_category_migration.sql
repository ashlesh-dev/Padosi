-- Apply to existing Padosi installations before running the updated backend.
alter table lost_found_items
  add column if not exists category varchar(40) not null default 'OTHER';
