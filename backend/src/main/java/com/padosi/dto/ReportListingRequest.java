package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;

public record ReportListingRequest(
        @NotBlank String reason,
        String description
) {}
