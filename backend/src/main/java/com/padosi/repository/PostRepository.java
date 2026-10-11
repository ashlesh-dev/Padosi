package com.padosi.repository;

import com.padosi.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    List<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    /** Total posts created by a user — used for the public profile stat. */
    long countByAuthorId(Long authorId);

    /**
     * Fetch all posts whose location is within :radiusMeters of the given point.
     * Results are newest first. Uses PostGIS ST_DWithin on the geography column.
     *
     * NOTE: We use a native query because JPQL does not support PostGIS functions.
     * Also computes the approximate distance in km (rounded to 1 decimal) without
     * exposing exact coordinates.
     */
    @Query(value = """
            SELECT p.* FROM posts p
            WHERE ST_DWithin(
                p.location,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radiusMeters
            )
            ORDER BY p.created_at DESC
            LIMIT :limit OFFSET :offsetVal
            """, nativeQuery = true)
    List<Post> findNearby(
            @Param("lat") double lat,
            @Param("lon") double lon,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit,
            @Param("offsetVal") int offsetVal
    );

    /**
     * Calculate the approximate distance in metres between a post and a point.
     * Used to compute distanceKm per post without exposing exact coordinates.
     */
    @Query(value = """
            SELECT ST_Distance(
                p.location,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
            ) FROM posts p WHERE p.id = :postId
            """, nativeQuery = true)
    Double getDistanceMetres(
            @Param("postId") Long postId,
            @Param("lat") double lat,
            @Param("lon") double lon
    );
}
