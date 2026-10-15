package com.padosi.repository;

import com.padosi.entity.ServiceProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceProviderRepository extends JpaRepository<ServiceProvider, Long> {

    Optional<ServiceProvider> findByUserId(Long userId);

    /**
     * Fetch available service providers whose user's location is within :radiusMeters.
     * Distance is computed from the provider's user location.
     */
    @Query(value = """
            SELECT sp.* FROM service_providers sp
            JOIN users u ON u.id = sp.user_id
            WHERE sp.is_available = true
              AND (sp.expires_at IS NULL OR sp.expires_at > now())
              AND ST_DWithin(u.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
            ORDER BY ST_Distance(u.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<ServiceProvider> findNearbyAvailable(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit
    );
}
