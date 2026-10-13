package com.padosi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Tracks who marked a message as "helpful".
 * One vote per user per message (composite PK prevents duplicates).
 * Awards +10 Padosi Score to the message sender.
 */
@Entity
@Table(name = "message_helpful_votes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"message_id", "voter_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageHelpfulVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;

    /** The user who pressed "Helpful" on this message. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voter_id", nullable = false)
    private User voter;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
