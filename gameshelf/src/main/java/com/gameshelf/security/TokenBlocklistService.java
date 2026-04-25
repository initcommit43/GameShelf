package com.gameshelf.security;

import com.gameshelf.model.BlockedToken;
import com.gameshelf.repository.BlockedTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class TokenBlocklistService {

    private final BlockedTokenRepository blockedTokenRepository;

    @Transactional
    public void block(String token, Instant expiry) {
        blockedTokenRepository.save(BlockedToken.builder()
                .token(token)
                .expiresAt(expiry)
                .build());
    }

    public boolean isBlocked(String token) {
        return blockedTokenRepository.existsByToken(token);
    }

    @Transactional
    @Scheduled(fixedRate = 3_600_000)
    public void purgeExpired() {
        blockedTokenRepository.deleteByExpiresAtBefore(Instant.now());
    }
}
