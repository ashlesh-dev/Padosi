package com.padosi.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Tracks who marked a comment as "helpful".
 * One vote per user per comment (composite PK prevents duplicates).
 * Awarding +5 Padosi Score to the comment's author.
 */
@Entity
@Table(name = "comment_helpful_votes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"comment_id", "voter_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CommentHelpfulVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comment_id", nullable = false)
    private Comment comment;

    /** The user who pressed "Helpful". */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voter_id", nullable = false)
    private User voter;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
