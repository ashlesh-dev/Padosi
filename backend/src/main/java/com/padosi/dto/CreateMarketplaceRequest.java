package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record CreateMarketplaceRequest(
        @NotBlank String title,
        @NotNull @PositiveOrZero BigDecimal price,
        @NotBlank String category,
        @NotBlank String itemCondition,
        String description,
        String imageUrl
) {}
