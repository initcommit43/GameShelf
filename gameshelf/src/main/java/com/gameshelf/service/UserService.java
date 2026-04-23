package com.gameshelf.service;

import com.gameshelf.dto.GameLogSummary;
import com.gameshelf.dto.IgdbEnrichment;
import com.gameshelf.dto.UserProfileResponse;
import com.gameshelf.exception.NotFoundException;
import com.gameshelf.model.GameLog;
import com.gameshelf.model.GameStatus;
import com.gameshelf.model.User;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final GameLogRepository gameLogRepository;
    private final GameService gameService;

    private static final DateTimeFormatter JOINED_FMT =
            DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    public UserProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        List<GameLog> logs = gameLogRepository.findByUserIdWithGame(user.getId());

        int total = logs.size();
        int completed = (int) logs.stream().filter(l -> l.getStatus() == GameStatus.COMPLETED).count();
        int playing = (int) logs.stream().filter(l -> l.getStatus() == GameStatus.PLAYING).count();

        List<GameLog> rated = logs.stream().filter(l -> l.getRating() != null).toList();
        String avgRating = rated.isEmpty() ? "—"
                : String.format("%.1f", rated.stream().mapToInt(GameLog::getRating).average().orElse(0));

        String mostPlayedGenre = computeMostPlayedGenre(logs);

        List<GameLogSummary> recentlyPlayed = logs.stream()
                .filter(l -> l.getCreatedAt() != null)
                .sorted(Comparator.comparing(GameLog::getCreatedAt).reversed())
                .limit(8)
                .map(this::toSummary)
                .toList();

        List<GameLogSummary> topRated = logs.stream()
                .filter(l -> l.getRating() != null)
                .sorted(Comparator.comparingInt(GameLog::getRating).reversed())
                .limit(8)
                .map(this::toSummary)
                .toList();

        List<GameLogSummary> currentlyPlaying = logs.stream()
                .filter(l -> l.getStatus() == GameStatus.PLAYING)
                .sorted(Comparator.comparing(GameLog::getCreatedAt).reversed())
                .map(this::toSummary)
                .toList();

        String joinedAt = user.getCreatedAt() != null
                ? user.getCreatedAt().format(JOINED_FMT) : "";

        return new UserProfileResponse(
                user.getUsername(),
                user.getProfilePictureUrl() != null ? user.getProfilePictureUrl() : "",
                joinedAt,
                total, completed, playing,
                avgRating,
                mostPlayedGenre,
                recentlyPlayed,
                topRated,
                currentlyPlaying
        );
    }

    private String computeMostPlayedGenre(List<GameLog> logs) {
        if (logs.isEmpty()) return null;
        try {
            List<Integer> igdbIds = logs.stream()
                    .map(l -> l.getGame().getIgdbId())
                    .filter(id -> id != null)
                    .distinct()
                    .toList();
            List<IgdbEnrichment> enriched = gameService.enrichGames(igdbIds);
            Map<String, Long> genreCounts = enriched.stream()
                    .filter(e -> e.getGenres() != null)
                    .flatMap(e -> e.getGenres().stream())
                    .collect(Collectors.groupingBy(IgdbEnrichment.Tag::getName, Collectors.counting()));
            return genreCounts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
        } catch (Exception e) {
            log.warn("[UserService] genre enrichment failed: {}", e.getMessage());
            return null;
        }
    }

    private GameLogSummary toSummary(GameLog log) {
        return new GameLogSummary(
                log.getId(),
                log.getGame().getIgdbId(),
                log.getGame().getTitle(),
                log.getGame().getCoverUrl(),
                log.getStatus().name(),
                log.getRating()
        );
    }
}
