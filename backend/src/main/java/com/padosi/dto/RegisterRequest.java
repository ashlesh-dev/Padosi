package com.padosi.dto;

import jakarta.validation.constraints.*;

/**
 * Signup form. Location comes from EITHER:
 *   - browser geolocation (latitude + longitude), or
 *   - the manual fallback (localityId only; the locality's centre point is used).
 * That "either/or" rule is checked in AuthService.
 */
public record RegisterRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name is too long")
        String fullName,

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        @Size(max = 255)
        String email,

        // BCrypt only uses the first 72 bytes, so cap the length there
        @NotBlank(message = "Password is required")
        @Size(min = 8, max = 72, message = "Password must be 8-72 characters")
        String password,

        @Pattern(regexp = "^[0-9+ -]{7,15}$", message = "Enter a valid phone number")
        String phone,

        @DecimalMin(value = "-90", message = "Invalid latitude")
        @DecimalMax(value = "90", message = "Invalid latitude")
        Double latitude,

        @DecimalMin(value = "-180", message = "Invalid longitude")
        @DecimalMax(value = "180", message = "Invalid longitude")
        Double longitude,

        Long localityId
) {
}
