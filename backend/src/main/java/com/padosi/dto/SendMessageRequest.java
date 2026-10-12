package com.padosi.dto;

import jakarta.validation.constraints.NotBlank;

public record SendMessageRequest(
        @NotBlank(message = "Message content cannot be blank")
        String content
) {}
