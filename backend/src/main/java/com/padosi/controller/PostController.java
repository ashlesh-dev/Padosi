package com.padosi.controller;

import com.padosi.dto.CreatePostRequest;
import com.padosi.dto.PostResponse;
import com.padosi.service.PostService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GET  /api/posts        - list posts within the user's radius
 * POST /api/posts        - create a new post
 */
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public List<PostResponse> getNearby(@AuthenticationPrincipal Long userId) {
        return postService.getNearbyPosts(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse create(@AuthenticationPrincipal Long userId,
                               @Valid @RequestBody CreatePostRequest request) {
        return postService.createPost(userId, request);
    }
}
