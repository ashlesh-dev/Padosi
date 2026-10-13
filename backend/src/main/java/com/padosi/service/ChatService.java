package com.padosi.service;

import com.padosi.dto.*;
import com.padosi.entity.Conversation;
import com.padosi.entity.MarketplaceListing;
import com.padosi.entity.Message;
import com.padosi.entity.MessageHelpfulVote;
import com.padosi.entity.User;
import com.padosi.repository.ConversationRepository;
import com.padosi.repository.MarketplaceListingRepository;
import com.padosi.repository.MessageHelpfulVoteRepository;
import com.padosi.repository.MessageRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final MarketplaceListingRepository listingRepository;
    private final MessageHelpfulVoteRepository messageHelpfulVoteRepository;

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       UserRepository userRepository,
                       MarketplaceListingRepository listingRepository,
                       MessageHelpfulVoteRepository messageHelpfulVoteRepository) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.listingRepository = listingRepository;
        this.messageHelpfulVoteRepository = messageHelpfulVoteRepository;
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getConversations(Long userId) {
        List<Conversation> conversations = conversationRepository.findAllByUserId(userId);
        return conversations.stream()
                .map(c -> {
                    long unread = messageRepository.countUnreadMessages(c.getId(), userId);
                    return ConversationResponse.from(c, userId, unread);
                })
                .toList();
    }

    @Transactional
    public ConversationResponse getOrCreateConversation(Long userId, CreateConversationRequest req) {
        User currentUser = getUser(userId);

        if (req.listingId() != null) {
            MarketplaceListing listing = listingRepository.findById(req.listingId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

            User seller = listing.getSeller();
            if (seller.getId().equals(userId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot message yourself about your own listing");
            }

            Conversation conversation = conversationRepository
                    .findByListingIdAndParticipants(listing.getId(), userId, seller.getId())
                    .orElseGet(() -> {
                        Conversation c = Conversation.builder()
                                .listing(listing)
                                .participant1(currentUser)
                                .participant2(seller)
                                .lastMessageAt(Instant.now())
                                .build();
                        return conversationRepository.save(c);
                    });

            if (req.initialMessage() != null && !req.initialMessage().isBlank()) {
                addMessageInternal(conversation, currentUser, req.initialMessage().trim());
            }

            long unread = messageRepository.countUnreadMessages(conversation.getId(), userId);
            return ConversationResponse.from(conversation, userId, unread);
        }

        // Direct conversation without listing
        if (req.recipientId() == null || req.recipientId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid recipient ID required");
        }

        User recipient = getUser(req.recipientId());
        Conversation conversation = conversationRepository
                .findDirectConversation(userId, req.recipientId())
                .orElseGet(() -> {
                    Conversation c = Conversation.builder()
                            .listing(null)
                            .participant1(currentUser)
                            .participant2(recipient)
                            .lastMessageAt(Instant.now())
                            .build();
                    return conversationRepository.save(c);
                });

        if (req.initialMessage() != null && !req.initialMessage().isBlank()) {
            addMessageInternal(conversation, currentUser, req.initialMessage().trim());
        }

        long unread = messageRepository.countUnreadMessages(conversation.getId(), userId);
        return ConversationResponse.from(conversation, userId, unread);
    }

    @Transactional(readOnly = true)
    public ConversationResponse getConversation(Long userId, Long conversationId) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, userId);
        long unread = messageRepository.countUnreadMessages(conversation.getId(), userId);
        return ConversationResponse.from(conversation, userId, unread);
    }

    @Transactional
    public List<MessageResponse> getMessages(Long userId, Long conversationId) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, userId);

        // Mark incoming messages as read
        messageRepository.markMessagesAsRead(conversationId, userId);

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        return messages.stream()
                .map(m -> MessageResponse.from(m, userId))
                .toList();
    }

    @Transactional
    public MessageResponse sendMessage(Long userId, Long conversationId, SendMessageRequest req) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, userId);

        User currentUser = getUser(userId);
        Message message = addMessageInternal(conversation, currentUser, req.content().trim());

        return MessageResponse.from(message, userId);
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCount(Long userId) {
        return messageRepository.countTotalUnreadMessagesForUser(userId);
    }

    private Message addMessageInternal(Conversation conversation, User sender, String content) {
        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .isRead(false)
                .build();
        message = messageRepository.save(message);

        conversation.setLastMessageText(content);
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        return message;
    }

    /**
     * Delete a conversation and all its messages.
     * Only a participant may delete their conversation.
     */
    @Transactional
    public void deleteConversation(Long userId, Long conversationId) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, userId);
        conversationRepository.delete(conversation);
    }

    /**
     * Toggle a "helpful" vote on a message. Cannot vote on your own message.
     * Returns { helpful: true/false, helpfulCount: N }.
     */
    @Transactional
    public Map<String, Object> toggleMessageHelpful(Long voterId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message not found"));

        if (message.getSender().getId().equals(voterId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot vote on your own message");
        }

        boolean alreadyVoted = messageHelpfulVoteRepository.existsByMessageIdAndVoterId(messageId, voterId);
        if (alreadyVoted) {
            messageHelpfulVoteRepository.deleteByMessageIdAndVoterId(messageId, voterId);
        } else {
            User voter = getUser(voterId);
            MessageHelpfulVote vote = MessageHelpfulVote.builder()
                    .message(message)
                    .voter(voter)
                    .build();
            messageHelpfulVoteRepository.save(vote);
        }

        long helpfulCount = messageHelpfulVoteRepository.countByMessageId(messageId);
        return Map.of("helpful", !alreadyVoted, "helpfulCount", helpfulCount);
    }

    /**
     * Toggle a "helpful" vote on a conversation (+10 Padosi Score to the other participant).
     */
    @Transactional
    public Map<String, Object> toggleConversationHelpful(Long voterId, Long conversationId) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, voterId);

        Long otherUserId = conversation.getParticipant1().getId().equals(voterId)
                ? conversation.getParticipant2().getId()
                : conversation.getParticipant1().getId();

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        for (Message m : messages) {
            if (m.getSender().getId().equals(otherUserId) &&
                    messageHelpfulVoteRepository.existsByMessageIdAndVoterId(m.getId(), voterId)) {
                messageHelpfulVoteRepository.deleteByMessageIdAndVoterId(m.getId(), voterId);
                return Map.of("helpful", false);
            }
        }

        Message targetMessage = null;
        for (int i = messages.size() - 1; i >= 0; i--) {
            Message m = messages.get(i);
            if (m.getSender().getId().equals(otherUserId)) {
                targetMessage = m;
                break;
            }
        }

        if (targetMessage == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The other participant hasn't sent any messages yet to mark helpful.");
        }

        User voter = getUser(voterId);
        MessageHelpfulVote vote = MessageHelpfulVote.builder()
                .message(targetMessage)
                .voter(voter)
                .build();
        messageHelpfulVoteRepository.save(vote);
        return Map.of("helpful", true);
    }

    /**
     * Check if the voter has marked this conversation/other participant as helpful.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getConversationHelpfulStatus(Long voterId, Long conversationId) {
        Conversation conversation = getConversationEntity(conversationId);
        checkParticipant(conversation, voterId);

        Long otherUserId = conversation.getParticipant1().getId().equals(voterId)
                ? conversation.getParticipant2().getId()
                : conversation.getParticipant1().getId();

        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        for (Message m : messages) {
            if (m.getSender().getId().equals(otherUserId) &&
                    messageHelpfulVoteRepository.existsByMessageIdAndVoterId(m.getId(), voterId)) {
                return Map.of("helpful", true);
            }
        }
        return Map.of("helpful", false);
    }

    private Conversation getConversationEntity(Long conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conversation not found"));
    }

    private void checkParticipant(Conversation conversation, Long userId) {
        if (!conversation.isParticipant(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a participant in this conversation");
        }
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
