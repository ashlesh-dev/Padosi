package com.padosi.dto;

public record CreateConversationRequest(
        Long listingId,
        Long recipientId,
        String initialMessage
) {}
