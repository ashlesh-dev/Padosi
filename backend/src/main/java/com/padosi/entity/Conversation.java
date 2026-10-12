package com.padosi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id")
    private MarketplaceListing listing;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant1_id", nullable = false)
    private User participant1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant2_id", nullable = false)
    private User participant2;

    @Column(name = "last_message_text", length = 500)
    private String lastMessageText;

    @Column(name = "last_message_at", nullable = false)
    @Builder.Default
    private Instant lastMessageAt = Instant.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean isParticipant(Long userId) {
        if (userId == null) return false;
        return (participant1 != null && participant1.getId().equals(userId))
            || (participant2 != null && participant2.getId().equals(userId));
    }

    public User getOtherParticipant(Long userId) {
        if (participant1 != null && participant1.getId().equals(userId)) {
            return participant2;
        }
        return participant1;
    }
}
