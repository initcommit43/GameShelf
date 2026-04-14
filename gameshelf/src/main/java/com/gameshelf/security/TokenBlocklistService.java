package com.gameshelf.security;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory blocklist for invalidated JWT tokens.
 * Tokens are stored until their natural expiry, after which they are invalid
 * regardless — a scheduled task purges them hourly to keep the map bounded.
 */
@Service
public class TokenBlocklistService {

    private final ConcurrentHashMap<String, Instant> blocklist = new ConcurrentHashMap<>();

    public void block(String token, Instant expiry) {
        blocklist.put(token, expiry);
    }

    public boolean isBlocked(String token) {
        return blocklist.containsKey(token);
    }

    // Remove entries that have already passed their expiry — they're invalid by
    // the JWT spec anyway, so there's no need to keep them in the blocklist.
    @Scheduled(fixedRate = 3_600_000)
    public void purgeExpired() {
        Instant now = Instant.now();
        blocklist.entrySet().removeIf(e -> now.isAfter(e.getValue()));
    }
}
