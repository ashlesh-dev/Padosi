package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for adding a comment to a post. */
public record CreateCommentRequest(
        @NotBlank(message = "Comment text is required")
        @Size(max = 1000, message = "Comment must be under 1000 characters")
        String content
) {}
