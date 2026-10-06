package com.padosi.dto;

import com.padosi.entity.ServiceProvider;

import java.time.Instant;

/** What the services API returns for a single provider. */
public record ServiceProviderResponse(
        Long id,
        String providerName,
        String avatarUrl,
        String localityName,
        String categoryName,
        String headline,
        String description,
        String contactPhone,
        Short experienceYears,
        boolean available,
        Instant createdAt
) {
    public static ServiceProviderResponse from(ServiceProvider sp) {
        return new ServiceProviderResponse(
                sp.getId(),
                sp.getUser().getFullName(),
                sp.getUser().getAvatarUrl(),
                sp.getUser().getLocality().getName(),
                sp.getCategory().getName(),
                sp.getHeadline(),
                sp.getDescription(),
                sp.getContactPhone(),
                sp.getExperienceYears(),
                sp.getAvailable(),
                sp.getCreatedAt()
        );
    }
}
