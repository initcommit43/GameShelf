package com.gameshelf.repository;

import com.gameshelf.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByUserIdAndGameId(Long userId, Long gameId);

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.game.id = :gameId ORDER BY r.createdAt DESC")
    List<Review> findByGameIdNewest(@Param("gameId") Long gameId);

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.game.id = :gameId ORDER BY r.rating DESC, r.createdAt DESC")
    List<Review> findByGameIdHighestRated(@Param("gameId") Long gameId);

    @Query("SELECT r FROM Review r JOIN FETCH r.user WHERE r.game.id = :gameId ORDER BY r.rating ASC, r.createdAt DESC")
    List<Review> findByGameIdLowestRated(@Param("gameId") Long gameId);

    @Query("SELECT r FROM Review r JOIN FETCH r.user JOIN FETCH r.game WHERE r.user.id = :userId ORDER BY r.createdAt DESC")
    List<Review> findByUserIdWithGame(@Param("userId") Long userId);
}
