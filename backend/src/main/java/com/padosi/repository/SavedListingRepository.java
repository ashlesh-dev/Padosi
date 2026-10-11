package com.padosi.repository;

import com.padosi.entity.SavedListing;
import com.padosi.entity.SavedListingId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedListingRepository extends JpaRepository<SavedListing, SavedListingId> {
    List<SavedListing> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByIdListingIdAndIdUserId(Long listingId, Long userId);
}
