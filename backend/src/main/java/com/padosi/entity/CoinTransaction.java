package com.padosi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** Immutable audit entry for a demo wallet credit or listing charge. */
@Entity
@Table(name = "padosi_coin_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CoinTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** CREDIT or DEBIT. */
    @Column(name = "entry_type", nullable = false, length = 10)
    private String entryType;

    @Column(nullable = false)
    private Long amount;

    @Column(name = "balance_after", nullable = false)
    private Long balanceAfter;

    @Column(nullable = false, length = 300)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
