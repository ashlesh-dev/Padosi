package com.padosi.controller;

import com.padosi.dto.CommentResponse;
import com.padosi.dto.CreateCommentRequest;
import com.padosi.dto.CreatePostRequest;
import com.padosi.dto.PostResponse;
import com.padosi.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints for the Community Feed.
 *
 * All endpoints require a valid JWT (enforced by Spring Security).
 *
 * GET    /api/posts                   — list nearby posts (paginated)
 * POST   /api/posts                   — create a post
 * DELETE /api/posts/{id}              — delete own post
 * POST   /api/posts/{id}/like         — toggle like (returns { liked, likeCount })
 * GET    /api/posts/{id}/comments     — list comments on a post
 * POST   /api/posts/{id}/comments     — add a comment
 */
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    // ─── Feed ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/posts?radiusKm=5&page=0&size=10
     * Returns newest posts within the given radius first.
     * If radiusKm is omitted, falls back to the user's stored preference.
     */
    @GetMapping
    public List<PostResponse> getNearby(
            @AuthenticationPrincipal Long userId,
            @RequestParam(required = false) Integer radiusKm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return postService.getNearbyPosts(userId, radiusKm, page, size);
    }

    // ─── Create / Delete ──────────────────────────────────────────────────────

    /** POST /api/posts — create a new community post. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CreatePostRequest request) {
        return postService.createPost(userId, request);
    }

    /** DELETE /api/posts/{id} — only the author can delete their post. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        postService.deletePost(userId, id);
    }

    // ─── Likes ────────────────────────────────────────────────────────────────

    /**
     * POST /api/posts/{id}/like — toggle like on a post.
     * Returns { liked: true/false, likeCount: N } for optimistic UI updates.
     */
    @PostMapping("/{id}/like")
    public Map<String, Object> toggleLike(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id) {
        boolean liked = postService.toggleLike(userId, id);
        // Return fresh count so the UI can sync
        long likeCount = postService.getLikeCount(id);
        return Map.of("liked", liked, "likeCount", likeCount);
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    /** GET /api/posts/{id}/comments — list all comments, oldest first. */
    @GetMapping("/{id}/comments")
    public List<CommentResponse> getComments(@PathVariable Long id) {
        return postService.getComments(id);
    }

    /** POST /api/posts/{id}/comments — add a comment. */
    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse addComment(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody CreateCommentRequest request) {
        return postService.addComment(userId, id, request);
    }
}
