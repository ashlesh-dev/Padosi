package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

/** Body for creating a new community post. */
public record CreatePostRequest(
        @NotBlank(message = "Post content is required")
        @Size(max = 2000, message = "Post content must be under 2000 characters")
        String content,

        /** Optional post type; defaults to GENERAL on the backend if not provided. */
        String postType,

        @NotBlank(message = "Post category is required")
        @Pattern(regexp = "None|Restaurant|Grocery Store|Barber / Salon|Medical / Pharmacy|Dance Studio|Services|Events",
                message = "Choose a valid post category")
        String category,

        /**
         * Optional image URL — TEMPORARY placeholder until Supabase Storage uploads are wired.
         * Users paste a URL for now.
         */
        String imageUrl
) {}
