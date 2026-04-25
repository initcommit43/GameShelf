package com.gameshelf.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;

@Service
@Slf4j
public class IgdbTokenService {

    @Value("${igdb.client-id}")
    private String clientId;

    @Value("${igdb.client-secret}")
    private String clientSecret;

    private final RestClient authClient = RestClient.builder()
            .baseUrl("https://id.twitch.tv")
            .build();

    private volatile String cachedToken;
    private volatile Instant tokenExpiry = Instant.EPOCH;

    private static final Duration REFRESH_BUFFER = Duration.ofHours(24);

    public String getAccessToken() {
        if (Instant.now().isAfter(tokenExpiry.minus(REFRESH_BUFFER))) {
            refresh();
        }
        return cachedToken;
    }

    private synchronized void refresh() {
        // Double-checked locking: another thread may have refreshed while we waited for the lock.
        if (Instant.now().isBefore(tokenExpiry.minus(REFRESH_BUFFER))) {
            return;
        }
        log.info("[igdb] refreshing OAuth token");
        TwitchTokenResponse res = authClient.post()
                .uri("/oauth2/token?client_id={id}&client_secret={secret}&grant_type=client_credentials",
                        clientId, clientSecret)
                .retrieve()
                .body(TwitchTokenResponse.class);

        if (res == null || res.access_token == null) {
            throw new IllegalStateException("IGDB token refresh failed — check IGDB_CLIENT_ID and IGDB_CLIENT_SECRET");
        }
        cachedToken = res.access_token;
        tokenExpiry = Instant.now().plusSeconds(res.expires_in);
        log.info("[igdb] token refreshed, expires {}", tokenExpiry);
    }

    private static class TwitchTokenResponse {
        public String access_token;
        public long expires_in;
    }
}
