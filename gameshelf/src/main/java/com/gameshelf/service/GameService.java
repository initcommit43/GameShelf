package com.gameshelf.service;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GameResponse;
import com.gameshelf.dto.IgdbEnrichment;
import com.gameshelf.model.Game;
import com.gameshelf.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;

    @Value("${igdb.client-id}")
    private String clientId;

    @Value("${igdb.access-token}")
    private String accessToken;

    private RestClient igdbClient;

    @jakarta.annotation.PostConstruct
    public void init() {
        igdbClient = RestClient.builder()
                .baseUrl("https://api.igdb.com/v4")
                .defaultHeader("Client-ID", clientId)
                .defaultHeader("Authorization", "Bearer " + accessToken)
                .defaultHeader("Content-Type", "text/plain")
                .build();
    }

    public List<GameResponse> searchGames(String query) {
        // Strip double-quotes to prevent breaking out of the IGDB search string,
        // then cap length so oversized input can't be used for abuse.
        String sanitized = query.replace("\"", "").trim();
        if (sanitized.isEmpty()) return List.of();
        if (sanitized.length() > 100) sanitized = sanitized.substring(0, 100);

        String body = "search \"" + sanitized + "\"; fields id,name,cover.url; limit 10;";

        IgdbGame[] results = igdbClient
                .post()
                .uri("/games")
                .body(body)
                .retrieve()
                .body(IgdbGame[].class);

        if (results == null) return List.of();

        return Arrays.stream(results)
                .map(this::toGameResponse)
                .toList();
    }

    public List<GameResponse> getTrendingGames() {
        // Fetch 40 candidates so the rating_count filter below has room to cut junk without
        // emptying the list — after filtering we take the top 12.
        String popularityBody = "fields game_id; sort value desc; where popularity_type = 1; limit 40;";

        IgdbPopularity[] popularityResults = igdbClient
                .post()
                .uri("/popularity_primitives")
                .body(popularityBody)
                .retrieve()
                .body(IgdbPopularity[].class);

        if (popularityResults == null || popularityResults.length == 0) return List.of();

        // Build an id → rank map so we can restore popularity order later
        Map<Integer, Integer> rankMap = new HashMap<>();
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < popularityResults.length; i++) {
            rankMap.put(popularityResults[i].game_id, i);
            if (i > 0) ids.append(",");
            ids.append(popularityResults[i].game_id);
        }

        // rating_count > 50 for trending — these are currently popular games, not all-time greats,
        // so the bar is intentionally lower. It still cuts one-off viral jokes with no real player base.
        // limit matches the fetch size (40) so IGDB doesn't cut results before our Java sort+trim.
        String gamesBody = "fields id,name,cover.url; where id = (" + ids + ") & cover != null & rating_count > 50; limit 40;";

        IgdbGame[] games = igdbClient
                .post()
                .uri("/games")
                .body(gamesBody)
                .retrieve()
                .body(IgdbGame[].class);

        if (games == null) return List.of();

        return Arrays.stream(games)
                .sorted(Comparator.comparingInt(g -> rankMap.getOrDefault(g.id, Integer.MAX_VALUE)))
                .limit(12)
                .map(this::toGameResponse)
                .toList();
    }

    public List<GameResponse> browseGames(String sort, int offset,
                                          Integer genreId, Integer platformId,
                                          Integer minRating, Integer yearFrom, Integer yearTo) {
        String validSort = List.of("rating", "hypes", "first_release_date").contains(sort) ? sort : "rating";

        boolean hasFilters = genreId != null || platformId != null
                || minRating != null || yearFrom != null || yearTo != null;

        // Tighter rating_count floor when no filters are active so the default grid
        // stays high-quality; relax it when the user drills down so results don't dry up.
        StringBuilder where = new StringBuilder("cover != null & rating != null");
        where.append(" & rating_count > ").append(hasFilters ? 100 : 500);

        if (minRating != null) {
            where.append(" & rating >= ").append(Math.max(0, Math.min(100, minRating)));
        } else if (!hasFilters) {
            where.append(" & rating > 75");
        }

        if (genreId != null)    where.append(" & genres = ").append(genreId);
        if (platformId != null) where.append(" & platforms = ").append(platformId);

        if (yearFrom != null) {
            long epoch = java.time.LocalDate.of(Math.max(1970, yearFrom), 1, 1)
                    .atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC);
            where.append(" & first_release_date >= ").append(epoch);
        }
        if (yearTo != null) {
            long epoch = java.time.LocalDate.of(Math.min(2030, yearTo), 12, 31)
                    .atStartOfDay().toEpochSecond(java.time.ZoneOffset.UTC);
            where.append(" & first_release_date <= ").append(epoch);
        }

        String body = String.format(
                "fields id,name,cover.url,rating; where %s; sort %s desc; limit 24; offset %d;",
                where, validSort, offset);

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return List.of();
        return Arrays.stream(results).map(this::toGameResponse).toList();
    }

    public GameDetailResponse getGameDetails(Integer igdbId) {
        String body = "fields id,name,cover.url,summary,rating,genres.name,first_release_date,platforms.name; where id = " + igdbId + ";";

        IgdbGame[] results = igdbClient
                .post()
                .uri("/games")
                .body(body)
                .retrieve()
                .body(IgdbGame[].class);

        if (results == null || results.length == 0) return null;

        IgdbGame game = results[0];
        String coverUrl = game.cover != null
                ? "https:" + game.cover.url.replace("t_thumb", "t_cover_big")
                : null;

        List<String> genres = game.genres != null
                ? Arrays.stream(game.genres).map(g -> g.name).toList()
                : List.of();

        List<String> platforms = game.platforms != null
                ? Arrays.stream(game.platforms).map(p -> p.name).toList()
                : List.of();

        String releaseYear = game.first_release_date != null
                ? String.valueOf(Instant.ofEpochSecond(game.first_release_date)
                    .atZone(ZoneOffset.UTC)
                    .getYear())
                : null;

        return new GameDetailResponse(igdbId, game.name, coverUrl, game.summary,
                game.rating, genres, releaseYear, platforms);
    }

    public Map<Integer, GameDetailResponse> getGameDetailsBatch(List<Integer> igdbIds) {
        if (igdbIds.isEmpty()) return Map.of();
        String ids = igdbIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        String body = "fields id,rating,first_release_date; where id = (" + ids + "); limit " + igdbIds.size() + ";";

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return Map.of();

        Map<Integer, GameDetailResponse> map = new HashMap<>();
        for (IgdbGame g : results) {
            String releaseYear = g.first_release_date != null
                    ? String.valueOf(Instant.ofEpochSecond(g.first_release_date).atZone(ZoneOffset.UTC).getYear())
                    : null;
            map.put(g.id, new GameDetailResponse(g.id, null, null, null, g.rating, List.of(), releaseYear, List.of()));
        }
        return map;
    }

    // ── Recommendation support ──────────────────────────────────────────────────

    /**
     * Fetches genres, themes, keywords, and similar_games for a list of IGDB IDs.
     * Used to enrich shelf games and to resolve similar-game candidates.
     */
    public List<IgdbEnrichment> enrichGames(List<Integer> igdbIds) {
        if (igdbIds.isEmpty()) return List.of();
        String ids = igdbIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        String body = "fields id,name,cover.url,summary,genres.id,genres.name,themes.id,themes.name,keywords.id,keywords.name,similar_games;"
                + " where id = (" + ids + "); limit " + Math.min(igdbIds.size(), 500) + ";";

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return List.of();
        return Arrays.stream(results).map(this::toEnrichment).toList();
    }

    /**
     * Fetches up to 50 high-rated games in a given genre with full genre/theme/keyword data.
     * Results are pre-sorted by rating descending.
     */
    public List<IgdbEnrichment> fetchCandidatesByGenre(int genreId) {
        String body = "fields id,name,cover.url,summary,genres.id,genres.name,themes.id,themes.name,keywords.id,keywords.name;"
                + " where genres = " + genreId + " & cover != null & rating > 70 & rating_count > 100;"
                + " sort rating desc; limit 50;";

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return List.of();
        return Arrays.stream(results).map(this::toEnrichment).toList();
    }

    private IgdbEnrichment toEnrichment(IgdbGame g) {
        String coverUrl = g.cover != null
                ? "https:" + g.cover.url.replace("t_thumb", "t_cover_big")
                : null;

        return IgdbEnrichment.builder()
                .igdbId(g.id != null ? g.id : 0)
                .title(g.name)
                .coverUrl(coverUrl)
                .summary(g.summary)
                .genres(toTags(g.genres))
                .themes(toTags(g.themes))
                .keywords(toTags(g.keywords))
                .similarGames(g.similar_games != null
                        ? Arrays.stream(g.similar_games).filter(java.util.Objects::nonNull).toList()
                        : List.of())
                .build();
    }

    private List<IgdbEnrichment.Tag> toTags(IgdbGenre[] arr) {
        if (arr == null) return List.of();
        return Arrays.stream(arr)
                .filter(t -> t.id != null)
                .map(t -> new IgdbEnrichment.Tag(t.id, t.name))
                .toList();
    }

    public GameResponse getOrSaveGame(Integer igdbId, String title, String coverUrl) {
        Game game = gameRepository.findByIgdbId(igdbId).orElseGet(() -> {
            Game newGame = Game.builder()
                    .igdbId(igdbId)
                    .title(title)
                    .coverUrl(coverUrl)
                    .build();
            return gameRepository.save(newGame);
        });

        return new GameResponse(game.getId(), game.getIgdbId(), game.getTitle(), game.getCoverUrl());
    }

    private GameResponse toGameResponse(IgdbGame igdbGame) {
        String coverUrl = igdbGame.cover != null
                ? "https:" + igdbGame.cover.url.replace("t_thumb", "t_cover_big")
                : null;
        return new GameResponse(null, igdbGame.id, igdbGame.name, coverUrl);
    }

    private static class IgdbGame {
        public Integer id;
        public String name;
        public IgdbCover cover;
        public String summary;
        public Double rating;
        public IgdbGenre[] genres;
        public IgdbGenre[] themes;
        public IgdbGenre[] keywords;
        public Integer[] similar_games;
        public Long first_release_date;
        public IgdbPlatform[] platforms;
    }

    private static class IgdbCover {
        public String url;
    }

    // Reused for genres, themes, and keywords — all have id + name in IGDB
    private static class IgdbGenre {
        public Integer id;
        public String name;
    }

    private static class IgdbPlatform {
        public String name;
    }

    private static class IgdbPopularity {
        public Integer game_id;
    }
}