package com.gameshelf.service;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GameResponse;
import com.gameshelf.dto.IgdbEnrichment;
import com.gameshelf.model.Game;
import com.gameshelf.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameService {

    private final GameRepository gameRepository;
    private final IgdbTokenService igdbTokenService;

    @Value("${igdb.client-id}")
    private String clientId;

    private static final Set<Integer> MOBILE_PLATFORM_IDS  = Set.of(34, 39);
    private static final Set<Integer> MAJOR_CONSOLE_IDS = Set.of(
            48,  // PlayStation 4
            167, // PlayStation 5
            49,  // Xbox One
            169, // Xbox Series X|S
            130, // Nintendo Switch
            8,   // PlayStation 3
            9    // Xbox 360
    );

    private RestClient igdbClient;

    @jakarta.annotation.PostConstruct
    public void init() {
        igdbClient = RestClient.builder()
                .baseUrl("https://api.igdb.com/v4")
                .defaultHeader("Client-ID", clientId)
                .defaultHeader("Content-Type", "text/plain")
                .requestInterceptor((req, body, exec) -> {
                    req.getHeaders().setBearerAuth(igdbTokenService.getAccessToken());
                    return exec.execute(req, body);
                })
                .build();
    }

    public List<GameResponse> searchGames(String query) {
        String sanitized = query.replace("\"", "").trim();
        if (sanitized.isEmpty()) return List.of();
        if (sanitized.length() > 100) sanitized = sanitized.substring(0, 100);

        String body = "search \"" + sanitized + "\"; fields id,name,cover.url; limit 10;";
        log.info("[igdb] search query: {}", sanitized);

        try {
            IgdbGame[] results = igdbClient
                    .post()
                    .uri("/games")
                    .body(body)
                    .retrieve()
                    .body(IgdbGame[].class);

            log.info("[igdb] search returned {} results", results == null ? 0 : results.length);
            if (results == null) return List.of();
            return Arrays.stream(results).map(this::toGameResponse).toList();
        } catch (Exception e) {
            log.error("[igdb] search failed: {}", e.getMessage());
            throw e;
        }
    }

    public List<GameResponse> getTrendingGames() {
        // Fetch 80 candidates — after rating_count and mobile filters we still need 12.
        String popularityBody = "fields game_id; sort value desc; where popularity_type = 1; limit 80;";

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

        String gamesBody = "fields id,name,cover.url,platforms.id; where id = (" + ids + ") & cover != null & rating_count > 50; limit 80;";

        IgdbGame[] games = igdbClient
                .post()
                .uri("/games")
                .body(gamesBody)
                .retrieve()
                .body(IgdbGame[].class);

        if (games == null) return List.of();

        return Arrays.stream(games)
                .sorted(Comparator.comparingInt(g -> rankMap.getOrDefault(g.id, Integer.MAX_VALUE)))
                .filter(g -> !isMobileFirst(g))
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

    // Recommendation support

    public List<IgdbEnrichment> enrichGames(List<Integer> igdbIds) {
        if (igdbIds.isEmpty()) return List.of();
        String ids = igdbIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        String body = "fields id,name,cover.url,summary,rating,genres.id,genres.name,themes.id,themes.name,keywords.id,keywords.name,similar_games;"
                + " where id = (" + ids + "); limit " + Math.min(igdbIds.size(), 500) + ";";

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return List.of();
        return Arrays.stream(results).map(this::toEnrichment).toList();
    }

    public List<IgdbEnrichment> fetchCandidatesByGenre(int genreId) {
        String body = "fields id,name,cover.url,summary,rating,genres.id,genres.name,themes.id,themes.name,keywords.id,keywords.name;"
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
                .igdbRating(g.rating)
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

        return new GameResponse(game.getId(), game.getIgdbId(), game.getTitle(), game.getCoverUrl(), game.getIgdbRating());
    }

    private GameResponse toGameResponse(IgdbGame igdbGame) {
        String coverUrl = igdbGame.cover != null
                ? "https:" + igdbGame.cover.url.replace("t_thumb", "t_cover_big")
                : null;
        return new GameResponse(null, igdbGame.id, igdbGame.name, coverUrl, igdbGame.rating);
    }

    private static final Pattern STEAM_APP_ID_PATTERN =
            Pattern.compile("store\\.steampowered\\.com/app/(\\d+)");

    // Tries /external_games first (category 1 = Steam), then scans /websites for a Steam URL.
    // The website category field is often null in IGDB so we can't filter by it there.
    public Integer getSteamAppId(Integer igdbId) {
        String extBody = "fields uid; where game = " + igdbId + " & category = 1; limit 1;";
        IgdbExternalGame[] extResults = igdbClient
                .post().uri("/external_games").body(extBody).retrieve()
                .body(IgdbExternalGame[].class);
        if (extResults != null && extResults.length > 0) {
            try {
                Integer appId = Integer.parseInt(extResults[0].uid);
                log.info("[igdb] found Steam appId={} via external_games for igdbId={}", appId, igdbId);
                return appId;
            } catch (NumberFormatException ignored) {}
        }

        String webBody = "fields url; where game = " + igdbId + "; limit 20;";
        IgdbWebsite[] webResults = igdbClient
                .post().uri("/websites").body(webBody).retrieve()
                .body(IgdbWebsite[].class);
        if (webResults != null) {
            for (IgdbWebsite site : webResults) {
                if (site.url == null) continue;
                Matcher m = STEAM_APP_ID_PATTERN.matcher(site.url);
                if (m.find()) {
                    Integer appId = Integer.parseInt(m.group(1));
                    log.info("[igdb] found Steam appId={} via websites for igdbId={}", appId, igdbId);
                    return appId;
                }
            }
        }

        log.info("[igdb] no Steam record found for igdbId={}", igdbId);
        return null;
    }

    // True if the game is on Android/iOS but has no major console release.
    // Keeps cross-platform titles like Minecraft; excludes Subway Surfers etc.
    private boolean isMobileFirst(IgdbGame game) {
        if (game.platforms == null || game.platforms.length == 0) return false;
        List<Integer> knownIds = Arrays.stream(game.platforms)
                .map(p -> p.id)
                .filter(id -> id != null)
                .toList();
        if (knownIds.isEmpty()) return false;
        boolean hasMobile = knownIds.stream().anyMatch(MOBILE_PLATFORM_IDS::contains);
        if (!hasMobile) return false;
        return knownIds.stream().noneMatch(MAJOR_CONSOLE_IDS::contains);
    }

    private static class IgdbExternalGame {
        public String uid;
    }

    private static class IgdbWebsite {
        public String url;
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

    // Used for genres, themes, and keywords — same shape in IGDB
    private static class IgdbGenre {
        public Integer id;
        public String name;
    }

    private static class IgdbPlatform {
        public Integer id;
        public String name;
    }

    private static class IgdbPopularity {
        public Integer game_id;
    }
}