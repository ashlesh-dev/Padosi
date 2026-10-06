package com.padosi.dto;

import com.padosi.entity.User;

/**
 * What OTHER users may see about a person: name, avatar and locality only.
 * It deliberately has no latitude/longitude field, so exact coordinates can never leak.
 */
public record PublicUserSummary(Long id, String fullName, String avatarUrl, String locality) {

    public static PublicUserSummary from(User u) {
        return new PublicUserSummary(u.getId(), u.getFullName(), u.getAvatarUrl(), u.getLocality().getName());
    }
}
