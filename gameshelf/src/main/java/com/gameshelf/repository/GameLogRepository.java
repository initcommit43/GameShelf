package com.gameshelf.repository;

import com.gameshelf.model.GameLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GameLogRepository extends JpaRepository<GameLog, Long> {
    List<GameLog> findByUserId(Long userId);
    Optional<GameLog> findByUserIdAndGameId(Long userId, Long gameId);
    boolean existsByUserIdAndGameId(Long userId, Long gameId);
}