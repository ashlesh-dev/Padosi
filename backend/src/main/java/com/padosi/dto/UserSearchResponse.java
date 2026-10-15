package com.padosi.dto;

import com.padosi.entity.User;

public record UserSearchResponse(Long id, String fullName, String handle, String avatarUrl, String localityName) {
    public static UserSearchResponse from(User user) {
        return new UserSearchResponse(user.getId(), user.getFullName(), user.getHandle(),
                user.getAvatarUrl(), user.getLocality().getName());
    }
}
