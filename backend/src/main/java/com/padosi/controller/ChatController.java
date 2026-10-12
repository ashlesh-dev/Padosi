package com.padosi.controller;

import com.padosi.dto.ConversationResponse;
import com.padosi.dto.CreateConversationRequest;
import com.padosi.dto.MessageResponse;
import com.padosi.dto.SendMessageRequest;
import com.padosi.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/conversations")
    public List<ConversationResponse> getConversations(@AuthenticationPrincipal Long userId) {
        return chatService.getConversations(userId);
    }

    @PostMapping("/conversations")
    @ResponseStatus(HttpStatus.OK)
    public ConversationResponse getOrCreateConversation(
            @AuthenticationPrincipal Long userId,
            @RequestBody CreateConversationRequest request) {
        return chatService.getOrCreateConversation(userId, request);
    }

    @GetMapping("/conversations/{id}")
    public ConversationResponse getConversation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return chatService.getConversation(userId, id);
    }

    @GetMapping("/conversations/{id}/messages")
    public List<MessageResponse> getMessages(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        return chatService.getMessages(userId, id);
    }

    @PostMapping("/conversations/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse sendMessage(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody SendMessageRequest request) {
        return chatService.sendMessage(userId, id, request);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(@AuthenticationPrincipal Long userId) {
        long count = chatService.getTotalUnreadCount(userId);
        return Map.of("unreadCount", count);
    }
}
