package com.padosi.repository;

import com.padosi.entity.MessageHelpfulVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageHelpfulVoteRepository extends JpaRepository<MessageHelpfulVote, Long> {

    /** Has this user already voted helpful on this message? */
    boolean existsByMessageIdAndVoterId(Long messageId, Long voterId);

    /** Delete the helpful vote (un-vote). */
    void deleteByMessageIdAndVoterId(Long messageId, Long voterId);

    /** Total helpful votes received by a user on all their messages (used for Padosi Score). */
    @Query("SELECT COUNT(v) FROM MessageHelpfulVote v WHERE v.message.sender.id = :senderId")
    long countHelpfulVotesReceivedByUser(@Param("senderId") Long senderId);

    /** Total helpful votes on a specific message. */
    long countByMessageId(Long messageId);
}
