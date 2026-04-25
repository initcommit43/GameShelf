package com.gameshelf.repository;

import com.gameshelf.model.GameLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface GameLogRepository extends JpaRepository<GameLog, Long> {
    List<GameLog> findByUserId(Long userId);
    Optional<GameLog> findByUserIdAndGameId(Long userId, Long gameId);
    boolean existsByUserIdAndGameId(Long userId, Long gameId);

    @Query("SELECT l FROM GameLog l JOIN FETCH l.game WHERE l.user.id = :userId")
    List<GameLog> findByUserIdWithGame(@Param("userId") Long userId);

    @Query("SELECT l FROM GameLog l WHERE l.user.id = :userId AND l.game.igdbId = :igdbId")
    Optional<GameLog> findByUserIdAndIgdbId(@Param("userId") Long userId, @Param("igdbId") Integer igdbId);
}