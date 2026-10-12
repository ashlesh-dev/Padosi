package com.padosi.dto;

import com.padosi.entity.User;

public record ChatUserSummary(
        Long id,
        String fullName,
        String avatarUrl,
        String localityName
) {
    public static ChatUserSummary from(User user) {
        if (user == null) return null;
        String localityName = user.getLocality() != null ? user.getLocality().getName() : null;
        return new ChatUserSummary(
                user.getId(),
                user.getFullName(),
                user.getAvatarUrl(),
                localityName
        );
    }
}
