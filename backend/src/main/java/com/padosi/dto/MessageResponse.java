package com.padosi.dto;

import com.padosi.entity.Message;
import java.time.Instant;

public record MessageResponse(
        Long id,
        Long conversationId,
        Long senderId,
        String senderName,
        String senderAvatarUrl,
        String content,
        boolean isRead,
        Instant createdAt,
        boolean isMine
) {
    public static MessageResponse from(Message m, Long currentUserId) {
        return new MessageResponse(
                m.getId(),
                m.getConversation().getId(),
                m.getSender().getId(),
                m.getSender().getFullName(),
                m.getSender().getAvatarUrl(),
                m.getContent(),
                m.getIsRead(),
                m.getCreatedAt(),
                m.getSender().getId().equals(currentUserId)
        );
    }
}
