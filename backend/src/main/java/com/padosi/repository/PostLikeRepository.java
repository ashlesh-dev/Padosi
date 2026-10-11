package com.padosi.repository;

import com.padosi.entity.PostLike;
import com.padosi.entity.PostLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, PostLikeId> {

    /** How many likes does a post have? */
    long countByIdPostId(Long postId);

    /** Did a specific user like a specific post? */
    boolean existsByIdPostIdAndIdUserId(Long postId, Long userId);

    /** Total likes given by a user — participation signal for behaviour score. */
    long countByIdUserId(Long userId);
}
