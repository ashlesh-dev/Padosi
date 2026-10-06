package com.padosi.dto;

import com.padosi.entity.Post;

import java.time.Instant;

/** What the feed API returns for a single post. Coordinates are never included. */
public record PostResponse(
        Long id,
        String authorName,
        String authorAvatarUrl,
        String localityName,
        String postType,
        String content,
        Instant createdAt
) {
    public static PostResponse from(Post p) {
        return new PostResponse(
                p.getId(),
                p.getAuthor().getFullName(),
                p.getAuthor().getAvatarUrl(),
                p.getLocality().getName(),
                p.getPostType().name(),
                p.getContent(),
                p.getCreatedAt()
        );
    }
}
