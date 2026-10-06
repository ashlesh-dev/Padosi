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
        Instant createdAt
) {
    public static CommentResponse from(Comment c) {
        return new CommentResponse(
                c.getId(),
                c.getAuthor().getId(),
                c.getAuthor().getFullName(),
                c.getAuthor().getAvatarUrl(),
                c.getContent(),
                c.getCreatedAt()
        );
    }
}
