package com.padosi.service;

import com.padosi.dto.CreatePostRequest;
import com.padosi.dto.PostResponse;
import com.padosi.entity.Post;
import com.padosi.entity.User;
import com.padosi.entity.enums.PostType;
import com.padosi.repository.PostRepository;
import com.padosi.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Business logic for community feed posts. */
@Service
public class PostService {

    /** Default radius in metres used for the feed if user has no custom radius set. */
    private static final double METRES_PER_KM = 1000.0;

    private final PostRepository postRepository;
    private final UserRepository userRepository;

    public PostService(PostRepository postRepository, UserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    /** Fetch posts near the logged-in user using their stored location and radius. */
    @Transactional(readOnly = true)
    public List<PostResponse> getNearbyPosts(Long userId) {
        User user = getUser(userId);
        double radiusMetres = user.getSearchRadiusKm() * METRES_PER_KM;
        // JTS Point: X = longitude, Y = latitude
        double lat = user.getLocation().getY();
        double lon = user.getLocation().getX();
        return postRepository.findNearby(lat, lon, radiusMetres, 50)
                .stream()
                .map(PostResponse::from)
                .toList();
    }

    /** Create a new post on behalf of the logged-in user. */
    @Transactional
    public PostResponse createPost(Long userId, CreatePostRequest request) {
        User user = getUser(userId);

        PostType type = PostType.GENERAL;
        if (request.postType() != null) {
            try {
                type = PostType.valueOf(request.postType().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // Invalid string → fall back to GENERAL
            }
        }

        Post post = Post.builder()
                .author(user)
                .locality(user.getLocality())
                .postType(type)
                .content(request.content().trim())
                .location(user.getLocation()) // post is at author's location
                .build();

        return PostResponse.from(postRepository.save(post));
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
