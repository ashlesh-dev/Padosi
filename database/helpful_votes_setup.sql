-- =====================================================================
-- PADOSI - Helpful Votes Tables (Supabase Migration)
-- Run this script in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1. Table for tracking helpful votes on comments (+5 Padosi Score)
create table if not exists comment_helpful_votes (
  id         bigint generated always as identity primary key,
  comment_id bigint not null references comments(id) on delete cascade,
  voter_id   bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_comment_voter unique (comment_id, voter_id)
);

create index if not exists idx_comment_helpful_votes_comment on comment_helpful_votes(comment_id);
create index if not exists idx_comment_helpful_votes_voter on comment_helpful_votes(voter_id);
alter table comment_helpful_votes enable row level security;

-- 2. Table for tracking helpful votes on messages / chats (+10 Padosi Score)
create table if not exists message_helpful_votes (
  id         bigint generated always as identity primary key,
  message_id bigint not null references messages(id) on delete cascade,
  voter_id   bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_message_voter unique (message_id, voter_id)
);

create index if not exists idx_message_helpful_votes_message on message_helpful_votes(message_id);
create index if not exists idx_message_helpful_votes_voter on message_helpful_votes(voter_id);
alter table message_helpful_votes enable row level security;
