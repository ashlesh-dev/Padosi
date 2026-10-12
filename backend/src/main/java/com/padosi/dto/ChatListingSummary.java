package com.padosi.dto;

import com.padosi.entity.MarketplaceListing;
import java.math.BigDecimal;

public record ChatListingSummary(
        Long id,
        String title,
        BigDecimal price,
        String imageUrl,
        String status
) {
    public static ChatListingSummary from(MarketplaceListing listing) {
        if (listing == null) return null;
        String primaryImage = null;
        if (listing.getImages() != null && !listing.getImages().isEmpty()) {
            primaryImage = listing.getImages().get(0).getImageUrl();
        }
        return new ChatListingSummary(
                listing.getId(),
                listing.getTitle(),
                listing.getPrice(),
                primaryImage,
                listing.getStatus() != null ? listing.getStatus().name() : "AVAILABLE"
        );
    }
}
