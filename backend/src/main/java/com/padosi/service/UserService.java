package com.padosi.service;

import com.padosi.dto.PostResponse;
import com.padosi.dto.UserProfileResponse;
import com.padosi.entity.Post;
import com.padosi.entity.User;
import com.padosi.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Business logic for public user profiles and the Padosi Behaviour Score.
 *
 * The Behaviour Score (0–10) is a transparent, community-signals-based metric.
 * It deliberately ignores popularity (follower count, total likes received)
 * and focuses on PARTICIPATION and RESPECT signals:
 *
 *   Positive signals:
 *     - postCount:      creating content for the community     (weight: medium)
 *     - likesGiven:     engaging positively with others        (weight: small)
 *     - commentsPosted: meaningful participation               (weight: medium)
 *     - accountAge:     long-term commitment to the community  (weight: small)
 *
 *   The score is capped at 10 and floored at 1 so no user shows 0.
 *   As the platform grows, report counts / verified violations can be subtracted.
 */
@Service
public class UserService {

    // ── Score weights (tunable) ──────────────────────────────────────────────

    /** A base score every member starts with (representing "good faith"). */
    private static final double BASE_SCORE = 5.0;

    /** Extra points per post, up to this cap contribution. */
    private static final double POST_MAX_CONTRIBUTION   = 2.5;
    private static final int    POST_SATURATION         = 20;  // 20+ posts = full contribution

    /** Extra points for likes given, up to this cap. */
    private static final double LIKE_MAX_CONTRIBUTION   = 0.75;
    private static final int    LIKE_SATURATION         = 50;

    /** Extra points for comments, up to this cap. */
    private static final double COMMENT_MAX_CONTRIBUTION = 1.5;
    private static final int    COMMENT_SATURATION       = 30;

    /** Extra points for account age (days), up to this cap. */
    private static final double AGE_MAX_CONTRIBUTION     = 0.25;
    private static final int    AGE_SATURATION_DAYS      = 90;  // 3 months = full age bonus

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final UserRepository        userRepository;
    private final PostRepository        postRepository;
    private final PostLikeRepository    postLikeRepository;
    private final CommentRepository     commentRepository;

    public UserService(UserRepository userRepository,
                       PostRepository postRepository,
                       PostLikeRepository postLikeRepository,
                       CommentRepository commentRepository) {
        this.userRepository     = userRepository;
        this.postRepository     = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.commentRepository  = commentRepository;
    }

    // ── Public profile ───────────────────────────────────────────────────────

    /**
     * Fetch the public profile of any user by their ID.
     * Never exposes email, phone, exact coordinates, or password hash.
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getPublicProfile(Long targetUserId) {
        User user = findUser(targetUserId);

        int  postCount      = (int) postRepository.countByAuthorId(targetUserId);
        int  likesGiven     = (int) postLikeRepository.countByIdUserId(targetUserId);
        int  commentsPosted = (int) commentRepository.countByAuthorId(targetUserId);

        // Account age in days
        long ageDays = java.time.Duration
                .between(user.getCreatedAt(), java.time.Instant.now())
                .toDays();

        double score = computeBehaviourScore(postCount, likesGiven, commentsPosted, (int) ageDays);

        // Only postCount and the final score are exposed publicly.
        // Raw activity numbers (likesGiven, commentsPosted) stay server-side.
        return UserProfileResponse.from(user, postCount, score);
    }

    /**
     * Fetch the most recent posts of a user (newest first).
     * Any logged-in user can view another's post history.
     *
     * @param page 0-based page index
     */
    @Transactional(readOnly = true)
    public List<PostResponse> getUserPosts(Long targetUserId, int page, int size) {
        // Verify the user exists first (throws 404 if not)
        findUser(targetUserId);

        int effectiveSize = (size > 0 && size <= 50) ? size : 12;
        int offset = page * effectiveSize;

        // Use the existing query (already ordered by created_at DESC) with manual pagination
        List<Post> all = postRepository.findByAuthorIdOrderByCreatedAtDesc(targetUserId);
        return all.stream()
                .skip(offset)
                .limit(effectiveSize)
                .map(PostResponse::from)
                .toList();
    }

    // ── Behaviour Score ───────────────────────────────────────────────────────

    /**
     * Compute a score 1–10.
     *
     * Uses a "logarithmic saturation" approach so that the first few actions
     * count a lot, but spamming does not inflate the score indefinitely.
     */
    double computeBehaviourScore(int posts, int likesGiven, int comments, int ageDays) {
        double score = BASE_SCORE;
        score += saturate(posts,       POST_SATURATION,    POST_MAX_CONTRIBUTION);
        score += saturate(likesGiven,  LIKE_SATURATION,    LIKE_MAX_CONTRIBUTION);
        score += saturate(comments,    COMMENT_SATURATION, COMMENT_MAX_CONTRIBUTION);
        score += saturate(ageDays,     AGE_SATURATION_DAYS, AGE_MAX_CONTRIBUTION);

        // Clamp to [1.0, 10.0] and round to one decimal place
        score = Math.max(1.0, Math.min(10.0, score));
        return Math.round(score * 10.0) / 10.0;
    }

    /**
     * Linearly saturates the contribution of a counter:
     *   0 → 0, saturationPoint → maxContribution, beyond → maxContribution (capped).
     */
    private double saturate(int value, int saturationPoint, double maxContribution) {
        if (value <= 0)               return 0.0;
        if (value >= saturationPoint) return maxContribution;
        return maxContribution * ((double) value / saturationPoint);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
