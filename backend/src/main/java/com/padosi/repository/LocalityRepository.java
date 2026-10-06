package com.padosi.repository;

import com.padosi.entity.Locality;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocalityRepository extends JpaRepository<Locality, Long> {

    /** Used by the register page's manual-locality dropdown. */
    List<Locality> findAllByOrderByNameAsc();

    /**
     * Nearest locality to a GPS point, but only if it is within maxMetres.
     * ST_DWithin / ST_Distance on geography work in METRES. ST_MakePoint takes (longitude, latitude).
     */
    @Query(value = """
            SELECT * FROM localities
            WHERE ST_DWithin(center, CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography), :maxMetres)
            ORDER BY ST_Distance(center, CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography))
            LIMIT 1
            """, nativeQuery = true)
    Optional<Locality> findNearestWithin(@Param("lat") double lat,
                                         @Param("lng") double lng,
                                         @Param("maxMetres") double maxMetres);
}
