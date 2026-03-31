package com.gameshelf.repository;

import com.gameshelf.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long>{
    Optional<Game> findByIgdbId(Integer igdbId);
    boolean existsByIgdbId(Integer igdbId);
}
