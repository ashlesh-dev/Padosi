package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLostFoundRequest(
        @NotBlank String kind,
        @NotBlank @Size(max = 150) String title,
        @Size(max = 40) String category,
        @Size(max = 200) String placeHint,
        String description,
        String imageUrl
) {}
