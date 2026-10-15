package com.padosi.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateServiceProviderRequest(
        @NotNull Long categoryId,
        @NotBlank @Size(max = 100) String headline,
        @Size(max = 1500) String description,
        @Size(max = 15) String contactPhone,
        @Min(0) @Max(60) Short experienceYears,
        @NotNull Short durationDays
) {}
