package com.padosi.dto;

import jakarta.validation.constraints.Size;

/**
 * Body for PATCH /api/users/me/business
 * Allows a user to switch to (or update) their Business / Professional Account.
 */
public record UpdateBusinessProfileRequest(
        /** "PERSONAL" or "BUSINESS". Switching back to PERSONAL clears business fields. */
        String accountType,

        @Size(max = 120, message = "Company name must be under 120 characters")
        String companyName,

        @Size(max = 80, message = "Business category must be under 80 characters")
        String businessCategory,

        @Size(max = 800, message = "Business bio must be under 800 characters")
        String businessBio,

        @Size(max = 255, message = "Business contact must be under 255 characters")
        String businessContact,

        @Size(max = 255, message = "Website URL must be under 255 characters")
        String businessWebsite
) {}
