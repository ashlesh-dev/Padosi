package com.padosi.dto;

import com.padosi.entity.User;

import java.time.Instant;

/**
 * The logged-in user's own profile. It deliberately contains the locality NAME only,
 * never latitude/longitude, so exact coordinates are not sent to the browser at all.
 */
public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String bio,
        String avatarUrl,
        String role,
        String locality,
        String city,
        Short searchRadiusKm,
        Instant createdAt
) {
    /** Call inside a transaction (it reads the lazy locality). */
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getBio(),
                u.getAvatarUrl(), u.getRole().name(), u.getLocality().getName(), u.getLocality().getCity(),
                u.getSearchRadiusKm(), u.getCreatedAt());
    }
}
