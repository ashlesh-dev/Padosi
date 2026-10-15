package com.padosi.dto;

import com.padosi.entity.User;

import java.time.Instant;

/**
 * Public profile of a user — what any logged-in neighbour may see.
 *
 * Deliberately excludes: email, phone, exact coordinates, password hash,
 * and raw activity counters (likes given, comments posted) which could feel
 * intrusive. The Behaviour Score is a single, transparent summary.
 *
 * Only localityName + city are exposed — never lat/lon.
 */
public record UserProfileResponse(
        Long id,
        String fullName,
        String handle,
        String avatarUrl,
        String bio,
        String localityName,   // e.g. "Andheri West"
        String city,           // e.g. "Mumbai"
        Instant memberSince,
        int postCount,         // how many posts this user has made
        double behaviourScore, // Starting at 5.0, +5 per helpful vote (internal limit 1000.0)
        // ── Business / Professional Account fields (shown on public profile) ──
        String accountType,       // "PERSONAL" | "BUSINESS"
        String companyName,
        String businessCategory,
        String businessBio,
        String businessContact,
        String businessWebsite
) {
    /** Factory — stats, score, and business fields are pre-computed/passed by UserService. */
    public static UserProfileResponse from(User u, int postCount, double behaviourScore) {
        return new UserProfileResponse(
                u.getId(),
                u.getFullName(),
                u.getHandle(),
                u.getAvatarUrl(),
                u.getBio(),
                u.getLocality().getName(),
                u.getLocality().getCity(),
                u.getCreatedAt(),
                postCount,
                behaviourScore,
                u.getAccountType() != null ? u.getAccountType() : "PERSONAL",
                u.getCompanyName(),
                u.getBusinessCategory(),
                u.getBusinessBio(),
                u.getBusinessContact(),
                u.getBusinessWebsite()
        );
    }
}
