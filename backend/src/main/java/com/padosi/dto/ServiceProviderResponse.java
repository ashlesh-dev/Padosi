package com.padosi.dto;

import com.padosi.entity.ServiceProvider;

import java.time.Instant;

/** What the services API returns for a single provider. */
public record ServiceProviderResponse(
        Long id,
        Long providerUserId,
        String providerName,
        String avatarUrl,
        String localityName,
        Long categoryId,
        String categoryName,
        String categoryIcon,
        String headline,
        String description,
        String contactPhone,
        Short experienceYears,
        boolean available,
        Instant createdAt,
        Short durationDays,
        Instant expiresAt
) {
    public static ServiceProviderResponse from(ServiceProvider sp) {
        return new ServiceProviderResponse(
                sp.getId(),
                sp.getUser().getId(),
                sp.getUser().getFullName(),
                sp.getUser().getAvatarUrl(),
                sp.getUser().getLocality().getName(),
                sp.getCategory().getId(),
                sp.getCategory().getName(),
                sp.getCategory().getIcon(),
                sp.getHeadline(),
                sp.getDescription(),
                sp.getContactPhone(),
                sp.getExperienceYears(),
                sp.getAvailable(),
                sp.getCreatedAt(),
                sp.getDurationDays(),
                sp.getExpiresAt()
        );
    }
}
