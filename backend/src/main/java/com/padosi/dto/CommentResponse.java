package com.padosi.dto;

import com.padosi.entity.Comment;
import java.time.Instant;

/** What the comments API returns for a single comment. */
public record CommentResponse(
        Long id,
        Long authorId,
        String authorName,
        String authorAvatarUrl,
        String content,
        Instant createdAt,
        long helpfulCount,     // total helpful votes this comment has received
        boolean helpfulByMe   // whether the requesting user has voted helpful on this comment
) {
    /** Factory without helpful vote data (e.g., when creating a comment). */
    public static CommentResponse from(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getAuthor().getId(),
                c.getAuthor().getFullName(),
                c.getAuthor().getAvatarUrl(),
                c.getContent(),
                c.getCreatedAt(),
                0L,
                false
        );
    }

    /** Factory with helpful vote data (used when fetching comments for the feed). */
    public static CommentResponse from(Comment c, long helpfulCount, boolean helpfulByMe) {
        return new CommentResponse(
                c.getId(),
                c.getAuthor().getId(),
                c.getAuthor().getFullName(),
                c.getAuthor().getAvatarUrl(),
                c.getContent(),
                c.getCreatedAt(),
                helpfulCount,
                helpfulByMe
        );
    }
}
