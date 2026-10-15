package com.padosi.repository;

import com.padosi.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("select u from User u where u.active = true and " +
            "(lower(u.fullName) like lower(concat('%', :query, '%')) or " +
            "lower(u.handle) like lower(concat('%', :handleQuery, '%'))) " +
            "order by u.fullName")
    List<User> searchActiveUsers(@Param("query") String query,
                                 @Param("handleQuery") String handleQuery,
                                 Pageable pageable);
}

