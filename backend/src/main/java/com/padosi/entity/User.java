package com.padosi.entity;

import com.padosi.entity.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Point;

import java.time.Instant;

/**
 * A registered resident. NOTE: "location" is the user's exact position and must
 * NEVER be returned to other users - DTOs expose only locality + approximate distance.
 */
@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 40)
    private String handle;

    @Column(nullable = false, length = 255)
    private String email;

    /** BCrypt hash - never the plain password. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(length = 15)
    private String phone;

    @Column(length = 500)
    private String bio;

    /** Public URL of the avatar in Supabase Storage. */
    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Role role = Role.USER;

    // ── Business / Professional Account fields ────────────────────────────────

    /** PERSONAL (default) or BUSINESS. */
    @Column(name = "account_type", nullable = false, length = 20)
    @Builder.Default
    private String accountType = "PERSONAL";

    /** Company / brand name — only set for BUSINESS accounts. */
    @Column(name = "company_name", length = 120)
    private String companyName;

    /** Business category (e.g. Restaurant, Medical). */
    @Column(name = "business_category", length = 80)
    private String businessCategory;

    /** Short business bio / tagline (separate from personal bio). */
    @Column(name = "business_bio", length = 800)
    private String businessBio;

    /** Business contact info (phone, email, etc.). */
    @Column(name = "business_contact", length = 255)
    private String businessContact;

    /** Business website URL. */
    @Column(name = "business_website", length = 255)
    private String businessWebsite;

    /** Promotional wallet balance. One Padosi Coin represents ₹1 in demo mode. */
    @Column(name = "padosi_coins", nullable = false)
    @Builder.Default
    private Long padosiCoins = 0L;

    // ── Location & radius ─────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "locality_id", nullable = false)
    private Locality locality;

    @JdbcTypeCode(SqlTypes.GEOGRAPHY)
    @Column(nullable = false, columnDefinition = "geography(Point,4326)")
    private Point location;

    /** Search radius chosen by the user: 1, 5 or 10 km (DB CHECK enforces this). */
    @Column(name = "search_radius_km", nullable = false)
    @Builder.Default
    private Short searchRadiusKm = 5;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
