package com.padosi.repository;

import com.padosi.entity.MarketplaceListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarketplaceListingRepository extends JpaRepository<MarketplaceListing, Long> {

    /** Fetch available listings within :radiusMeters of the given point, newest first. */
    @Query(value = """
            SELECT m.* FROM marketplace_listings m
            WHERE m.status = 'AVAILABLE'
              AND ST_DWithin(m.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
            ORDER BY m.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<MarketplaceListing> findNearbyAvailable(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit
    );
}
