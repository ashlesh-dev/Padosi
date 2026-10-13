package com.padosi.repository;

import com.padosi.entity.CommentHelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentHelpfulVoteRepository extends JpaRepository<CommentHelpfulVote, Long> {

    /** Has this user already voted helpful on this comment? */
    boolean existsByCommentIdAndVoterId(Long commentId, Long voterId);

    /** Delete the helpful vote (un-vote). */
    void deleteByCommentIdAndVoterId(Long commentId, Long voterId);

    /** Total helpful votes received by a user across all their comments (used for Padosi Score). */
    @Query("SELECT COUNT(v) FROM CommentHelpfulVote v WHERE v.comment.author.id = :authorId")
    long countHelpfulVotesReceivedByUser(@Param("authorId") Long authorId);

    /** Total helpful votes on a specific comment. */
    long countByCommentId(Long commentId);
}
