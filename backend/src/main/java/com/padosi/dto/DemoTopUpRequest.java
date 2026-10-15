package com.padosi.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DemoTopUpRequest(
        @NotNull @Min(value = 1, message = "Enter at least 1 coin")
        @Max(value = 1000000, message = "A demo top-up cannot exceed 1,000,000 coins")
        Long coins
) {}
