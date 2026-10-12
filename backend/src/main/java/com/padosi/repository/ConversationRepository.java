package com.padosi.repository;

import com.padosi.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c " +
           "LEFT JOIN FETCH c.participant1 p1 " +
           "LEFT JOIN FETCH p1.locality " +
           "LEFT JOIN FETCH c.participant2 p2 " +
           "LEFT JOIN FETCH p2.locality " +
           "LEFT JOIN FETCH c.listing l " +
           "WHERE c.participant1.id = :userId OR c.participant2.id = :userId " +
           "ORDER BY c.lastMessageAt DESC")
    List<Conversation> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c " +
           "WHERE c.listing.id = :listingId " +
           "AND ((c.participant1.id = :user1Id AND c.participant2.id = :user2Id) " +
           "  OR (c.participant1.id = :user2Id AND c.participant2.id = :user1Id))")
    Optional<Conversation> findByListingIdAndParticipants(
            @Param("listingId") Long listingId,
            @Param("user1Id") Long user1Id,
            @Param("user2Id") Long user2Id);

    @Query("SELECT c FROM Conversation c " +
           "WHERE c.listing IS NULL " +
           "AND ((c.participant1.id = :user1Id AND c.participant2.id = :user2Id) " +
           "  OR (c.participant1.id = :user2Id AND c.participant2.id = :user1Id))")
    Optional<Conversation> findDirectConversation(
            @Param("user1Id") Long user1Id,
            @Param("user2Id") Long user2Id);
}
