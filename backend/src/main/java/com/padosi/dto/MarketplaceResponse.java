package com.padosi.dto;

import com.padosi.entity.MarketplaceListing;

import java.math.BigDecimal;
import java.time.Instant;

/** What the marketplace API returns for a single listing. Coordinates are never included. */
public record MarketplaceResponse(
        Long id,
        String sellerName,
        String sellerAvatarUrl,
        String localityName,
        String title,
        String description,
        BigDecimal price,
        String category,
        String itemCondition,
        String status,
        Instant createdAt
) {
    public static MarketplaceResponse from(MarketplaceListing m) {
        return new MarketplaceResponse(
                m.getId(),
                m.getSeller().getFullName(),
                m.getSeller().getAvatarUrl(),
                m.getLocality().getName(),
                m.getTitle(),
                m.getDescription(),
                m.getPrice(),
                m.getCategory().name(),
                m.getItemCondition().name(),
                m.getStatus().name(),
                m.getCreatedAt()
        );
    }
}
