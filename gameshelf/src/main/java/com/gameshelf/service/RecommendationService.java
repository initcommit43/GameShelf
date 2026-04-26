package com.gameshelf.service;

import com.gameshelf.dto.GameResponse;
import com.gameshelf.dto.IgdbEnrichment;
import com.gameshelf.dto.RecommendationResponse;
import com.gameshelf.model.GameLog;
import com.gameshelf.model.GameStatus;
import com.gameshelf.model.User;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.UserRepository;
import com.gameshelf.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int    CACHE_TTL_HOURS = 6;
    private static final int    TOP_N_GENRES    = 3;
    private static final int    MIN_SHELF       = 5;
    private static final int    MAX_RESULTS     = 40;
    private static final int    MAX_PER_GENRE   = 3;
    private static final long   RECENCY_DAYS    = 30;
    private static final double PTS_GENRE       = 3.0;
    private static final double PTS_THEME       = 2.0;
    private static final double PTS_KEYWORD     = 1.0;

    private final GameLogRepository gameLogRepository;
    private final UserRepository    userRepository;
    private final GameService       gameService;

    private final ConcurrentHashMap<String, CachedRecs> cache = new ConcurrentHashMap<>();

    public void invalidateCache(String username) {
        cache.remove(username);
    }

    @Transactional(readOnly = true)
    public List<RecommendationResponse> getRecommendations(String username) {
        CachedRecs hit = cache.get(username);
        if (hit != null && Instant.now().isBefore(hit.expiresAt())) return hit.recs();

        List<RecommendationResponse> recs = compute(username);
        cache.put(username, new CachedRecs(recs, Instant.now().plusSeconds(CACHE_TTL_HOURS * 3600L)));
        return recs;
    }

    private List<RecommendationResponse> compute(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        List<GameLog> logs = gameLogRepository.findByUserIdWithGame(user.getId());

        if (logs.size() < MIN_SHELF) {
            return fallbackTopRated();
        }

        // 1. Influence per shelf game
        LocalDateTime thirtyDaysAgo = LocalDateTime.now(ZoneOffset.UTC).minusDays(RECENCY_DAYS);
        Map<Integer, Double> influenceByIgdbId = new LinkedHashMap<>();
        Map<Integer, String> titleByIgdbId     = new LinkedHashMap<>();

        for (GameLog log : logs) {
            if (log.getGame().getIgdbId() == null) continue;
            int igdbId = log.getGame().getIgdbId();
            titleByIgdbId.put(igdbId, log.getGame().getTitle());

            int base = 0;
            if (log.getStatus() == GameStatus.COMPLETED)    base += 5;
            else if (log.getStatus() == GameStatus.DROPPED) base -= 5;

            if (log.getRating() != null) {
                if (log.getRating() >= 8)      base += 4;
                else if (log.getRating() >= 5) base += 1;
            }

            double recency = (log.getCreatedAt() != null && log.getCreatedAt().isAfter(thirtyDaysAgo))
                    ? 1.0 : 0.4;
            influenceByIgdbId.merge(igdbId, base * recency, Double::sum);
        }

        List<Integer> shelfIgdbIds = new ArrayList<>(influenceByIgdbId.keySet());
        if (shelfIgdbIds.isEmpty()) return List.of();

        // 2. Enrich shelf games and build weighted preference profile
        List<IgdbEnrichment> shelfGames = gameService.enrichGames(shelfIgdbIds);
        if (shelfGames.isEmpty()) return List.of();

        WeightedProfile profile = buildWeightedProfile(shelfGames, influenceByIgdbId);
        if (profile.topGenreIds().isEmpty()) return List.of();

        Set<Integer> shelfSet = new HashSet<>(shelfIgdbIds);

        // 3. Candidate pool: top genres + similar games
        Map<Integer, IgdbEnrichment> pool = new LinkedHashMap<>();
        for (int genreId : profile.topGenreIds()) {
            for (IgdbEnrichment g : gameService.fetchCandidatesByGenre(genreId)) {
                pool.putIfAbsent(g.getIgdbId(), g);
            }
        }
        List<Integer> similarToFetch = profile.allSimilarIds().stream()
                .filter(id -> !shelfSet.contains(id))
                .limit(50)
                .toList();
        for (IgdbEnrichment g : gameService.enrichGames(similarToFetch)) {
            pool.putIfAbsent(g.getIgdbId(), g);
        }
        pool.keySet().removeAll(shelfSet);

        // 4. Score → sort → diversity filter
        List<ScoredGame> sorted = pool.values().stream()
                .map(g -> score(g, profile))
                .filter(sg -> sg.score() > 0)
                .sorted(Comparator.comparingDouble(ScoredGame::score).reversed())
                .toList();

        List<ScoredGame> diverse = diversityFilter(sorted);
        if (diverse.isEmpty()) return List.of();

        double maxScore = diverse.get(0).score();

        return diverse.stream()
                .limit(MAX_RESULTS)
                .map(sg -> toResponse(sg, maxScore, shelfGames, influenceByIgdbId, titleByIgdbId, profile))
                .toList();
    }

    // Fallback when shelf has fewer than MIN_SHELF games

    private List<RecommendationResponse> fallbackTopRated() {
        List<GameResponse> topGames = gameService.browseGames("rating", 0, null, null, null, null, null);
        String reason = "Add more games to personalize your recommendations";
        return topGames.stream()
                .map(g -> RecommendationResponse.builder()
                        .igdbId(g.getIgdbId())
                        .title(g.getTitle())
                        .coverUrl(g.getCoverUrl())
                        .igdbRating(g.getIgdbRating())
                        .score(0)
                        .confidencePct(0)
                        .reasons(List.of(reason))
                        .build())
                .toList();
    }

    // Profile building

    private WeightedProfile buildWeightedProfile(List<IgdbEnrichment> shelfGames,
                                                  Map<Integer, Double> influenceByIgdbId) {
        Map<Integer, Double> genreWeights   = new HashMap<>();
        Map<Integer, String> genreNames     = new HashMap<>();
        Map<Integer, Double> themeWeights   = new HashMap<>();
        Map<Integer, String> themeNames     = new HashMap<>();
        Map<Integer, Double> keywordWeights = new HashMap<>();
        Set<Integer>         similarIds     = new LinkedHashSet<>();

        for (IgdbEnrichment g : shelfGames) {
            double influence = influenceByIgdbId.getOrDefault(g.getIgdbId(), 0.0);
            for (IgdbEnrichment.Tag t : g.getGenres()) {
                genreWeights.merge(t.getId(), influence, Double::sum);
                genreNames.put(t.getId(), t.getName());
            }
            for (IgdbEnrichment.Tag t : g.getThemes()) {
                themeWeights.merge(t.getId(), influence, Double::sum);
                themeNames.put(t.getId(), t.getName());
            }
            for (IgdbEnrichment.Tag t : g.getKeywords()) {
                keywordWeights.merge(t.getId(), influence, Double::sum);
            }
            if (influence > 0) similarIds.addAll(g.getSimilarGames());
        }

        List<Integer> topGenres = topNByWeight(genreWeights, TOP_N_GENRES);
        String topGenreName = topGenres.isEmpty() ? null : genreNames.get(topGenres.get(0));

        return new WeightedProfile(topGenres, genreWeights, themeWeights, keywordWeights,
                genreNames, themeNames, topGenreName, new ArrayList<>(similarIds));
    }

    // Scoring

    private ScoredGame score(IgdbEnrichment game, WeightedProfile profile) {
        double score = 0;
        List<String> matchedGenres = new ArrayList<>();
        List<String> matchedThemes = new ArrayList<>();

        for (IgdbEnrichment.Tag t : game.getGenres()) {
            double w = profile.genreWeights().getOrDefault(t.getId(), 0.0);
            if (w > 0) { score += w * PTS_GENRE; matchedGenres.add(t.getName()); }
        }
        for (IgdbEnrichment.Tag t : game.getThemes()) {
            double w = profile.themeWeights().getOrDefault(t.getId(), 0.0);
            if (w > 0) { score += w * PTS_THEME; matchedThemes.add(t.getName()); }
        }
        for (IgdbEnrichment.Tag t : game.getKeywords()) {
            double w = profile.keywordWeights().getOrDefault(t.getId(), 0.0);
            if (w > 0) score += w * PTS_KEYWORD;
        }

        return new ScoredGame(game, score, matchedGenres, matchedThemes);
    }

    // Diversity filter — caps results at MAX_PER_GENRE per genre

    private List<ScoredGame> diversityFilter(List<ScoredGame> sorted) {
        Map<Integer, Integer> genreCount = new HashMap<>();
        List<ScoredGame> result = new ArrayList<>();

        for (ScoredGame sg : sorted) {
            List<IgdbEnrichment.Tag> genres = sg.game().getGenres();
            boolean allowed = genres.isEmpty()
                    || genres.stream().anyMatch(t -> genreCount.getOrDefault(t.getId(), 0) < MAX_PER_GENRE);
            if (!allowed) continue;
            result.add(sg);
            for (IgdbEnrichment.Tag t : genres) genreCount.merge(t.getId(), 1, Integer::sum);
        }
        return result;
    }

    // Response mapping

    private RecommendationResponse toResponse(ScoredGame sg, double maxScore,
                                               List<IgdbEnrichment> shelfGames,
                                               Map<Integer, Double> influenceByIgdbId,
                                               Map<Integer, String> titleByIgdbId,
                                               WeightedProfile profile) {
        int confidence = maxScore > 0 ? (int) Math.round(sg.score() * 100.0 / maxScore) : 0;

        Set<Integer> candidateGenreIds = sg.game().getGenres().stream()
                .map(IgdbEnrichment.Tag::getId)
                .collect(Collectors.toSet());

        // Pick the shelf game with the highest influence that shares a genre — drives the "Because you liked X" label.
        String reason = null;
        double bestInfluence = 0;
        for (IgdbEnrichment shelf : shelfGames) {
            double inf = influenceByIgdbId.getOrDefault(shelf.getIgdbId(), 0.0);
            if (inf <= bestInfluence) continue;
            boolean sharesGenre = shelf.getGenres().stream()
                    .anyMatch(t -> candidateGenreIds.contains(t.getId()));
            if (sharesGenre) {
                bestInfluence = inf;
                reason = "Because you liked " + titleByIgdbId.getOrDefault(shelf.getIgdbId(), shelf.getTitle());
            }
        }
        if (reason == null && profile.topGenreName() != null) {
            reason = "Matches your taste in " + profile.topGenreName();
        }

        return RecommendationResponse.builder()
                .igdbId(sg.game().getIgdbId())
                .title(sg.game().getTitle())
                .coverUrl(sg.game().getCoverUrl())
                .summary(sg.game().getSummary())
                .igdbRating(sg.game().getIgdbRating())
                .score((int) Math.round(sg.score()))
                .confidencePct(confidence)
                .reasons(reason != null ? List.of(reason) : List.of())
                .build();
    }

    // Helpers

    private List<Integer> topNByWeight(Map<Integer, Double> weights, int n) {
        return weights.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<Integer, Double>comparingByValue().reversed())
                .limit(n)
                .map(Map.Entry::getKey)
                .toList();
    }

    // Internal records

    private record WeightedProfile(
            List<Integer> topGenreIds,
            Map<Integer, Double> genreWeights,
            Map<Integer, Double> themeWeights,
            Map<Integer, Double> keywordWeights,
            Map<Integer, String> genreNames,
            Map<Integer, String> themeNames,
            String topGenreName,
            List<Integer> allSimilarIds) {}

    private record ScoredGame(
            IgdbEnrichment game,
            double score,
            List<String> matchedGenres,
            List<String> matchedThemes) {}

    private record CachedRecs(
            List<RecommendationResponse> recs,
            Instant expiresAt) {}
}
