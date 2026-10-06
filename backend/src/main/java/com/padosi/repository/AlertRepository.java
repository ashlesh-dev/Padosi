package com.padosi.repository;

import com.padosi.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    /** Fetch active, non-expired alerts within :radiusMeters of the given point. */
    @Query(value = """
            SELECT a.* FROM alerts a
            WHERE a.is_active = true
              AND a.expires_at > NOW()
              AND a.alert_type NOT IN ('LOST', 'FOUND')
              AND ST_DWithin(a.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
            ORDER BY a.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Alert> findNearbyActive(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit
    );
}
