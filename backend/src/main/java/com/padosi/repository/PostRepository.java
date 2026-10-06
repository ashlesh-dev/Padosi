package com.padosi.repository;

import com.padosi.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    /**
     * Fetch all posts whose location is within :radiusMeters of the given point.
     * Results are newest first. Images are loaded separately to avoid cartesian joins.
     */
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
            ORDER BY p.created_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Post> findNearby(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit
    );
}
