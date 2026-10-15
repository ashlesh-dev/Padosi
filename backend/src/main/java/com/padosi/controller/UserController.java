package com.padosi.controller;

import com.padosi.dto.PostResponse;
import com.padosi.dto.UpdateBusinessProfileRequest;
import com.padosi.dto.UserProfileResponse;
import com.padosi.dto.UserResponse;
import com.padosi.dto.UserSearchResponse;
import com.padosi.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for public user profiles.
 *
 * GET    /api/users/{id}            — public profile (name, bio, locality, behaviour score)
 * GET    /api/users/{id}/posts      — paginated list of that user's posts (newest first)
 * GET    /api/users/search?q=...    — search by name or handle
 * PATCH  /api/users/me/avatar       — update logged-in user's avatar URL
 * PATCH  /api/users/me/business     — switch to Business account / update business details
 *
 * All endpoints require a valid JWT (enforced globally by Spring Security).
 * Exact coordinates are NEVER returned; only locality name + city.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * GET /api/users/{id}
     * Returns the public profile of any registered user.
     * Safe to call for any userId — exact location is never included.
     */
    @GetMapping("/{id}")
    public UserProfileResponse getProfile(@PathVariable Long id) {
        return userService.getPublicProfile(id);
    }

    /** GET /api/users/search?q=maya — matches display names and handles. */
    @GetMapping("/search")
    public List<UserSearchResponse> searchUsers(@RequestParam String q) {
        return userService.searchUsers(q);
    }

    /**
     * GET /api/users/{id}/posts?page=0&size=12
     * Returns the user's posts newest-first, paginated.
     */
    @GetMapping("/{id}/posts")
    public List<PostResponse> getUserPosts(
            @AuthenticationPrincipal Long viewerUserId,
            @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "12") int size) {
        return userService.getUserPosts(id, viewerUserId, page, size);
    }

    /**
     * PATCH /api/users/me/avatar
     * Updates the logged-in user's avatar URL (called after Supabase Storage upload).
     * Body: { "avatarUrl": "https://..." }
     */
    @PatchMapping("/me/avatar")
    public Map<String, String> updateAvatar(
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> body) {
        String newUrl = body.get("avatarUrl");
        userService.updateAvatarUrl(userId, newUrl);
        return Map.of("avatarUrl", newUrl != null ? newUrl : "");
    }

    /**
     * PATCH /api/users/me/business
     * Switch the logged-in user to a Business / Professional account (or back to PERSONAL).
     * Body: UpdateBusinessProfileRequest
     */
    @PatchMapping("/me/business")
    public UserResponse updateBusinessProfile(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody UpdateBusinessProfileRequest request) {
        return userService.updateBusinessProfile(userId, request);
    }
}
