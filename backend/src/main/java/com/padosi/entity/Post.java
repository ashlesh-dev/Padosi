package com.padosi.entity;

import com.padosi.entity.enums.PostType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Point;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** A community feed post or announcement. Location is copied from the author at creation. */
@Entity
@Table(name = "posts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "locality_id", nullable = false)
    private Locality locality;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_type", nullable = false, length = 20)
    @Builder.Default
    private PostType postType = PostType.GENERAL;

    @Column(nullable = false, length = 40)
    private String category = "General";

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @JdbcTypeCode(SqlTypes.GEOGRAPHY)
    @Column(nullable = false, columnDefinition = "geography(Point,4326)")
    private Point location;

    // ── Ad / Sponsored Post fields ────────────────────────────────────────────

    /** Whether this post is a paid advertisement (only allowed for BUSINESS accounts). */
    @Column(name = "is_ad", nullable = false)
    @Builder.Default
    private Boolean isAd = false;

    /** Ad targeting radius in km (1, 5, or 10). Null if not an ad. */
    @Column(name = "ad_radius_km")
    private Short adRadiusKm;

    /** How many days the ad should run (7, 14, or 30). Null if not an ad. */
    @Column(name = "ad_duration_days")
    private Short adDurationDays;

    /** Computed expiry timestamp. The feed query ignores ads past this point. */
    @Column(name = "ad_expires_at")
    private Instant adExpiresAt;

    // ── Images ────────────────────────────────────────────────────────────────

    /** Photos of this post, shown in display_order. */
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    @Builder.Default
    private List<PostImage> images = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
