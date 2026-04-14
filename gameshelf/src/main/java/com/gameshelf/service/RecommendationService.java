package com.gameshelf.service;

import com.gameshelf.dto.IgdbEnrichment;
import com.gameshelf.dto.RecommendationResponse;
import com.gameshelf.model.User;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.UserRepository;
import com.gameshelf.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final int CACHE_TTL_HOURS  = 6;
    private static final int TOP_N_GENRES     = 3;
    private static final int TOP_N_THEMES     = 3;
    private static final int TOP_N_KEYWORDS   = 5;
    private static final int MIN_KEYWORD_FREQ = 2;
    private static final int MAX_RESULTS      = 40;

    // Points awarded per matching attribute
    private static final int PTS_GENRE   = 3;
    private static final int PTS_THEME   = 2;
    private static final int PTS_KEYWORD = 1;
    private static final int PTS_SIMILAR = 4;

    private final GameLogRepository gameLogRepository;
    private final UserRepository    userRepository;
    private final GameService       gameService;

    private final ConcurrentHashMap<String, CachedRecs> cache = new ConcurrentHashMap<>();

    // Called by GameLogController after a game is added so recommendations refresh
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

    // ── Core algorithm ──────────────────────────────────────────────────────────

    private List<RecommendationResponse> compute(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // 1. Collect IGDB IDs from the user's shelf
        List<Integer> shelfIgdbIds = gameLogRepository.findByUserIdWithGame(user.getId()).stream()
                .map(log -> log.getGame().getIgdbId())
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (shelfIgdbIds.isEmpty()) return List.of();

        // 2. Enrich shelf games: fetch genres, themes, keywords, similar_games
        List<IgdbEnrichment> shelfGames = gameService.enrichGames(shelfIgdbIds);
        if (shelfGames.isEmpty()) return List.of();

        // 3. Build preference profile from shelf
        UserProfile profile = buildProfile(shelfGames);
        if (profile.topGenreIds().isEmpty()) return List.of();

        Set<Integer> shelfSet = new HashSet<>(shelfIgdbIds);

        // 4. Fetch candidates from two sources in parallel (logical, not thread-based)
        //    a) Top-genre candidates — high-rated games in the user's primary genre
        List<IgdbEnrichment> genreCandidates =
                gameService.fetchCandidatesByGenre(profile.topGenreIds().get(0));

        //    b) Similar-game candidates — direct IGDB "similar_games" references
        List<Integer> similarToFetch = profile.allSimilarIds().stream()
                .filter(id -> !shelfSet.contains(id))
                .limit(50)
                .toList();
        List<IgdbEnrichment> similarCandidates = gameService.enrichGames(similarToFetch);

        // 5. Merge, deduplicate, exclude shelf games
        Map<Integer, IgdbEnrichment> pool = new LinkedHashMap<>();
        for (IgdbEnrichment g : genreCandidates)  pool.put(g.getIgdbId(), g);
        for (IgdbEnrichment g : similarCandidates) pool.putIfAbsent(g.getIgdbId(), g);
        pool.keySet().removeAll(shelfSet);

        // 6. Score every candidate
        List<ScoredGame> scored = pool.values().stream()
                .map(g -> score(g, profile))
                .filter(sg -> sg.score() > 0)
                .sorted(Comparator.comparingInt(ScoredGame::score).reversed())
                .limit(MAX_RESULTS)
                .toList();

        if (scored.isEmpty()) return List.of();

        int maxScore = scored.get(0).score();

        return scored.stream()
                .map(sg -> toResponse(sg, maxScore))
                .toList();
    }

    // ── Profile building ─────────────────────────────────────────────────────────

    private UserProfile buildProfile(List<IgdbEnrichment> shelfGames) {
        Map<Integer, Integer> genreFreq   = new HashMap<>();
        Map<Integer, String>  genreNames  = new HashMap<>();
        Map<Integer, Integer> themeFreq   = new HashMap<>();
        Map<Integer, String>  themeNames  = new HashMap<>();
        Map<Integer, Integer> keywordFreq = new HashMap<>();
        Set<Integer>          similarIds  = new LinkedHashSet<>();

        for (IgdbEnrichment g : shelfGames) {
            for (IgdbEnrichment.Tag t : g.getGenres()) {
                genreFreq.merge(t.getId(), 1, Integer::sum);
                genreNames.put(t.getId(), t.getName());
            }
            for (IgdbEnrichment.Tag t : g.getThemes()) {
                themeFreq.merge(t.getId(), 1, Integer::sum);
                themeNames.put(t.getId(), t.getName());
            }
            for (IgdbEnrichment.Tag t : g.getKeywords()) {
                keywordFreq.merge(t.getId(), 1, Integer::sum);
            }
            similarIds.addAll(g.getSimilarGames());
        }

        List<Integer> topGenres = topN(genreFreq, TOP_N_GENRES);
        List<Integer> topThemes = topN(themeFreq, TOP_N_THEMES);
        List<Integer> topKeywords = keywordFreq.entrySet().stream()
                .filter(e -> e.getValue() >= MIN_KEYWORD_FREQ)
                .sorted(Map.Entry.<Integer, Integer>comparingByValue().reversed())
                .limit(TOP_N_KEYWORDS)
                .map(Map.Entry::getKey)
                .toList();

        return new UserProfile(topGenres, topThemes, topKeywords,
                genreNames, themeNames, new ArrayList<>(similarIds));
    }

    // ── Scoring ──────────────────────────────────────────────────────────────────

    private ScoredGame score(IgdbEnrichment game, UserProfile profile) {
        int score = 0;
        List<String> matchedGenres = new ArrayList<>();
        List<String> matchedThemes = new ArrayList<>();
        boolean isSimilar = profile.allSimilarIds().contains(game.getIgdbId());

        for (IgdbEnrichment.Tag t : game.getGenres()) {
            if (profile.topGenreIds().contains(t.getId())) {
                score += PTS_GENRE;
                matchedGenres.add(t.getName());
            }
        }
        for (IgdbEnrichment.Tag t : game.getThemes()) {
            if (profile.topThemeIds().contains(t.getId())) {
                score += PTS_THEME;
                matchedThemes.add(t.getName());
            }
        }
        for (IgdbEnrichment.Tag t : game.getKeywords()) {
            if (profile.topKeywordIds().contains(t.getId())) {
                score += PTS_KEYWORD;
            }
        }
        if (isSimilar) score += PTS_SIMILAR;

        return new ScoredGame(game, score, matchedGenres, matchedThemes, isSimilar);
    }

    // ── Response mapping ─────────────────────────────────────────────────────────

    private RecommendationResponse toResponse(ScoredGame sg, int maxScore) {
        int confidence = maxScore > 0 ? (int) Math.round(sg.score() * 100.0 / maxScore) : 0;
        return RecommendationResponse.builder()
                .igdbId(sg.game().getIgdbId())
                .title(sg.game().getTitle())
                .coverUrl(sg.game().getCoverUrl())
                .summary(sg.game().getSummary())
                .score(sg.score())
                .confidencePct(confidence)
                .reasons(buildReasons(sg))
                .build();
    }

    private List<String> buildReasons(ScoredGame sg) {
        List<String> reasons = new ArrayList<>();
        if (!sg.matchedGenres().isEmpty())
            reasons.add("Because you enjoy " + joinNames(sg.matchedGenres()) + " games");
        if (!sg.matchedThemes().isEmpty())
            reasons.add("Matches your taste for " + joinNames(sg.matchedThemes()));
        if (sg.isSimilar())
            reasons.add("Similar to games on your shelf");
        return reasons;
    }

    private String joinNames(List<String> names) {
        if (names.size() == 1) return names.get(0);
        if (names.size() == 2) return names.get(0) + " & " + names.get(1);
        return names.get(0) + ", " + names.get(1) + " & more";
    }

    private List<Integer> topN(Map<Integer, Integer> freq, int n) {
        return freq.entrySet().stream()
                .sorted(Map.Entry.<Integer, Integer>comparingByValue().reversed())
                .limit(n)
                .map(Map.Entry::getKey)
                .toList();
    }

    // ── Internal records ─────────────────────────────────────────────────────────

    private record UserProfile(
            List<Integer> topGenreIds,
            List<Integer> topThemeIds,
            List<Integer> topKeywordIds,
            Map<Integer, String> genreNames,
            Map<Integer, String> themeNames,
            List<Integer> allSimilarIds) {}

    private record ScoredGame(
            IgdbEnrichment game,
            int score,
            List<String> matchedGenres,
            List<String> matchedThemes,
            boolean isSimilar) {}

    private record CachedRecs(
            List<RecommendationResponse> recs,
            Instant expiresAt) {}
}
