package com.padosi.repository;

import com.padosi.entity.Comment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByPostIdOrderByCreatedAtAsc(Long postId);

    /** Count how many comments a post has (used for commentCount in feed). */
    long countByPostId(Long postId);

    /** Total comments made by a user — used for the public profile stat. */
    long countByAuthorId(Long authorId);
}
