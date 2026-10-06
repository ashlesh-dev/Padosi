package com.padosi.service;

import com.padosi.dto.CommentResponse;
import com.padosi.dto.CreateCommentRequest;
import com.padosi.dto.CreatePostRequest;
import com.padosi.dto.PostResponse;
import com.padosi.entity.*;
import com.padosi.entity.enums.PostType;
import com.padosi.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Business logic for community feed posts, likes, and comments. */
@Service
public class PostService {

    private static final double METRES_PER_KM = 1000.0;
    private static final int PAGE_SIZE = 10; // default page size

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final PostImageRepository postImageRepository;
    private final UserRepository userRepository;

    public PostService(PostRepository postRepository,
                       PostLikeRepository postLikeRepository,
                       CommentRepository commentRepository,
                       PostImageRepository postImageRepository,
                       UserRepository userRepository) {
        this.postRepository = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.commentRepository = commentRepository;
        this.postImageRepository = postImageRepository;
        this.userRepository = userRepository;
    }

    // ─── Feed ─────────────────────────────────────────────────────────────────

    /**
     * Fetch posts near the logged-in user using their stored location and the
     * requested radius. Returns newest first with like/comment counts and
     * approximate distance. Exact coordinates are NEVER returned.
     *
     * @param radiusKm override radius in km; if null uses the user's stored preference
     * @param page     0-based page number
     * @param size     items per page (defaults to PAGE_SIZE)
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getNearbyPosts(Long userId, Integer radiusKm, int page, int size) {
        User user = getUser(userId);

        // Use override radius or fall back to the user's stored preference
        double radiusMetres = (radiusKm != null ? radiusKm : user.getSearchRadiusKm()) * METRES_PER_KM;
        double lat = user.getLocation().getY(); // JTS: X = lon, Y = lat
        double lon = user.getLocation().getX();

        int effectiveSize = (size > 0 && size <= 50) ? size : PAGE_SIZE;
        int offset = page * effectiveSize;

        List<Post> posts = postRepository.findNearby(lat, lon, radiusMetres, effectiveSize, offset);

        return posts.stream().map(post -> {
            long likeCount    = postLikeRepository.countByIdPostId(post.getId());
            long commentCount = commentRepository.countByPostId(post.getId());
            boolean likedByMe = postLikeRepository.existsByIdPostIdAndIdUserId(post.getId(), userId);

            // Compute distance in km, rounded to 1 decimal — never exact coords
            Double distM = postRepository.getDistanceMetres(post.getId(), lat, lon);
            double distKm = distM != null ? Math.round(distM / 100.0) / 10.0 : 0.0;

            return PostResponse.from(post, likeCount, commentCount, likedByMe, distKm);
        }).toList();
    }

    // ─── Create / Delete ──────────────────────────────────────────────────────

    /** Create a new post on behalf of the logged-in user. */
    @Transactional
    public PostResponse createPost(Long userId, CreatePostRequest request) {
        User user = getUser(userId);

        // Parse post type string → enum, default to GENERAL
        PostType type = PostType.GENERAL;
        if (request.postType() != null) {
            try {
                type = PostType.valueOf(request.postType().toUpperCase());
            } catch (IllegalArgumentException ignored) { /* fall back to GENERAL */ }
        }

        Post post = Post.builder()
                .author(user)
                .locality(user.getLocality())
                .postType(type)
                .content(request.content().trim())
                .location(user.getLocation()) // post is at author's location
                .build();
        post = postRepository.save(post);

        // If an image URL was provided, save it as the first PostImage
        // (temporary until real Supabase Storage uploads are built in Step 6)
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            PostImage img = PostImage.builder()
                    .post(post)
                    .imageUrl(request.imageUrl().trim())
                    .displayOrder((short) 0)
                    .build();
            postImageRepository.save(img);
            post.getImages().add(img);
        }

        return PostResponse.from(post, 0L, 0L, false, 0.0);
    }

    /**
     * Delete a post. Only the author may delete their own posts.
     * (Admins can delete any post via a future endpoint if needed.)
     */
    @Transactional
    public void deletePost(Long userId, Long postId) {
        Post post = getPost(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own posts");
        }
        postRepository.delete(post);
    }

    // ─── Likes ────────────────────────────────────────────────────────────────

    /**
     * Toggle like on a post. Returns true if the post is now liked, false if unliked.
     * This is the optimistic-update endpoint: fast and idempotent.
     */
    @Transactional
    public boolean toggleLike(Long userId, Long postId) {
        // Ensure the post exists
        Post post = getPost(postId);
        User user = getUser(userId);

        PostLikeId likeId = new PostLikeId(postId, userId);

        if (postLikeRepository.existsById(likeId)) {
            // Already liked → unlike
            postLikeRepository.deleteById(likeId);
            return false;
        } else {
            // Not yet liked → like it
            PostLike like = PostLike.builder().id(likeId).post(post).user(user).build();
            postLikeRepository.save(like);
            return true;
        }
    }

    // ─── Comments ─────────────────────────────────────────────────────────────

    /** Get all comments on a post, oldest first. */
    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long postId) {
        // Verify the post exists (throws 404 if not)
        getPost(postId);
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId)
                .stream()
                .map(CommentResponse::from)
                .toList();
    }

    /** Add a comment to a post on behalf of the logged-in user. */
    @Transactional
    public CommentResponse addComment(Long userId, Long postId, CreateCommentRequest request) {
        Post post = getPost(postId);
        User user = getUser(userId);

        Comment comment = Comment.builder()
                .post(post)
                .author(user)
                .content(request.content().trim())
                .build();

        return CommentResponse.from(commentRepository.save(comment));
    }

    /** Return the current like count for a post (used by the toggle-like endpoint). */
    @Transactional(readOnly = true)
    public long getLikeCount(Long postId) {
        return postLikeRepository.countByIdPostId(postId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private Post getPost(Long postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found"));
    }
}
