package com.padosi.repository;

import com.padosi.entity.LostFoundItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LostFoundItemRepository extends JpaRepository<LostFoundItem, Long> {

    /** Fetch open lost/found notices within :radiusMeters of the given point. */
    @Query(value = """
            SELECT lf.* FROM lost_found_items lf
            WHERE lf.status = 'OPEN'
              AND ST_DWithin(lf.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
            ORDER BY lf.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<LostFoundItem> findNearbyOpen(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit
    );
}
