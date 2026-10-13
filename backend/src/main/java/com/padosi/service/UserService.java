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

    // ── Score weights ────────────────────────────────────────────────────────

    /** A base score every member starts with (representing "good faith"). */
    private static final double BASE_SCORE = 5.0;

    /** Internal safety cap on Padosi Score. */
    private static final double MAX_SCORE = 1000.0;

    /** Extra points for comment helpful votes received (+5 per vote). */
    private static final double POINTS_PER_COMMENT_HELPFUL = 5.0;

    /** Extra points for chat helpful votes received (+5 per vote). */
    private static final double POINTS_PER_CHAT_HELPFUL = 5.0;

    // ── Dependencies ─────────────────────────────────────────────────────────

    private final UserRepository        userRepository;
    private final PostRepository        postRepository;
    private final PostLikeRepository    postLikeRepository;
    private final CommentRepository     commentRepository;
    private final CommentHelpfulVoteRepository commentHelpfulVoteRepository;
    private final MessageHelpfulVoteRepository messageHelpfulVoteRepository;

    public UserService(UserRepository userRepository,
                       PostRepository postRepository,
                       PostLikeRepository postLikeRepository,
                       CommentRepository commentRepository,
                       CommentHelpfulVoteRepository commentHelpfulVoteRepository,
                       MessageHelpfulVoteRepository messageHelpfulVoteRepository) {
        this.userRepository     = userRepository;
        this.postRepository     = postRepository;
        this.postLikeRepository = postLikeRepository;
        this.commentRepository  = commentRepository;
        this.commentHelpfulVoteRepository = commentHelpfulVoteRepository;
        this.messageHelpfulVoteRepository = messageHelpfulVoteRepository;
    }

    // ── Public profile ───────────────────────────────────────────────────────

    /**
     * Fetch the public profile of any user by their ID.
     * Never exposes email, phone, exact coordinates, or password hash.
     */
    @Transactional(readOnly = true)
    public UserProfileResponse getPublicProfile(Long targetUserId) {
        User user = findUser(targetUserId);

        int  postCount              = (int) postRepository.countByAuthorId(targetUserId);
        int  likesGiven             = (int) postLikeRepository.countByIdUserId(targetUserId);
        int  commentsPosted         = (int) commentRepository.countByAuthorId(targetUserId);
        int  commentHelpfulReceived = (int) commentHelpfulVoteRepository.countHelpfulVotesReceivedByUser(targetUserId);
        int  messageHelpfulReceived = (int) messageHelpfulVoteRepository.countHelpfulVotesReceivedByUser(targetUserId);

        // Account age in days
        long ageDays = java.time.Duration
                .between(user.getCreatedAt(), java.time.Instant.now())
                .toDays();

        double score = computeBehaviourScore(postCount, likesGiven, commentsPosted,
                commentHelpfulReceived, messageHelpfulReceived, (int) ageDays);

        // Only postCount and the final score are exposed publicly.
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
     * Compute Padosi Behaviour Score.
     * Starting score is 5.0.
     * Each helpful vote received on comments adds +5.
     * Each helpful vote received in chats adds +5.
     * Score increases unlimitedly (internal limit 1000.0).
     */
    double computeBehaviourScore(int posts, int likesGiven, int comments,
                                  int commentHelpfulVotes, int messageHelpfulVotes, int ageDays) {
        double score = BASE_SCORE;
        score += (commentHelpfulVotes * POINTS_PER_COMMENT_HELPFUL);
        score += (messageHelpfulVotes * POINTS_PER_CHAT_HELPFUL);

        // Floor at 5.0 (starting score) and cap at internal limit 1000.0
        score = Math.max(BASE_SCORE, Math.min(MAX_SCORE, score));
        return Math.round(score * 10.0) / 10.0;
    }

    // ── Avatar Update ─────────────────────────────────────────────────────────

    /**
     * Saves a new avatar URL for the logged-in user.
     * The actual upload is done on the frontend via Supabase Storage;
     * this just persists the resulting public URL.
     */
    @Transactional
    public void updateAvatarUrl(Long userId, String avatarUrl) {
        User user = findUser(userId);
        user.setAvatarUrl(avatarUrl);
        userRepository.save(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
