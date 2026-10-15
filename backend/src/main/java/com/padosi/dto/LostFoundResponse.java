package com.padosi.dto;

import com.padosi.entity.LostFoundItem;

import java.time.Instant;

/** What the lost-and-found API returns for a single item. */
public record LostFoundResponse(
        Long id,
        Long reporterId,
        String reporterName,
        String localityName,
        String kind,
        String title,
        String category,
        String description,
        String placeHint,
        String imageUrl,
        String status,
        Instant createdAt
) {
    public static LostFoundResponse from(LostFoundItem lf) {
        return new LostFoundResponse(
                lf.getId(),
                lf.getReporter().getId(),
                lf.getReporter().getFullName(),
                lf.getLocality().getName(),
                lf.getKind().name(),
                lf.getTitle(),
                lf.getCategory(),
                lf.getDescription(),
                lf.getPlaceHint(),
                lf.getImageUrl(),
                lf.getStatus().name(),
                lf.getCreatedAt()
        );
    }
}
