package com.padosi.repository;

import com.padosi.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m " +
           "JOIN FETCH m.sender s " +
           "WHERE m.conversation.id = :conversationId " +
           "ORDER BY m.createdAt ASC")
    List<Message> findByConversationIdOrderByCreatedAtAsc(@Param("conversationId") Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id <> :userId " +
           "AND m.isRead = false")
    long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m " +
           "JOIN m.conversation c " +
           "WHERE (c.participant1.id = :userId OR c.participant2.id = :userId) " +
           "AND m.sender.id <> :userId " +
           "AND m.isRead = false")
    long countTotalUnreadMessagesForUser(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true " +
           "WHERE m.conversation.id = :conversationId " +
           "AND m.sender.id <> :userId " +
           "AND m.isRead = false")
    int markMessagesAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}
