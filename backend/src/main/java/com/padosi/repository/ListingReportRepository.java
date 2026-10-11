package com.padosi.repository;

import com.padosi.entity.ListingReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ListingReportRepository extends JpaRepository<ListingReport, Long> {
    boolean existsByListingIdAndReporterId(Long listingId, Long reporterId);
}
