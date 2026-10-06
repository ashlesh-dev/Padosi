package com.padosi.dto;

import com.padosi.entity.Alert;

import java.time.Instant;

/** What the alerts API returns for a single alert. Coordinates are never included. */
public record AlertResponse(
        Long id,
        String authorName,
        String localityName,
        String alertType,
        String severity,
        String title,
        String description,
        Instant expiresAt,
        Instant createdAt
) {
    public static AlertResponse from(Alert a) {
        return new AlertResponse(
                a.getId(),
                a.getAuthor().getFullName(),
                a.getLocality().getName(),
                a.getAlertType().name(),
                a.getSeverity().name(),
                a.getTitle(),
                a.getDescription(),
                a.getExpiresAt(),
                a.getCreatedAt()
        );
    }
}
