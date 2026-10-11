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
        String avatarUrl,
        String bio,
        String localityName,   // e.g. "Andheri West"
        String city,           // e.g. "Mumbai"
        Instant memberSince,
        int postCount,         // how many posts this user has made
        double behaviourScore  // 1.0–10.0, computed by UserService
) {
    /** Factory — stats and score are pre-computed by UserService. */
    public static UserProfileResponse from(User u, int postCount, double behaviourScore) {
        return new UserProfileResponse(
                u.getId(),
                u.getFullName(),
                u.getAvatarUrl(),
                u.getBio(),
                u.getLocality().getName(),
                u.getLocality().getCity(),
                u.getCreatedAt(),
                postCount,
                behaviourScore
        );
    }
}
