package com.padosi.dto;

import com.padosi.entity.Conversation;
import com.padosi.entity.User;
import java.time.Instant;

public record ConversationResponse(
        Long id,
        ChatUserSummary otherParticipant,
        ChatListingSummary listing,
        String lastMessageText,
        Instant lastMessageAt,
        long unreadCount,
        Instant createdAt
) {
    public static ConversationResponse from(Conversation c, Long currentUserId, long unreadCount) {
        User other = c.getOtherParticipant(currentUserId);
        return new ConversationResponse(
                c.getId(),
                ChatUserSummary.from(other),
                ChatListingSummary.from(c.getListing()),
                c.getLastMessageText(),
                c.getLastMessageAt(),
                unreadCount,
                c.getCreatedAt()
        );
    }
}
