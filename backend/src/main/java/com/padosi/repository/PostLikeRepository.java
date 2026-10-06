package com.padosi.repository;

import com.padosi.entity.PostLike;
import com.padosi.entity.PostLikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, PostLikeId> {

    long countByIdPostId(Long postId);
}

