package com.padosi.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            log.info("Ensuring chat schema tables exist...");
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id BIGSERIAL PRIMARY KEY,
                    listing_id BIGINT REFERENCES marketplace_listings(id) ON DELETE SET NULL,
                    participant1_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    participant2_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    last_message_text VARCHAR(500),
                    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant1_id);
                CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant2_id);
                CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);
                CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

                CREATE TABLE IF NOT EXISTS messages (
                    id BIGSERIAL PRIMARY KEY,
                    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT false,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
                CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
                CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read);
            """);
            log.info("Chat schema initialized successfully.");
        } catch (Exception e) {
            log.warn("DatabaseInitializer notice: {}", e.getMessage());
        }

        // Existing databases may have the original lost_found_items table without
        // the category field added for the current API response/entity mapping.
        try {
            log.info("Ensuring Lost & Found category column exists...");
            jdbcTemplate.execute("""
                ALTER TABLE lost_found_items
                ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'OTHER'
            """);
            log.info("Lost & Found schema initialized successfully.");
        } catch (Exception e) {
            // Keep startup available if an installation has not created the base
            // Lost & Found table yet; its setup migration still creates that table.
            log.warn("Lost & Found schema initialization notice: {}", e.getMessage());
        }

        try {
            log.info("Ensuring Padosi Coins and listing expiry schema exists...");
            jdbcTemplate.execute("""
                ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS padosi_coins BIGINT NOT NULL DEFAULT 0;
                ALTER TABLE service_providers
                    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
                    ADD COLUMN IF NOT EXISTS duration_days SMALLINT;
                ALTER TABLE marketplace_listings
                    ADD COLUMN IF NOT EXISTS duration_days SMALLINT NOT NULL DEFAULT 30,
                    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
                CREATE TABLE IF NOT EXISTS padosi_coin_transactions (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT')),
                    amount BIGINT NOT NULL CHECK (amount > 0),
                    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
                    description VARCHAR(300) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_created
                    ON padosi_coin_transactions(user_id, created_at DESC);
            """);
            log.info("Padosi Coins and listing expiry schema initialized successfully.");
        } catch (Exception e) {
            log.warn("Wallet/listing schema initialization notice: {}", e.getMessage());
        }
    }
}
