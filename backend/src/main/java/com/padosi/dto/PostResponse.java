package com.padosi.dto;

import com.padosi.entity.Post;

import java.time.Instant;

/**
 * What the feed API returns for a single post.
 * Exact coordinates are NEVER included — only locality name and approximate distance.
 */
public record PostResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorHandle,
        String authorAvatarUrl,
        boolean authorIsBusiness,        // shows "Professional Account" badge in feed
        String authorCompanyName,        // e.g. "Pizzeria Roma" — displayed for business posts
        String localityName,
        String postType,
        String category,
        String content,
        String imageUrl,
        long likeCount,
        long commentCount,
        boolean likedByMe,
        double distanceKm,
        // ── Ad fields ──────────────────────────────────────────────────────────
        boolean isAd,                    // true → show "Sponsored" tag in feed
        Short adRadiusKm,
        Short adDurationDays,
        Instant adExpiresAt,
        Instant createdAt
) {
    /**
     * Basic factory used when like/comment counts are not available
     * (e.g., right after creating a post).
     */
    public static PostResponse from(Post p) {
        var author = p.getAuthor();
        boolean isBusiness = "BUSINESS".equals(author.getAccountType());
        return new PostResponse(
                p.getId(),
                author.getId(),
                author.getFullName(),
                author.getHandle(),
                author.getAvatarUrl(),
                isBusiness,
                isBusiness ? author.getCompanyName() : null,
                p.getLocality().getName(),
                p.getPostType().name(),
                p.getCategory(),
                p.getContent(),
                p.getImages().isEmpty() ? null : p.getImages().get(0).getImageUrl(),
                0L,
                0L,
                false,
                0.0,
                Boolean.TRUE.equals(p.getIsAd()),
                p.getAdRadiusKm(),
                p.getAdDurationDays(),
                p.getAdExpiresAt(),
                p.getCreatedAt()
        );
    }

    /** Full factory used when fetching feed with counts and distance. */
    public static PostResponse from(Post p, long likeCount, long commentCount,
                                    boolean likedByMe, double distanceKm) {
        var author = p.getAuthor();
        boolean isBusiness = "BUSINESS".equals(author.getAccountType());
        return new PostResponse(
                p.getId(),
                author.getId(),
                author.getFullName(),
                author.getHandle(),
                author.getAvatarUrl(),
                isBusiness,
                isBusiness ? author.getCompanyName() : null,
                p.getLocality().getName(),
                p.getPostType().name(),
                p.getCategory(),
                p.getContent(),
                p.getImages().isEmpty() ? null : p.getImages().get(0).getImageUrl(),
                likeCount,
                commentCount,
                likedByMe,
                distanceKm,
                Boolean.TRUE.equals(p.getIsAd()),
                p.getAdRadiusKm(),
                p.getAdDurationDays(),
                p.getAdExpiresAt(),
                p.getCreatedAt()
        );
    }
}
