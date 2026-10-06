package com.padosi.repository;

import com.padosi.entity.Review;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProviderIdOrderByCreatedAtDesc(Long providerId);

    boolean existsByProviderIdAndReviewerId(Long providerId, Long reviewerId);
}

