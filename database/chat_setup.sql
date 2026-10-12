-- =====================================================================
-- PADOSI - Chat / Messaging System Setup (Supabase Migration)
-- Run this script in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1. Create conversations table
create table if not exists conversations (
  id                bigint generated always as identity primary key,
  listing_id        bigint references marketplace_listings(id) on delete set null,
  participant1_id   bigint not null references users(id) on delete cascade,
  participant2_id   bigint not null references users(id) on delete cascade,
  last_message_text varchar(500),
  last_message_at   timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_diff_participants check (participant1_id <> participant2_id)
);

create index if not exists idx_conversations_p1 on conversations(participant1_id);
create index if not exists idx_conversations_p2 on conversations(participant2_id);
create index if not exists idx_conversations_listing on conversations(listing_id);
create index if not exists idx_conversations_last_msg on conversations(last_message_at desc);
alter table conversations enable row level security;

-- 2. Create messages table
create table if not exists messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references conversations(id) on delete cascade,
  sender_id       bigint not null references users(id) on delete cascade,
  content         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now(),
  constraint chk_message_content check (length(trim(content)) > 0)
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at asc);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_messages_unread on messages(conversation_id, is_read);
alter table messages enable row level security;
