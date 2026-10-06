package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body for creating a new community post. */
public record CreatePostRequest(
        @NotBlank(message = "Post content is required")
        @Size(max = 2000, message = "Post content must be under 2000 characters")
        String content,

        /** Optional post type; defaults to GENERAL on the backend if not provided. */
        String postType
) {}
