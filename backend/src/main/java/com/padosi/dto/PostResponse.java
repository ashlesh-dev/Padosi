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
        String authorAvatarUrl,
        String localityName,
        String postType,
        String content,
        String imageUrl,         // optional image URL (temp: no upload yet)
        long likeCount,
        long commentCount,
        boolean likedByMe,
        double distanceKm,       // approximate distance, not exact coords
        Instant createdAt
) {
    /**
     * Basic factory used when like/comment counts are not available
     * (e.g., right after creating a post).
     */
    public static PostResponse from(Post p) {
        return new PostResponse(
                p.getId(),
                p.getAuthor().getId(),
                p.getAuthor().getFullName(),
                p.getAuthor().getAvatarUrl(),
                p.getLocality().getName(),
                p.getPostType().name(),
                p.getContent(),
                p.getImages().isEmpty() ? null : p.getImages().get(0).getImageUrl(),
                0L,
                0L,
                false,
                0.0,
                p.getCreatedAt()
        );
    }

    /** Full factory used when fetching feed with counts and distance. */
    public static PostResponse from(Post p, long likeCount, long commentCount,
                                    boolean likedByMe, double distanceKm) {
        return new PostResponse(
                p.getId(),
                p.getAuthor().getId(),
                p.getAuthor().getFullName(),
                p.getAuthor().getAvatarUrl(),
                p.getLocality().getName(),
                p.getPostType().name(),
                p.getContent(),
                p.getImages().isEmpty() ? null : p.getImages().get(0).getImageUrl(),
                likeCount,
                commentCount,
                likedByMe,
                distanceKm,
                p.getCreatedAt()
        );
    }
}
