package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

import java.math.BigDecimal;

public record CreateMarketplaceRequest(
        @NotBlank String title,
        @NotNull @PositiveOrZero BigDecimal price,
        @NotBlank String category,
        @NotBlank String itemCondition,
        String description,
        String imageUrl,
        @NotNull @Min(30) @Max(90) Short durationDays
) {}
