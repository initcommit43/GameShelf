package com.gameshelf.repository;

import com.gameshelf.model.BlockedToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface BlockedTokenRepository extends JpaRepository<BlockedToken, Long> {

    boolean existsByToken(String token);

    void deleteByExpiresAtBefore(Instant threshold);
}
